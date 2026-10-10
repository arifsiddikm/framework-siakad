"""Core tables: users, RBAC, module registry, menu. Modules must never alter these."""

from __future__ import annotations

from typing import Any

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models

username_validator = RegexValidator(
    r"^[a-zA-Z0-9._-]{3,50}$",
    "Username 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.",
)


class UserManager(BaseUserManager["User"]):
    def create_user(self, username: str, password: str | None, **extra: Any) -> User:
        user = self.model(username=username, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    username = models.CharField(max_length=50, unique=True, validators=[username_validator])
    full_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    identifier = models.CharField(max_length=30, blank=True, help_text="NIM / NIP / NIDN")
    is_active = models.BooleanField(default=True)
    failed_login_count = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    roles = models.ManyToManyField("Role", through="UserRole", related_name="users")  # type: ignore[var-annotated]

    objects = UserManager()
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS: list[str] = []  # type: ignore[misc]

    class Meta:
        ordering = ["username"]

    def __str__(self) -> str:
        return self.username


class ModuleState(models.Model):
    """One row per module folder (plus `core`). `is_active` is the admin's on/off switch."""

    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=40, blank=True)
    description = models.CharField(max_length=255, blank=True)
    depends_on = models.JSONField(default=list, blank=True)
    is_core = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_orphan = models.BooleanField(default=False, help_text="Folder is gone from the codebase")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_core", "name"]

    def __str__(self) -> str:
        return self.code


class Permission(models.Model):
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=150)
    module = models.ForeignKey(
        ModuleState, to_field="code", on_delete=models.PROTECT, related_name="permissions"
    )

    class Meta:
        ordering = ["module_id", "code"]

    def __str__(self) -> str:
        return self.code


class Role(models.Model):
    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=60, unique=True)
    description = models.CharField(max_length=255, blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    permissions = models.ManyToManyField(Permission, through="RolePermission", related_name="roles")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.code


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name="permission_roles")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["role", "permission"], name="uniq_role_permission")]

    def __str__(self) -> str:
        return f"{self.role_id}:{self.permission_id}"


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="user_roles")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "role"], name="uniq_user_role")]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.role_id}"


class MenuItem(models.Model):
    """Menu is data. A row without `to` is a group; depth is at most 2 (group → item)."""

    key = models.CharField(max_length=120, unique=True, null=True, blank=True)
    title = models.CharField(max_length=40)
    hint = models.CharField(max_length=120, blank=True)
    icon = models.CharField(max_length=40, blank=True)
    to = models.CharField(max_length=300, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    order = models.IntegerField(default=0)
    module = models.ForeignKey(
        ModuleState,
        to_field="code",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="menu_items",
    )
    permission = models.ForeignKey(
        Permission, null=True, blank=True, on_delete=models.PROTECT, related_name="menu_items"
    )
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    is_orphan = models.BooleanField(default=False, help_text="Gone from its manifest; hidden")

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.title


class ContentPage(models.Model):
    """A page written by an admin, shown at /p/<slug>.

    Access follows `permission`; no permission means any signed-in user.
    """

    slug = models.SlugField(max_length=60, unique=True)
    title = models.CharField(max_length=80)
    blocks = models.JSONField(default=list, blank=True)
    permission = models.ForeignKey(
        Permission, null=True, blank=True, on_delete=models.PROTECT, related_name="content_pages"
    )
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]

    def __str__(self) -> str:
        return self.slug


class SnippetRecord(models.Model):
    """Bookkeeping for a snippet file. The files are the truth; this row adds status and history."""

    name = models.CharField(max_length=120, unique=True)
    label = models.CharField(max_length=80)
    hint = models.CharField(max_length=200, blank=True)
    params = models.JSONField(default=list, blank=True)
    has_data = models.BooleanField(default=False)
    created_from_web = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)  # False = deleted (files renamed with _deleted)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
