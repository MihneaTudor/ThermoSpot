from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db_connection import get_connection

from routers.machines import router as machines_router
from routers.auth import router as auth_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(machines_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    get_connection()
    return {"message": "ThermoSpot backend is running!k"}

