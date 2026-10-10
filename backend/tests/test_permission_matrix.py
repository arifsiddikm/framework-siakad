"""Every API route must be accounted for: public, login-only, or guarded by a permission code."""

import pytest
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.api import PermByMethod
from core.models import Permission

PUBLIC = {"CsrfView", "LoginView", "LogoutView"}
LOGIN_ONLY = {"MeView", "PasswordChangeView", "PageDetailView", "PageBlockDataView", "SnippetDataView"}


def api_routes():
    def walk(patterns, prefix=""):
        for p in patterns:
            if isinstance(p, URLResolver):
                yield from walk(p.url_patterns, prefix + str(p.pattern))
            elif isinstance(p, URLPattern):
                yield prefix + str(p.pattern), p.callback

    for route, callback in walk(get_resolver().url_patterns):
        if route.startswith("api/"):
            yield route, callback.cls


ROUTES = list(api_routes())


@pytest.mark.parametrize(("route", "view"), ROUTES, ids=[r for r, _ in ROUTES])
def test_route_is_in_the_permission_matrix(route, view):
    name = view.__name__
    classes = list(view.permission_classes)
    if name in PUBLIC:
        assert AllowAny in classes
    elif name in LOGIN_ONLY:
        assert IsAuthenticated in classes
    else:
        assert PermByMethod in classes, f"{name} ({route}) has no permission check"
        assert view.perm_map, f"{name} ({route}) has an empty perm_map"
        known = set(Permission.objects.values_list("code", flat=True))
        for method, codes in view.perm_map.items():
            for code in (codes,) if isinstance(codes, str) else codes:
                assert code in known, f"{name} {method}: unknown permission {code}"


def test_there_are_routes_for_core_and_modules():
    names = {view.__name__ for _, view in ROUTES}
    assert {"RoleListView", "MahasiswaListView", "LoginView"} <= names


@pytest.mark.parametrize(
    ("route", "view"),
    [(r, v) for r, v in ROUTES if v.__name__ not in PUBLIC | LOGIN_ONLY],
    ids=lambda x: x if isinstance(x, str) else x.__name__,
)
def test_anonymous_is_401_and_unprivileged_user_is_403(route, view, client_for, make_user):
    url = "/" + route.replace("<int:pk>", "1").replace("<str:code>", "core")
    for method in view.perm_map:
        verb = method.lower()
        anon = getattr(client_for(), verb)(url)
        assert anon.status_code == 401, f"{method} {url} anonymous"
        user = make_user(f"u{abs(hash((route, method)))}")
        denied = getattr(client_for(user), verb)(url)
        assert denied.status_code == 403, f"{method} {url} without permission"
