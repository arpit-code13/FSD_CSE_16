"""SignalOptimization model — stores optimization proposals for traffic signals."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class SignalOptimization(Base, TimestampMixin):
    __tablename__ = "signal_optimizations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    signal_id: Mapped[int] = mapped_column(ForeignKey("traffic_signals.id"), index=True)
    intersection_id: Mapped[int] = mapped_column(ForeignKey("intersections.id"), index=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)

    # ── Timing data ────────────────────────────────────────────────
    current_timing: Mapped[dict | None] = mapped_column(JSON)
    recommended_timing: Mapped[dict | None] = mapped_column(JSON)

    # ── Predicted impact ───────────────────────────────────────────
    predicted_impact: Mapped[dict | None] = mapped_column(JSON)

    # ── Approval workflow ──────────────────────────────────────────
    approval_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, approved, rejected
    approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ──────────────────────────────────────────────
    signal: Mapped["TrafficSignal"] = relationship(
        back_populates="optimizations"
    )
    intersection: Mapped["Intersection"] = relationship()
    city: Mapped["City"] = relationship()
    approver: Mapped["User | None"] = relationship()
