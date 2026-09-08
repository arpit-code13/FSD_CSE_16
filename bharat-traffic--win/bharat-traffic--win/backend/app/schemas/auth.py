from pydantic import BaseModel, EmailStr, model_validator


ADMIN_EMAIL_DOMAIN = "bharat.traffic.twin"


class RegisterRequest(BaseModel):
    name: str = ""
    full_name: str | None = None
    email: EmailStr
    password: str
    role: str | None = None  # "admin" or "user" — validated below
    phone: str | None = None
    department: str | None = None
    organization: str | None = None

    @model_validator(mode="after")
    def populate_name(self):
        if not self.name and self.full_name:
            self.name = self.full_name
        if not self.name:
            self.name = self.email.split("@")[0]
        return self

    @model_validator(mode="after")
    def validate_admin_role(self):
        """Only @bharat.traffic.twin emails may register as admin."""
        if self.role and self.role.lower() == "admin":
            if not self.email.lower().endswith(f"@{ADMIN_EMAIL_DOMAIN}"):
                raise ValueError(
                    f"Admin registration requires a @{ADMIN_EMAIL_DOMAIN} email address"
                )
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
