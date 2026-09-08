from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    road_id: Mapped[int | None] = mapped_column(ForeignKey("roads.id"), index=True)
    intersection_id: Mapped[int | None] = mapped_column(ForeignKey("intersections.id"), index=True)
    incident_type: Mapped[str] = mapped_column(String(50))  # accident, blockage, breakdown, construction, flood, signal_failure
    severity: Mapped[str] = mapped_column(String(20))  # low, medium, high, critical
    description: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, resolved
    # NOTE: reported_by column does not exist in the deployed DB yet.
    # It is excluded from the ORM model to prevent ProgrammingError crashes.
    # Add it via migration: ALTER TABLE incidents ADD COLUMN reported_by INTEGER REFERENCES users(id);

    # relationships
    city: Mapped["City"] = relationship(back_populates="incidents")
    road: Mapped["Road | None"] = relationship(back_populates="incidents")
    intersection: Mapped["Intersection | None"] = relationship(back_populates="incidents")
    emergency_routes: Mapped[list["EmergencyRoute"]] = relationship(back_populates="incident")
