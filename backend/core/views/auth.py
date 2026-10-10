"""Login, logout, profile (AUT-01, AUT-02, AUT-03)."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api import DomainError, SessionAuth
from core.models import User
from core.selectors import me_payload
from core.serializers import LoginIn, PasswordChangeIn
from core.services.users import check_password_strength

BAD_CREDENTIALS = DomainError(
    "INVALID_CREDENTIALS", "Username atau kata sandi salah. Periksa lalu coba lagi.", status=400
)


class CsrfView(APIView):
    """Sets the CSRF cookie so the SPA can send it back on unsafe requests."""

    permission_classes = [AllowAny]
    authentication_classes: list[Any] = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request: Request) -> Response:
        return Response({"ok": True})


class CsrfOnlyAuth(SessionAuth):
    """Never authenticates; only enforces the CSRF token (login has no session yet)."""

    def authenticate(self, request: Request) -> None:  # type: ignore[override]
        self.enforce_csrf(request)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfOnlyAuth]

    def post(self, request: Request) -> Response:
        data = LoginIn(data=request.data)
        data.is_valid(raise_exception=True)
        username = data.validated_data["username"]
        now = timezone.now()

        known = User.objects.filter(username__iexact=username).first()
        if known and known.locked_until and known.locked_until > now:
            minutes = int((known.locked_until - now).total_seconds() // 60) + 1
            raise DomainError(
                "ACCOUNT_LOCKED",
                f"Terlalu banyak percobaan gagal. Coba lagi dalam {minutes} menit "
                "atau minta admin mereset kata sandi.",
                status=429,
            )

        user = authenticate(request._request, username=username, password=data.validated_data["password"])
        if user is None:
            if known and known.is_active:
                known.failed_login_count += 1
                if known.failed_login_count >= settings.LOGIN_MAX_ATTEMPTS:
                    known.locked_until = now + timedelta(minutes=settings.LOGIN_LOCK_MINUTES)
                    known.failed_login_count = 0
                known.save(update_fields=["failed_login_count", "locked_until"])
            raise BAD_CREDENTIALS

        user.failed_login_count = 0
        user.locked_until = None
        user.save(update_fields=["failed_login_count", "locked_until"])
        login(request._request, user)
        return Response(me_payload(user))


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        logout(request._request)
        return Response(status=204)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request: Request) -> Response:
        return Response(me_payload(request.user))  # type: ignore[arg-type]


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        data = PasswordChangeIn(data=request.data)
        data.is_valid(raise_exception=True)
        user: User = request.user  # type: ignore[assignment]
        if not user.check_password(data.validated_data["current_password"]):
            raise DomainError(
                "WRONG_PASSWORD",
                "Kata sandi saat ini salah. Periksa lalu coba lagi.",
                fields={"current_password": "Kata sandi saat ini salah."},
            )
        check_password_strength(data.validated_data["new_password"], user)
        user.set_password(data.validated_data["new_password"])
        user.save(update_fields=["password"])
        update_session_auth_hash(request._request, user)
        return Response({"ok": True})
