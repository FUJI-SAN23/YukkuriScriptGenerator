from app.providers.factory import create_provider
from app.settings import Settings


# 台本生成のユースケースをまとめ、エラーは簡潔に返す

def generate_script_tsv(settings: Settings, theme: str) -> str:
    """生成処理の流れをまとめ、TSV を返す。"""
    if not theme or theme.strip() == "":
        raise ValueError("theme が空です。")

    provider = create_provider(settings)
    tsv_text = provider.generate_script(theme.strip())

    if not tsv_text:
        raise RuntimeError("台本の生成に失敗しました。")

    validate_tsv(tsv_text)
    return tsv_text


# TSV の最低限の形式を検証し、不正ならエラーにする

def validate_tsv(tsv_text: str) -> None:
    """TSV の最低限の形式を検証し、不正なら例外にする。"""
    lines = [line for line in tsv_text.split("\n") if line.strip() != ""]
    if not lines:
        raise ValueError("台本が空です。")

    allowed_speakers = {"霊夢", "魔理沙"}
    for line in lines:
        if "\t" not in line:
            raise ValueError("TSV 形式が不正です。")
        speaker, speech = line.split("\t", 1)
        if speaker.strip() not in allowed_speakers:
            raise ValueError("話者が不正です。")
        if speech.strip() == "":
            raise ValueError("セリフが空です。")
