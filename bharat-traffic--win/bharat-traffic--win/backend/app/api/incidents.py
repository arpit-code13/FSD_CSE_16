"""Incident CRUD API endpoints.

Provides full CRUD for incident reports:
  - List all incidents (filterable by city, status, type)
  - Create a new incident report
  - Get a single incident by ID
  - Update an incident (severity, status, description, location)
  - Delete an incident

Supports incident types: accident, blockage, breakdown, construction,
flood, signal_failure.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.errors import AppError
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentOut,
    IncidentUpdate,
)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    city_id: int | None = Query(None),
    status: str | None = Query(None),
    incident_type: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List incidents with optional filters."""
    q = select(Incident)
    if city_id is not None:
        q = q.where(Incident.city_id == city_id)
    if status is not None:
        q = q.where(Incident.status == status)
    if incident_type is not None:
        q = q.where(Incident.incident_type == incident_type)
    q = q.order_by(Incident.created_at.desc())
    return list(db.scalars(q).all())


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    body: IncidentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new incident report."""
    incident = Incident(
        city_id=body.city_id,
        incident_type=body.incident_type.value,
        severity=body.severity.value,
        description=body.description,
        road_id=body.road_id,
        intersection_id=body.intersection_id,
        latitude=body.latitude,
        longitude=body.longitude,
        reported_at=datetime.now(timezone.utc),
        status="active",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve a single incident by ID."""
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise AppError(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: int,
    body: IncidentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update an existing incident.

    Can update severity, status, description, and location.
    Setting status to 'resolved' automatically sets resolved_at.
    """
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise AppError(status_code=404, detail="Incident not found")

    if body.severity is not None:
        incident.severity = body.severity.value
    if body.status is not None:
        old_status = incident.status
        incident.status = body.status.value
        # Auto-set resolved_at when resolving
        if old_status == "active" and body.status.value == "resolved" and incident.resolved_at is None:
            incident.resolved_at = datetime.now(timezone.utc)
    if body.description is not None:
        incident.description = body.description
    if body.latitude is not None:
        incident.latitude = body.latitude
    if body.longitude is not None:
        incident.longitude = body.longitude

    db.commit()
    db.refresh(incident)
    return incident


@router.delete("/{incident_id}", status_code=204)
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete an incident record."""
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise AppError(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return None
