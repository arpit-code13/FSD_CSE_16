from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class TrafficRecord(Base, TimestampMixin):
    __tablename__ = "traffic_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    road_id: Mapped[int] = mapped_column(ForeignKey("roads.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    vehicle_count: Mapped[int] = mapped_column(Integer)
    avg_speed_kmph: Mapped[float] = mapped_column(Float)
    congestion_level: Mapped[str] = mapped_column(String(20))  # free_flow, moderate, slow, congested, gridlock
    vehicle_composition: Mapped[dict | None] = mapped_column(JSON)

    # relationships
    city: Mapped["City"] = relationship(back_populates="traffic_records")
    road: Mapped["Road"] = relationship(back_populates="traffic_records")
