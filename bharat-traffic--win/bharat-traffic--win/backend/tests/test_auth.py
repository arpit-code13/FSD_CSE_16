import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.core.security as security
from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.core.database import get_db
from app.core.errors import AppError
from app.models.user import User, UserRole
from app.services import auth_service


# --- password hashing ---

def test_password_hash_roundtrip():
    hashed = security.hash_password("S3cret-pass!")
    assert hashed != "S3cret-pass!"
    assert hashed.startswith("$2b$")  # bcrypt format
    assert security.verify_password("S3cret-pass!", hashed) is True
    assert security.verify_password("wrong-password", hashed) is False


def test_password_hash_is_salted():
    assert security.hash_password("same") != security.hash_password("same")


# --- JWT ---

def test_token_contains_user_id_role_and_expiry():
    token = security.create_access_token(user_id=7, role=UserRole.ADMIN)
    payload = security.decode_access_token(token)

    assert payload["sub"] == "7"
    assert payload["role"] == "ADMIN"
    assert payload["exp"] > payload["iat"]


def test_expired_token_rejected():
    token = security.create_access_token(user_id=1, role=UserRole.USER)
    payload = security.decode_access_token(token)
    expired = jwt.encode(
        {**payload, "exp": payload["exp"] - 7200},  # exp is epoch seconds: 2h in the past
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        security.decode_access_token(expired)


def test_tampered_token_rejected():
    token = security.create_access_token(user_id=1, role=UserRole.USER)
    forged_secret = jwt.encode({"sub": "1", "role": "ADMIN"}, "not-the-secret", algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        security.decode_access_token(forged_secret)
    with pytest.raises(jwt.InvalidTokenError):
        security.decode_access_token(token + "tampered")


# --- registration service ---

def test_register_user_creates_user_role_with_hashed_password(db: Session):
    user = auth_service.register_user(db, email="a@x.com", name="A", password="pw-123456")

    assert user.role == UserRole.USER
    assert user.password_hash != "pw-123456"
    assert security.verify_password("pw-123456", user.password_hash)


def test_register_user_rejects_duplicate_email(db: Session):
    auth_service.register_user(db, email="dup@x.com", name="A", password="pw-123456")
    with pytest.raises(AppError) as exc_info:
        auth_service.register_user(db, email="dup@x.com", name="B", password="other-pw")
    assert exc_info.value.status_code == 409


# --- dependencies (via a throwaway app; not production endpoints) ---

@pytest.fixture()
def auth_client(db: Session):
    app = FastAPI()

    @app.get("/whoami")
    def whoami(user: User = Depends(get_current_user)):
        return {"id": user.id, "role": user.role.value}

    @app.get("/admin-only")
    def admin_only(user: User = Depends(require_admin)):
        return {"ok": True}

    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def _auth_header(user: User) -> dict:
    token = security.create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def test_get_current_user_with_valid_token(db: Session, auth_client):
    user = auth_service.register_user(db, email="u@x.com", name="U", password="pw-123456")
    response = auth_client.get("/whoami", headers=_auth_header(user))
    assert response.status_code == 200
    assert response.json() == {"id": user.id, "role": "USER"}


def test_get_current_user_rejects_missing_token(auth_client):
    assert auth_client.get("/whoami").status_code == 401


def test_get_current_user_rejects_garbage_token(auth_client):
    response = auth_client.get("/whoami", headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401


def test_get_current_user_rejects_deleted_user(db: Session, auth_client):
    user = auth_service.register_user(db, email="gone@x.com", name="G", password="pw-123456")
    header = _auth_header(user)
    db.delete(user)
    db.commit()
    assert auth_client.get("/whoami", headers=header).status_code == 401


def test_require_admin_allows_admin(db: Session, auth_client):
    admin = User(email="adm@x.com", name="Admin", password_hash="x", role=UserRole.ADMIN)
    db.add(admin)
    db.commit()
    assert auth_client.get("/admin-only", headers=_auth_header(admin)).status_code == 200


def test_require_admin_forbids_regular_user(db: Session, auth_client):
    user = auth_service.register_user(db, email="plain@x.com", name="P", password="pw-123456")
    assert auth_client.get("/admin-only", headers=_auth_header(user)).status_code == 403
