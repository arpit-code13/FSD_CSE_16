from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token_allow_expired,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Grace period: tokens expired by up to this many minutes can still be refreshed.
REFRESH_GRACE_MINUTES = 30


def _extract_bearer_token(authorization: str | None) -> str:
    """Pull the token out of an Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    return authorization.split(" ", 1)[1]


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register_user(
        db,
        email=body.email,
        name=body.name,
        password=body.password,
        role=body.role,
        phone=body.phone,
        department=body.department,
        organization=body.organization,
    )
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.get_user_by_email(db, body.email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=user,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Token refresh ──────────────────────────────────────────────────


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    """Issue a fresh JWT using a still-valid or recently-expired token.

    Tokens expired by more than ``REFRESH_GRACE_MINUTES`` are rejected.
    The client sends the current (possibly expired) token in the
    Authorization header and receives a brand-new token in response.
    """
    token = _extract_bearer_token(authorization)

    payload = decode_access_token_allow_expired(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Check grace period — only tokens expired within the window are eligible.
    exp_raw = payload.get("exp")
    if exp_raw is not None:
        if isinstance(exp_raw, datetime):
            exp_dt = exp_raw
        else:
            exp_dt = datetime.fromtimestamp(exp_raw, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        if now - exp_dt > timedelta(minutes=REFRESH_GRACE_MINUTES):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token too old to refresh — please log in again",
            )

    # Look up user
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_token = create_access_token(user.id, user.role)
    return TokenResponse(
        access_token=new_token,
        user=user,
    )
