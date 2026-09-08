from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class EmergencyRoute(Base, TimestampMixin):
    __tablename__ = "emergency_routes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), index=True)
    origin_intersection_id: Mapped[int] = mapped_column(ForeignKey("intersections.id"), index=True)
    destination_intersection_id: Mapped[int] = mapped_column(ForeignKey("intersections.id"), index=True)
    route_path: Mapped[dict | None] = mapped_column(JSON)
    distance_meters: Mapped[float | None] = mapped_column(Float)
    estimated_time_seconds: Mapped[float | None] = mapped_column(Float)
    priority: Mapped[str] = mapped_column(String(20), default="high")  # low, medium, high, critical
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, active, cleared
    name: Mapped[str | None] = mapped_column(String(255))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)

    # Simulation fields
    simulation_eta_seconds: Mapped[float | None] = mapped_column(Float)
    simulation_time_saved_seconds: Mapped[float | None] = mapped_column(Float)
    simulation_coordinated_signals: Mapped[dict | None] = mapped_column(JSON)
    simulation_result: Mapped[dict | None] = mapped_column(JSON)

    # Approval fields
    approval_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # relationships
    city: Mapped["City"] = relationship(back_populates="emergency_routes")
    incident: Mapped["Incident | None"] = relationship(back_populates="emergency_routes")
    origin_intersection: Mapped["Intersection"] = relationship(foreign_keys=[origin_intersection_id], back_populates="origin_routes")
    destination_intersection: Mapped["Intersection"] = relationship(foreign_keys=[destination_intersection_id], back_populates="destination_routes")
    creator: Mapped["User | None"] = relationship(foreign_keys=[created_by])
