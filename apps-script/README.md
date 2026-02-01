# Apps Script (Webhook)

GAS Webhook で TSV 台本を Google スプレッドシートへ書き込むための最小構成です。

## デプロイ手順

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

## Webhook 呼び出し例（curl）

この Web アプリは 302 リダイレクトが発生するため、curl では -L を付けて呼び出します。
認証トークンはリダイレクトでヘッダが落ちる環境があるため、JSON 本文の token で渡します。

### 環境変数を使う例

```bash
export WEB_APP_URL="https://script.google.com/macros/s/XXXXXXXXXXXX/exec"
export TOKEN="your-token"

curl -i -L --location-trusted "$WEB_APP_URL" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "token": "'"$TOKEN"'",
    "theme": "ゆっくり解説の基本",
    "script_tsv": "霊夢\t今日はゆっくり解説のコツを話すよ\n魔理沙\tいいね、初心者向けに整理しよう"
  }'
```

### .envrc を使う例（direnv）

`.envrc.example` をコピーして `.envrc` を作成し、実際の値を設定してください。

```bash
cd /Users/FUJI/workspace/yukkuri/apps-script
cp .envrc.example .envrc
direnv allow
```

### 直接埋め込む例（動作確認用）

```bash
curl -i -L --location-trusted "https://script.google.com/macros/s/XXXXXXXXXXXX/exec" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "token": "your-token",
    "theme": "ゆっくり解説の基本",
    "script_tsv": "霊夢\t今日はゆっくり解説のコツを話すよ\n魔理沙\tいいね、初心者向けに整理しよう"
  }'
```

### レスポンス例

成功時:

```json
{"ok":true,"sheet_name":"001_ゆっくり解説の基本","rows_written":2,"rows_skipped":0}
```

失敗時（例: 認証失敗）:

```json
{"ok":false,"error":{"code":"unauthorized","message":"認証に失敗しました。"},"rows_skipped":0}
```
