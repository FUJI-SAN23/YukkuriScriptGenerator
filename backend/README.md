# Backend (FastAPI)

個人運用向けの最小構成バックエンドです。
LLM は切り替え可能な設計で、初期は Gemini を想定しています。

## できること

- テーマを受け取り、TSV 形式の台本を生成する
- 生成結果を API で返す（GAS 連携は後続フェーズ）
- LLM プロバイダを切り替え可能（現状は Gemini のみ実装）

## 前提条件

- Python 3.11 以上を推奨
- Gemini の API キーが必要

## セットアップ

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 環境変数

- `LLM_PROVIDER` (default: gemini)
- `GEMINI_API_KEY` (必須)
- `GEMINI_MODEL` (default: gemini-2.5-flash)
- `PROMPT_PATH` (任意: 外部プロンプトファイルのパス)

例:

```bash
export LLM_PROVIDER="gemini"
export GEMINI_API_KEY="your-api-key"
export GEMINI_MODEL="gemini-2.5-flash"
export PROMPT_PATH="backend/prompts/yukkuri_tsv.txt"
```

## 起動

```bash
uvicorn app.main:app --reload --port 8000
```

## エンドポイント

### GET /health

動作確認用の簡易エンドポイントです。

レスポンス例:

```json
{"ok": true}
```

### POST /generate

テーマから TSV 台本を生成して返します。

リクエスト:

```json
{"theme": "ゆっくり解説の基本"}
```

成功レスポンス:

```json
{
  "ok": true,
  "script_tsv": "霊夢\t...\n魔理沙\t...",
  "rows": 12
}
```

失敗レスポンス（例）:

```json
{
  "ok": false,
  "error": {"code": "invalid_request", "message": "theme が空です。"}
}
```

## 使い方（curl）

```bash
curl -X POST "http://127.0.0.1:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{"theme":"ゆっくり解説の基本"}'
```

レスポンス例（成功時）:

```json
{
  "ok": true,
  "script_tsv": "霊夢\t...\n魔理沙\t...",
  "rows": 12
}
```

## TSV 仕様（最小）

- 1行につき「話者 TAB セリフ」
- 話者は「霊夢」「魔理沙」のみ
- 導入 / 本編 / まとめ / 締めの一言を含める
- 1行のセリフは短め

## プロンプトの差し替え

`PROMPT_PATH` にファイルパスを指定すると、その内容をそのままプロンプトとして使います。
ファイル内では `{theme}` をテーマの差し込み用プレースホルダとして利用できます。

サンプル:

- `backend/prompts/yukkuri_tsv.txt`

## トラブルシュート

- `GEMINI_API_KEY が設定されていません。`
  - 環境変数 `GEMINI_API_KEY` を設定してください。
- `TSV 形式が不正です。`
  - LLM 出力が仕様に合っていない可能性があります。再実行してください。

## セキュリティ

- API キーは環境変数のみで管理し、ログやコードに出力しません。
- テーマや台本文はログに保存しない設計です（今後拡張する場合も注意が必要です）。
