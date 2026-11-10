from pydantic import BaseModel, Field
from datetime import datetime


class MachineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    user_id: str= Field(min_length=1, max_length=100)


class MachineUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    user_id: str= Field(min_length=1, max_length=100)

class MachineResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime
    updated_at: datetime