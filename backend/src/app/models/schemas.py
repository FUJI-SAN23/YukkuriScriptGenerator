from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    theme: str = Field(..., min_length=1, max_length=100)


class GenerateResponse(BaseModel):
    ok: bool
    script_tsv: str
    rows: int
