from sqlalchemy import Column, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

# Association table: many-to-many road ↔ intersection
road_intersection = Table(
    "road_intersection",
    Base.metadata,
    Column("road_id", ForeignKey("roads.id"), primary_key=True),
    Column("intersection_id", ForeignKey("intersections.id"), primary_key=True),
)


class Road(Base, TimestampMixin):
    __tablename__ = "roads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    zone_id: Mapped[int | None] = mapped_column(ForeignKey("zones.id"), index=True)
    corridor_id: Mapped[int | None] = mapped_column(ForeignKey("corridors.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    road_type: Mapped[str] = mapped_column(String(50))  # highway, arterial, sub_arterial, local
    length_meters: Mapped[float | None] = mapped_column(Float)
    lanes: Mapped[int] = mapped_column(Integer, default=2)
    speed_limit_kmph: Mapped[float | None] = mapped_column(Float)

    # relationships
    city: Mapped["City"] = relationship(back_populates="roads")
    zone: Mapped["Zone | None"] = relationship(back_populates="roads")
    corridor: Mapped["Corridor | None"] = relationship(back_populates="roads")
    intersections: Mapped[list["Intersection"]] = relationship(secondary=road_intersection, back_populates="roads")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="road")
    traffic_records: Mapped[list["TrafficRecord"]] = relationship(back_populates="road")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="road")
    simulation_results: Mapped[list["SimulationResult"]] = relationship(back_populates="road")
