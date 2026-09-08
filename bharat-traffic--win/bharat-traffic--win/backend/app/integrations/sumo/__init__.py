"""SUMO integration package.

Provides SumoService for managing SUMO traffic simulations via TraCI.
All SUMO communication is routed through this package; the frontend
never communicates with SUMO directly.
"""

from app.integrations.sumo.sumo_service import (
    SumoService,
    SumoUnavailableError,
    SumoSessionError,
    sumo_service,
)

__all__ = [
    "SumoService",
    "SumoUnavailableError",
    "SumoSessionError",
    "sumo_service",
]
