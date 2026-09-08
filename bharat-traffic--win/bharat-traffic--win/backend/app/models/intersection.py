from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.road import road_intersection


class Intersection(Base, TimestampMixin):
    __tablename__ = "intersections"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    intersection_type: Mapped[str] = mapped_column(String(50))  # signalized, unsignalized, roundabout

    # relationships
    city: Mapped["City"] = relationship(back_populates="intersections")
    roads: Mapped[list["Road"]] = relationship(secondary=road_intersection, back_populates="intersections")
    traffic_signal: Mapped["TrafficSignal | None"] = relationship(back_populates="intersection", uselist=False, cascade="all, delete-orphan")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="intersection")
    simulation_results: Mapped[list["SimulationResult"]] = relationship(back_populates="intersection")
    origin_routes: Mapped[list["EmergencyRoute"]] = relationship(foreign_keys="EmergencyRoute.origin_intersection_id", back_populates="origin_intersection")
    destination_routes: Mapped[list["EmergencyRoute"]] = relationship(foreign_keys="EmergencyRoute.destination_intersection_id", back_populates="destination_intersection")
