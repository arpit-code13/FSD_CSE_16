"""Stage 23C — Authorization integration tests.

Exercises the real production app through every auth + admin endpoint to
confirm that:
  • USER registration works and always assigns the USER role.
  • Duplicate-email registration is rejected.
  • Password hashing works (hash never leaks in responses).
  • Login returns a valid bearer token.
  • Wrong password is rejected.
  • GET /api/auth/me returns the current user with a valid token.
  • Missing / invalid JWT is rejected with 401.
  • USER is blocked from admin-only endpoints with 403.
  • ADMIN is allowed on admin-only endpoints.
"""

import os

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.main import app as application
from app.models.user import User, UserRole
import app.models  # noqa: F401

# ── Shared test DB ────────────────────────────────────────────────────

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(_engine)
_TestSession = sessionmaker(bind=_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


application.dependency_overrides[get_db] = _override_get_db
client = TestClient(application)


# ── Helpers ───────────────────────────────────────────────────────────

def _register(name: str, email: str, password: str = "pw123456") -> dict:
    """Register a user and return the JSON response body."""
    resp = client.post("/api/auth/register", json={
        "name": name, "email": email, "password": password,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


def _login(email: str, password: str = "pw123456") -> dict:
    """Login and return the full token response body."""
    resp = client.post("/api/auth/login", json={
        "email": email, "password": password,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_admin(email: str = "admin@x.com", name: str = "Admin") -> User:
    """Insert an ADMIN user directly into the DB (out-of-band promotion)."""
    db = _TestSession()
    from app.core.security import hash_password
    admin = User(
        email=email, name=name,
        password_hash=hash_password("adminpass"),
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    db.close()
    return admin


# ── 1. USER registration ──────────────────────────────────────────────

class TestRegistration:
    def test_register_creates_user_with_correct_role(self):
        data = _register("Arun", "arun@auth23c.com")
        assert data["email"] == "arun@auth23c.com"
        assert data["name"] == "Arun"
        assert data["role"] == "USER"

    def test_password_hash_never_leaks(self):
        data = _register("NoHash", "nohash@auth23c.com")
        assert "password_hash" not in data


# ── 2. Duplicate email ───────────────────────────────────────────────

class TestDuplicateEmail:
    def test_duplicate_email_rejected(self):
        _register("First", "dup@auth23c.com")
        resp = client.post("/api/auth/register", json={
            "name": "Second", "email": "dup@auth23c.com", "password": "pw123456",
        })
        assert resp.status_code == 409


# ── 3. Password hashing ──────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_bcrypt_format(self):
        from app.core.security import hash_password, verify_password
        h = hash_password("test-pw")
        assert h.startswith("$2b$")
        assert verify_password("test-pw", h)
        assert not verify_password("wrong", h)

    def test_same_password_produces_different_hashes(self):
        from app.core.security import hash_password
        assert hash_password("same") != hash_password("same")


# ── 4. Successful login ──────────────────────────────────────────────

class TestLogin:
    def test_login_returns_token_and_user(self):
        _register("Log", "login@auth23c.com")
        data = _login("login@auth23c.com")
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "login@auth23c.com"
        assert "password_hash" not in data["user"]

    def test_login_with_nonexistent_email_returns_401(self):
        resp = client.post("/api/auth/login", json={
            "email": "ghost@auth23c.com", "password": "pw123456",
        })
        assert resp.status_code == 401


# ── 5. Wrong password ────────────────────────────────────────────────

class TestWrongPassword:
    def test_wrong_password_returns_401(self):
        _register("WP", "wp@auth23c.com")
        resp = client.post("/api/auth/login", json={
            "email": "wp@auth23c.com", "password": "wrong-pass",
        })
        assert resp.status_code == 401


# ── 6. Valid /auth/me ────────────────────────────────────────────────

class TestMe:
    def test_me_returns_current_user(self):
        _register("MeUser", "me@auth23c.com")
        token = _login("me@auth23c.com")["access_token"]
        resp = client.get("/api/auth/me", headers=_auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me@auth23c.com"
        assert data["name"] == "MeUser"
        assert data["role"] == "USER"
        assert "password_hash" not in data


# ── 7. Missing JWT ───────────────────────────────────────────────────

class TestMissingJWT:
    def test_me_without_token_returns_401(self):
        assert client.get("/api/auth/me").status_code == 401

    def test_admin_route_without_token_returns_401(self):
        assert client.get("/api/admin/traffic/overview").status_code == 401


# ── 8. Invalid JWT ───────────────────────────────────────────────────

class TestInvalidJWT:
    def test_garbage_token_returns_401(self):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401

    def test_tampered_token_returns_401(self):
        import jwt as pyjwt
        from app.core.config import settings
        forged = pyjwt.encode(
            {"sub": "99999", "role": "ADMIN", "iat": 0, "exp": 999999999},
            "wrong-secret", algorithm="HS256",
        )
        resp = client.get("/api/auth/me", headers=_auth_header(forged))
        assert resp.status_code == 401


# ── 9. USER blocked from ADMIN API ───────────────────────────────────

ADMIN_ENDPOINTS = [
    "/api/admin/traffic/overview",
    "/api/admin/twin/status",
    "/api/admin/predictions",
    "/api/admin/signals",
    "/api/admin/simulations",
    "/api/admin/emergency",
    "/api/admin/incidents",
    "/api/admin/analytics",
    "/api/admin/reports",
    "/api/admin/cities",
]


class TestUserBlockedFromAdmin:
    @pytest.fixture(autouse=True)
    def _setup_user(self):
        # Try login first — user may already exist from a previous parametrized run.
        resp = client.post("/api/auth/login", json={"email": "reguser@auth23c.com", "password": "pw123456"})
        if resp.status_code != 200:
            _register("RegUser", "reguser@auth23c.com")
            resp = client.post("/api/auth/login", json={"email": "reguser@auth23c.com", "password": "pw123456"})
        token = resp.json()["access_token"]
        self.headers = _auth_header(token)

    @pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
    def test_user_gets_403(self, endpoint):
        resp = client.get(endpoint, headers=self.headers)
        assert resp.status_code == 403, f"Expected 403 for {endpoint}, got {resp.status_code}"


# ── 10. ADMIN allowed on ADMIN API ───────────────────────────────────

class TestAdminAllowedOnAdmin:
    @pytest.fixture(autouse=True)
    def _setup_admin(self):
        # Use the app's current DB override so the admin is in the same DB the API uses.
        db_gen = application.dependency_overrides[get_db]()
        db = next(db_gen)
        try:
            admin = db.query(User).filter_by(email="adm23c@x.com").first()
            if admin is None:
                from app.core.security import hash_password
                admin = User(
                    email="adm23c@x.com", name="Admin23C",
                    password_hash=hash_password("adminpass"),
                    role=UserRole.ADMIN,
                )
                db.add(admin)
                db.commit()
                db.refresh(admin)
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass
        from app.core.security import create_access_token
        token = create_access_token(admin.id, admin.role)
        self.headers = _auth_header(token)

    @pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
    def test_admin_gets_200(self, endpoint):
        resp = client.get(endpoint, headers=self.headers)
        assert resp.status_code == 200, f"Expected 200 for {endpoint}, got {resp.status_code}"
        data = resp.json()
        assert data["status"] == "stub"
        assert data["admin"] == "adm23c@x.com"
