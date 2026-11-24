from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from database import connect_database
from security import verify_password, create_access_token, get_current_user
import mysql.connector
from pydantic import BaseModel, EmailStr, Field, field_validator
from security import hash_password

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

class RegisterRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("display_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

# LOGIN
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):

    email = form_data.username
    password = form_data.password

    conn = connect_database()
    cursor = conn.cursor(dictionary=True)

    try:
        # Find user by email
        cursor.execute(
            """
            SELECT id, email, display_name, password_hash
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        # Check if user exists and password is correct
        if (
            not user
            or not user["password_hash"]
            or not verify_password(password, user["password_hash"])
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )

        # Generate JWT token
        token = create_access_token(user["id"])

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "display_name": user["display_name"]
            }
        }

    finally:
        cursor.close()
        conn.close()

@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    email = payload.email.lower()

    conn = connect_database()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")

        try:
            cursor.execute(
                """
                INSERT INTO users (email, display_name, password_hash)
                VALUES (%s, %s, %s)
                """,
                (email, payload.display_name, hash_password(payload.password)),
            )
            conn.commit()
        except mysql.connector.IntegrityError:
            # two requests raced past the check above
            raise HTTPException(status_code=409, detail="Email already registered")

        return {"id": cursor.lastrowid, "email": email, "display_name": payload.display_name}

    finally:
        cursor.close()
        conn.close()

# GET LOGGED-IN USER
@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return user