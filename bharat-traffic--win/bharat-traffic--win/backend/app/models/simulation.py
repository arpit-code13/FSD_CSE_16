from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Simulation(Base, TimestampMixin):
    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    scenario_type: Mapped[str] = mapped_column(String(50))  # baseline, signal_timing, incident, demand_change
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending, running, completed, failed
    parameters: Mapped[dict | None] = mapped_column(JSON)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # relationships
    city: Mapped["City"] = relationship(back_populates="simulations")
    user: Mapped["User | None"] = relationship(back_populates="simulations")
    results: Mapped[list["SimulationResult"]] = relationship(back_populates="simulation", cascade="all, delete-orphan")
