from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """台本生成リクエストの入力スキーマ。"""
    theme: str = Field(..., min_length=1, max_length=100)


class GenerateResponse(BaseModel):
    """台本生成レスポンスの出力スキーマ。"""
    ok: bool
    script_tsv: str
    rows: int
