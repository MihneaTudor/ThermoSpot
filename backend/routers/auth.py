from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from db_connection import get_connection
from security import verify_password, create_access_token, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# LOGIN
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):

    email = form_data.username
    password = form_data.password

    conn = get_connection()
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


# GET LOGGED-IN USER
@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return user