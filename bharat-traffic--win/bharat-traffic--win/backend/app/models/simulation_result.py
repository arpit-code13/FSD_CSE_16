from sqlalchemy import Float, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class SimulationResult(Base, TimestampMixin):
    __tablename__ = "simulation_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    simulation_id: Mapped[int] = mapped_column(ForeignKey("simulations.id"), index=True)
    road_id: Mapped[int | None] = mapped_column(ForeignKey("roads.id"), index=True)
    intersection_id: Mapped[int | None] = mapped_column(ForeignKey("intersections.id"), index=True)
    avg_travel_time_seconds: Mapped[float | None] = mapped_column(Float)
    avg_speed_kmph: Mapped[float | None] = mapped_column(Float)
    total_vehicles: Mapped[int | None] = mapped_column(Integer)
    max_queue_length: Mapped[int | None] = mapped_column(Integer)
    metrics: Mapped[dict | None] = mapped_column(JSON)

    # relationships
    simulation: Mapped["Simulation"] = relationship(back_populates="results")
    road: Mapped["Road | None"] = relationship(back_populates="simulation_results")
    intersection: Mapped["Intersection | None"] = relationship(back_populates="simulation_results")
