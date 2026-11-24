from datetime import datetime, timezone
from typing import Literal

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from database import create_log, get_log, list_logs, update_log_notes
from security import get_current_user

router = APIRouter(prefix="/api/prints", tags=["Prints"])

TAG_FOR_STATUS = {
    "running": "running",
    "completed": "completed",
    "paused": "issue",
    "aborted": "issue",
    "failed": "error",
}


class NotesUpdate(BaseModel):
    notes: str = Field(max_length=128)


class PrintCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    machine_name: str | None = Field(default=None, max_length=100)
    status: Literal["running", "completed", "paused", "aborted", "failed"] = "completed"

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Print name cannot be blank")
        return value


def to_utc_iso(value):
    """Naive datetime from MySQL (stored as UTC) -> '2026-11-16T14:00:00.123456Z'."""
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def serialize_log(row):
    return {
        "id": row["id"],
        "projectName": row["name"],
        "date": row["started_at"].strftime("%d-%m-%Y"),
        "startedAt": to_utc_iso(row["started_at"]),
        "endedAt": to_utc_iso(row["ended_at"]),
        "estimatedEndAt": to_utc_iso(row["estimated_end_at"]),
        "device": row["device"],
        "status": row["status"],
        "tag": TAG_FOR_STATUS.get(row["status"], "issue"),
        "notes": row["notes"] or "",
    }


def serialize_log_details(row):
    result = serialize_log(row)
    result["readings"] = [
        {
            "recordedAt": to_utc_iso(reading["recorded_at"]),
            "values": reading["values"],
        }
        for reading in row["readings"]
    ]
    return result


def run_database_operation(operation):
    try:
        return operation()
    except (mysql.connector.Error, RuntimeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Check the MySQL service and backend environment.",
        ) from exc


@router.get("")
def list_prints(user=Depends(get_current_user)):
    rows = run_database_operation(lambda: list_logs(user["id"]))
    return [serialize_log(row) for row in rows]


@router.post("", status_code=201)
def create_print(payload: PrintCreate, user=Depends(get_current_user)):
    run_id = run_database_operation(
        lambda: create_log(user["id"], payload.name, payload.status, payload.machine_name)
    )
    if run_id is None:
        raise HTTPException(status_code=404, detail="No machine found. Add a machine first.")

    row = run_database_operation(lambda: get_log(user["id"], run_id))
    return serialize_log_details(row)


@router.get("/{run_id}")
def print_details(run_id: int, since: datetime | None = None, user=Depends(get_current_user)):
    if since is not None and since.tzinfo is not None:
        since = since.astimezone(timezone.utc).replace(tzinfo=None)  # DB stores naive UTC
    row = run_database_operation(lambda: get_log(user["id"], run_id, since))
    if row is None:
        raise HTTPException(status_code=404, detail="Print log not found")
    return serialize_log_details(row)


@router.patch("/{run_id}")
def save_print_notes(run_id: int, update: NotesUpdate, user=Depends(get_current_user)):
    saved = run_database_operation(lambda: update_log_notes(user["id"], run_id, update.notes))
    if not saved:
        raise HTTPException(status_code=404, detail="Print log not found")
    return {"id": run_id, "notes": update.notes}