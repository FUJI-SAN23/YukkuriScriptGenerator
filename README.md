# Yukkuri Script Generator → Google Sheets Writer

## 概要

ゆっくり動画向けの会話台本を TSV 形式で受け取り、Google Apps Script の Webhook 経由で
スプレッドシートに自動書き込みするための最小構成ツールです。動画1本ごとに新規シートを作成し、
行番号・話者・セリフの形で整理された台本を保存します。

## Google Apps Script デプロイ手順

1. Google スプレッドシートを用意する
2. スプレッドシートで「拡張機能 → Apps Script」を開く
3. `apps-script/` 配下のコードをデプロイ対象のプロジェクトに反映する（clasp でも可）
4. スクリプトプロパティを設定する
   - Apps Script の「プロジェクトの設定 → スクリプトプロパティ」
   - `TOKEN`: Webhook 用トークン
   - `SPREADSHEET_ID`: 対象スプレッドシート ID
5. 「デプロイ → 新しいデプロイ」
   - 種類: ウェブアプリ
   - 実行ユーザー: 自分
   - アクセス権: リンクを知っている全員

## curl 例

```bash
curl -X POST "$WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: $TOKEN" \
  -d '{
    "theme": "ゆっくり解説の基本",
    "script_tsv": "霊夢\t今日はゆっくり解説のコツを話すよ\n魔理沙\tいいね、初心者向けに整理しよう"
  }'
```

レスポンス例:

```json
{
  "ok": true,
  "sheet_name": "001_ゆっくり解説の基本",
  "rows_written": 2,
  "rows_skipped": 0
}
```
