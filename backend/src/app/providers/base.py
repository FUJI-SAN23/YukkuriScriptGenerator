from typing import Protocol


class LlmProvider(Protocol):
    """LLM プロバイダの共通インターフェース。"""
    # テーマを受け取り TSV 形式の台本を返す共通インターフェース
    def generate_script(self, theme: str) -> str:
        """テーマから TSV 形式の台本を生成する。"""
        raise NotImplementedError
