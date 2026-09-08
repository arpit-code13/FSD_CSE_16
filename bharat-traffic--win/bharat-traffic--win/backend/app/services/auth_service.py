from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import hash_password
from app.models.user import User, UserRole


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


ADMIN_EMAIL_DOMAIN = "bharat.traffic.twin"


def register_user(
    db: Session,
    *,
    email: str,
    name: str,
    password: str,
    role: str | None = None,
    phone: str | None = None,
    department: str | None = None,
    organization: str | None = None,
) -> User:
    """Create a new account.

    If *role* is ``"admin"`` the email must belong to the official
    ``@bharat.traffic.twin`` domain, otherwise the account is always created
    as USER.
    """
    if get_user_by_email(db, email) is not None:
        raise AppError(status_code=409, detail="Email already registered")

    # Determine role: only @bharat.traffic.twin emails may be admin
    user_role = UserRole.USER
    if role and role.lower() == "admin" and email.lower().endswith(f"@{ADMIN_EMAIL_DOMAIN}"):
        user_role = UserRole.ADMIN

    user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
        role=user_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
