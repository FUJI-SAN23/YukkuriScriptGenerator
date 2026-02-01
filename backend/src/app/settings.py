import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """環境変数から読み込む設定値を保持する。"""
    llm_provider: str
    gemini_api_key: str | None
    gemini_model: str


# 環境変数から設定を読み込み、デフォルト値もここで決める
def load_settings() -> Settings:
    """環境変数を読み込み、設定オブジェクトを組み立てる。"""
    return Settings(
        llm_provider=os.getenv("LLM_PROVIDER", "gemini"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    )
