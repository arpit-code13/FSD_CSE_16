from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Prediction(Base, TimestampMixin):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    road_id: Mapped[int] = mapped_column(ForeignKey("roads.id"), index=True)
    predicted_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    predicted_vehicle_count: Mapped[int] = mapped_column(Integer)
    predicted_avg_speed_kmph: Mapped[float] = mapped_column(Float)
    predicted_congestion_level: Mapped[str] = mapped_column(String(20))
    model_name: Mapped[str] = mapped_column(String(100))
    confidence_score: Mapped[float | None] = mapped_column(Float)

    # relationships
    city: Mapped["City"] = relationship(back_populates="predictions")
    road: Mapped["Road"] = relationship(back_populates="predictions")
