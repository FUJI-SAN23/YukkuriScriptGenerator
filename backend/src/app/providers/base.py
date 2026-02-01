from typing import Protocol


class LlmProvider(Protocol):
    # テーマを受け取り TSV 形式の台本を返す共通インターフェース
    def generate_script(self, theme: str) -> str:
        raise NotImplementedError
