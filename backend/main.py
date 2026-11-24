import mysql.connector
from datetime import timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from database import create_log as insert_log
from database import get_log, list_logs, update_log_notes
from routers.auth import router as auth_router
from routers.machines import router as machines_router
from routers.prints import router as prints_router
from security import get_current_user

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(machines_router)
app.include_router(prints_router)


@app.get("/")
def home():
    return {"message": "ThermoSpot backend is running!"}