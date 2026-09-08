"""Admin-only API routes.

Every endpoint here is guarded by ``require_admin`` so only users with the
ADMIN role can access them.  Endpoints are stubs for now — they return
acknowledgement payloads and will be fleshed-out in later stages.
"""

from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Traffic administration ────────────────────────────────────────────
@router.get("/traffic/overview")
def traffic_overview(user: User = Depends(require_admin)):
    return {"area": "traffic", "status": "stub", "admin": user.email}


# ── Digital-Twin administration ───────────────────────────────────────
@router.get("/twin/status")
def twin_status(user: User = Depends(require_admin)):
    return {"area": "digital_twin", "status": "stub", "admin": user.email}


# ── Predictions management ────────────────────────────────────────────
@router.get("/predictions")
def list_predictions(user: User = Depends(require_admin)):
    return {"area": "predictions", "status": "stub", "admin": user.email}


# ── Signal optimisation ───────────────────────────────────────────────
@router.get("/signals")
def list_signals(user: User = Depends(require_admin)):
    return {"area": "signals", "status": "stub", "admin": user.email}


# ── What-If simulations ───────────────────────────────────────────────
@router.get("/simulations")
def list_simulations(user: User = Depends(require_admin)):
    return {"area": "simulations", "status": "stub", "admin": user.email}


# ── Emergency operations ──────────────────────────────────────────────
@router.get("/emergency")
def list_emergency_routes(user: User = Depends(require_admin)):
    return {"area": "emergency", "status": "stub", "admin": user.email}


# ── Incident management ───────────────────────────────────────────────
@router.get("/incidents")
def list_incidents(user: User = Depends(require_admin)):
    return {"area": "incidents", "status": "stub", "admin": user.email}


# ── Analytics ─────────────────────────────────────────────────────────
@router.get("/analytics")
def analytics_dashboard(user: User = Depends(require_admin)):
    return {"area": "analytics", "status": "stub", "admin": user.email}


# ── Reports ───────────────────────────────────────────────────────────
@router.get("/reports")
def list_reports(user: User = Depends(require_admin)):
    return {"area": "reports", "status": "stub", "admin": user.email}


# ── City management ───────────────────────────────────────────────────
@router.get("/cities")
def list_cities(user: User = Depends(require_admin)):
    return {"area": "cities", "status": "stub", "admin": user.email}
