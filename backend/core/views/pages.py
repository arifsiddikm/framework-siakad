"""Portal side of admin-written pages: GET /api/pages/<slug>/ and the data of its data blocks."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core import snippets
from core.models import ContentPage
from core.selectors import has_permission
from core.services import blocks as block_service


def _readable_page(request: Request, slug: str) -> ContentPage:
    """Published page the user may read; the page's permission (if any) is checked on the server."""
    page = get_object_or_404(ContentPage.objects.select_related("permission"), slug=slug, is_published=True)
    if page.permission and not has_permission(request.user, page.permission.code):  # type: ignore[arg-type]
        raise PermissionDenied()
    return page


class PageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str) -> Response:
        page = _readable_page(request, slug)
        return Response(
            {
                "slug": page.slug,
                "title": page.title,
                "blocks": page.blocks,
                "updated_at": page.updated_at.isoformat(),
            }
        )


class PageBlockDataView(APIView):
    """Data of one data block. The browser sends only ids; dataset and columns come from the saved page."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, slug: str, block_id: str) -> Response:
        page = _readable_page(request, slug)
        block = next((b for b in page.blocks if b.get("id") == block_id), None)
        if block is None:
            raise NotFound()
        return Response(block_service.run_block(block, request.user))  # type: ignore[arg-type]


class SnippetDataView(APIView):
    """Data of a snippet's optional Python half (backend/snippets/<name>.py), for the signed-in viewer.

    The provider itself decides who may see its data (`PERMISSION`) and must treat `params` as untrusted.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, name: str) -> Response:
        params = {key: value for key, value in request.query_params.items()}
        return Response({"data": snippets.run_snippet(name, params, request.user)})  # type: ignore[arg-type]
