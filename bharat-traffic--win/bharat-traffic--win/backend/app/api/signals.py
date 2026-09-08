"""Signal Optimisation API — list, optimise, simulate, and approve.

All endpoints require a valid JWT (authenticated USER or ADMIN).
Approval is manual — only an explicit POST approves the optimisation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.signal_optimization import (
    ApprovalResult,
    OptimizationRecord,
    PredictedImpact,
    SignalListItem,
    SignalTiming,
    SimulationResult,
)
from app.services import signal_optimization_service

router = APIRouter(prefix="/api/signals", tags=["signals"])


# ── Helpers ───────────────────────────────────────────────────────────

def _dict_to_signal_item(d: dict) -> SignalListItem:
    return SignalListItem(**d)


def _dict_to_optimization_record(d: dict) -> OptimizationRecord:
    return OptimizationRecord(
        id=d["id"],
        signal_id=d["signal_id"],
        intersection_id=d["intersection_id"],
        intersection_name=d.get("intersection_name"),
        city_id=d["city_id"],
        current_timing=SignalTiming(**d["current_timing"]) if d.get("current_timing") else None,
        recommended_timing=SignalTiming(**d["recommended_timing"]) if d.get("recommended_timing") else None,
        predicted_impact=PredictedImpact(**d["predicted_impact"]) if d.get("predicted_impact") else None,
        approval_status=d["approval_status"],
        created_at=d.get("created_at"),
    )


# ── GET /api/signals ─────────────────────────────────────────────────

@router.get("", response_model=list[SignalListItem])
def list_signals(
    city_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all traffic signals with current state."""
    results = signal_optimization_service.list_signals_with_state(db, city_id=city_id)
    return [_dict_to_signal_item(r) for r in results]


# ── POST /api/signals/optimize ───────────────────────────────────────

@router.post("/optimize", response_model=OptimizationRecord)
def optimise_signal(
    signal_id: int = Query(..., description="Signal to optimise"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Run optimisation for a single signal.

    Analyses traffic records and generates a recommended timing adjustment.
    The result is stored and requires manual approval.
    """
    result = signal_optimization_service.optimise_signal(db, signal_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found",
        )
    return _dict_to_optimization_record(result)


# ── POST /api/signals/optimization/{id}/simulate ─────────────────────

@router.post("/optimization/{optimization_id}/simulate", response_model=SimulationResult)
def simulate_optimisation(
    optimization_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Simulate the effect of applying a pending optimisation.

    Returns predicted impact without actually applying changes.
    """
    result = signal_optimization_service.simulate_optimisation(db, optimization_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optimisation not found or not in pending status",
        )
    return SimulationResult(
        optimization_id=result["optimization_id"],
        status=result["status"],
        simulated_impact=PredictedImpact(**result["simulated_impact"]),
        simulation_notes=result["simulation_notes"],
    )


# ── POST /api/signals/optimization/{id}/approve ──────────────────────

@router.post("/optimization/{optimization_id}/approve", response_model=ApprovalResult)
def approve_optimisation(
    optimization_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Manually approve a pending optimisation.

    Only ADMIN users can approve. The optimisation must be in ``pending``
    status.
    """
    result = signal_optimization_service.approve_optimisation(
        db, optimization_id, user.id
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optimisation not found",
        )
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=result["error"],
        )
    return ApprovalResult(**result)
