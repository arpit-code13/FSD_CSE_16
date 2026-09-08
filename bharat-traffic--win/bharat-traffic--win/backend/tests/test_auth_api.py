import os

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.main import app as application
import app.models  # noqa: F401

_engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
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


def test_register_creates_user():
    resp = client.post("/api/auth/register", json={
        "name": "Arun",
        "email": "arun@test.com",
        "password": "secure-pass-123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "arun@test.com"
    assert data["name"] == "Arun"
    assert data["role"] == "USER"
    assert "password_hash" not in data


def test_register_rejects_duplicate_email():
    payload = {"name": "A", "email": "dup@test.com", "password": "pw123456"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_register_rejects_invalid_email():
    resp = client.post("/api/auth/register", json={
        "name": "A",
        "email": "not-an-email",
        "password": "pw123456",
    })
    assert resp.status_code == 422


def test_login_returns_token():
    client.post("/api/auth/register", json={
        "name": "B",
        "email": "b@test.com",
        "password": "pw123456",
    })
    resp = client.post("/api/auth/login", json={
        "email": "b@test.com",
        "password": "pw123456",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "b@test.com"
    assert "password_hash" not in data["user"]


def test_login_invalid_credentials():
    resp = client.post("/api/auth/login", json={
        "email": "nobody@test.com",
        "password": "wrong",
    })
    assert resp.status_code == 401


def test_login_wrong_password():
    client.post("/api/auth/register", json={
        "name": "C",
        "email": "c@test.com",
        "password": "correct-pw",
    })
    resp = client.post("/api/auth/login", json={
        "email": "c@test.com",
        "password": "wrong-pw",
    })
    assert resp.status_code == 401


def test_me_returns_user_with_valid_token():
    client.post("/api/auth/register", json={
        "name": "D",
        "email": "d@test.com",
        "password": "pw123456",
    })
    login = client.post("/api/auth/login", json={
        "email": "d@test.com",
        "password": "pw123456",
    }).json()
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "d@test.com"
    assert data["name"] == "D"
    assert data["role"] == "USER"
    assert "password_hash" not in data


def test_me_rejects_no_token():
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_invalid_token():
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


def test_password_hash_never_leaks():
    """Verify password_hash is absent from register, login, and me responses."""
    client.post("/api/auth/register", json={
        "name": "E",
        "email": "e@test.com",
        "password": "pw123456",
    })
    login = client.post("/api/auth/login", json={
        "email": "e@test.com",
        "password": "pw123456",
    }).json()
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"}).json()
    for payload in [login["user"], me]:
        assert "password_hash" not in payload, f"password_hash leaked in {payload}"
