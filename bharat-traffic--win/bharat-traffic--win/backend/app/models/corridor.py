from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Corridor(Base, TimestampMixin):
    __tablename__ = "corridors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    length_meters: Mapped[float | None] = mapped_column(Float)
    road_type: Mapped[str] = mapped_column(String(50))  # highway, arterial, sub_arterial, local

    # relationships
    city: Mapped["City"] = relationship(back_populates="corridors")
    roads: Mapped[list["Road"]] = relationship(back_populates="corridor")
