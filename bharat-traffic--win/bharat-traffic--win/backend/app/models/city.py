from sqlalchemy import Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class City(Base, TimestampMixin):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(100), default="India")
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # relationships
    zones: Mapped[list["Zone"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    corridors: Mapped[list["Corridor"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    roads: Mapped[list["Road"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    intersections: Mapped[list["Intersection"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    traffic_records: Mapped[list["TrafficRecord"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    simulations: Mapped[list["Simulation"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    emergency_routes: Mapped[list["EmergencyRoute"]] = relationship(back_populates="city", cascade="all, delete-orphan")
