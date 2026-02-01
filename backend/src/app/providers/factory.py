from app.providers.base import LlmProvider
from app.providers.gemini import GeminiProvider
from app.settings import Settings


# 設定値に応じて LLM プロバイダを選択する

def create_provider(settings: Settings) -> LlmProvider:
    """設定値に応じて LLM プロバイダの実装を生成する。"""
    provider = settings.llm_provider.lower()

    if provider == "gemini":
        return GeminiProvider(settings.gemini_api_key or "", settings.gemini_model)

    raise ValueError("対応していない LLM プロバイダです。")
