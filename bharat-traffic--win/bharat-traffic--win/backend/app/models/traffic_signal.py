from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class TrafficSignal(Base, TimestampMixin):
    __tablename__ = "traffic_signals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intersection_id: Mapped[int] = mapped_column(ForeignKey("intersections.id"), unique=True)
    signal_type: Mapped[str] = mapped_column(String(50))  # fixed, adaptive
    phases: Mapped[dict | None] = mapped_column(JSON)
    cycle_time_seconds: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # relationships
    intersection: Mapped["Intersection"] = relationship(back_populates="traffic_signal")
    optimizations: Mapped[list["SignalOptimization"]] = relationship(back_populates="signal")
