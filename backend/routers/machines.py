
from fastapi import APIRouter, HTTPException, Depends
from db_connection import get_connection

from schemas.machines import MachineCreate, MachineUpdate
from security import get_current_user

router = APIRouter(
    prefix="/machines",
    tags=["Machines"]
)


# CREATE MACHINE
@router.post("/")
def create_machine(
    machine: MachineCreate,
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO machines (user_id, name)
            VALUES (%s, %s)
            """,
            (user_id, machine.name)
        )

        conn.commit()

        return {
            "message": "Machine created successfully",
            "machine_id": cursor.lastrowid
        }

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not create machine. The name might already exist."
        )

    finally:
        cursor.close()
        conn.close()


# GET ALL MACHINES FOR CURRENT USER
@router.get("/")
def get_machines(
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM machines
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# GET ONE MACHINE
@router.get("/{machine_id}")
def get_machine(
    machine_id: int,
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM machines
            WHERE id = %s AND user_id = %s
            """,
            (machine_id, user_id)
        )

        machine = cursor.fetchone()

        if not machine:
            raise HTTPException(
                status_code=404,
                detail="Machine not found"
            )

        return machine

    finally:
        cursor.close()
        conn.close()


# UPDATE MACHINE
@router.put("/{machine_id}")
def update_machine(
    machine_id: int,
    machine: MachineUpdate,
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE machines
            SET name = %s
            WHERE id = %s AND user_id = %s
            """,
            (machine.name, machine_id, user_id)
        )

        if cursor.rowcount == 0:

            cursor.execute(
                """
                SELECT id FROM machines
                WHERE id = %s AND user_id = %s
                """,
                (machine_id, user_id)
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Machine not found"
                )

        conn.commit()

        return {
            "message": "Machine updated successfully"
        }

    except HTTPException:
        raise

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update machine. The name might already exist."
        )

    finally:
        cursor.close()
        conn.close()


# DELETE MACHINE
@router.delete("/{machine_id}")
def delete_machine(
    machine_id: int,
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            DELETE FROM machines
            WHERE id = %s AND user_id = %s
            """,
            (machine_id, user_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Machine not found"
            )

        conn.commit()

        return {
            "message": "Machine deleted successfully"
        }

    finally:
        cursor.close()
        conn.close()