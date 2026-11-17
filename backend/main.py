import mysql.connector
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Literal
from datetime import timezone

from database import create_log as insert_log
from database import get_log, list_logs, update_log_notes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/")
def home():
    return {"message": "ThermoSpot backend is running!"}


@app.get("/api/prints")
def list_prints():
    rows = run_database_operation(list_logs)
    return [serialize_log(row) for row in rows]


@app.post("/api/prints", status_code=201)
def create_print(payload: PrintCreate):
    run_id = run_database_operation(
        lambda: insert_log(payload.name, payload.status, payload.machine_name)
    )
    if run_id is None:
        raise HTTPException(
            status_code=404,
            detail="No machine found for the demo user. Add a machine first.",
        )

    row = run_database_operation(lambda: get_log(run_id))
    return serialize_log_details(row)


@app.get("/api/prints/{run_id}")
def print_details(run_id: int):
    row = run_database_operation(lambda: get_log(run_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Print log not found")

    return serialize_log_details(row)


@app.patch("/api/prints/{run_id}")
def save_print_notes(run_id: int, update: NotesUpdate):
    saved = run_database_operation(lambda: update_log_notes(run_id, update.notes))
    if not saved:
        raise HTTPException(status_code=404, detail="Print log not found")
    return {"id": run_id, "notes": update.notes}