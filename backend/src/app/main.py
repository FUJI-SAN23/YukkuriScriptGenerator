from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.models.schemas import GenerateRequest, GenerateResponse
from app.services.script_generator import generate_script_tsv
from app.settings import load_settings

app = FastAPI()


# エラーレスポンスの形式を統一し、詳細情報は返さない
def build_error_response(code: str, message: str, status_code: int = 400) -> JSONResponse:
    payload = {"ok": False, "error": {"code": code, "message": message}}
    return JSONResponse(status_code=status_code, content=payload)


# 動作確認用の簡易エンドポイント
@app.get("/health")
def health_check() -> dict:
    return {"ok": True}


# テーマから TSV 台本を生成して返す
@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest) -> GenerateResponse:
    settings = load_settings()
    try:
        script_tsv = generate_script_tsv(settings, request.theme)
    except ValueError as error:
        return build_error_response("invalid_request", str(error))
    except RuntimeError as error:
        return build_error_response("generation_failed", str(error), status_code=500)

    rows = 0
    if script_tsv:
        rows = len([line for line in script_tsv.split("\n") if line.strip() != ""])

    return GenerateResponse(ok=True, script_tsv=script_tsv, rows=rows)
