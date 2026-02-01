import os

from google import genai

from app.providers.base import LlmProvider


class GeminiProvider(LlmProvider):
    """Gemini を利用して台本を生成する実装。"""
    # Gemini クライアントを初期化し、モデル名を保持する
    def __init__(self, api_key: str, model: str) -> None:
        """API キーとモデル名を受け取りクライアントを初期化する。"""
        # API キーは環境変数で受け取り、ログには出さない
        if not api_key:
            raise ValueError("GEMINI_API_KEY が設定されていません。")

        os.environ["GEMINI_API_KEY"] = api_key
        self._client = genai.Client()
        self._model = model

    # Gemini で台本を生成する
    def generate_script(self, theme: str) -> str:
        """Gemini にテーマを渡して TSV 台本を生成する。"""
        response = self._client.models.generate_content(
            model=self._model,
            contents=build_prompt(theme),
        )

        text = response.text or ""
        return text.strip()


# 生成ルールを固定し、TSV 形式を守らせる
def build_prompt(theme: str) -> str:
    """TSV 形式を守るためのプロンプト文を組み立てる。"""
    return (
        "あなたは、ゆっくり解説動画の台本を作るアシスタントです。\n"
        "以下のルールで TSV 形式の台本を出力してください。\n\n"
        "ルール:\n"
        "- 1行につき『話者<タブ>セリフ』\n"
        "- 話者は『霊夢』と『魔理沙』のみ\n"
        "- 導入、本編、まとめ、締めの一言を含める\n"
        "- 1行のセリフは短め\n"
        "- 余計な説明や前置きは出力しない\n\n"
        f"テーマ: {theme}\n"
        "出力:\n"
    )
