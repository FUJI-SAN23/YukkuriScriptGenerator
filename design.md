# Design Document

AI-based Yukkuri Script Generator → Google Sheets Writer

## Background

ゆっくり動画制作では、テーマ決めから台本作成、スプレッドシートへの転記までに手作業が多く発生する。
特に「会話形式の台本を一定の構造で量産する」「動画編集向けにスプレッドシート形式で管理する」という工程は自動化の余地が大きい。

本プロジェクトは、
AI によるゆっくり動画台本生成と、Google スプレッドシートへの自動反映を最小構成で実現する OSS ツールを提供することを目的とする。

初期版は個人利用を前提としつつ、将来的な拡張や構成変更に耐えられる設計を重視する。

---

## Goals / Non-goals

### Goals

- テーマ入力から、ゆっくり動画向け会話台本を自動生成する
- 台本を TSV 形式で扱い、Google スプレッドシートへ自動書き込みする
- 動画1本につき新規シートを作成する
- 最小構成で実用に耐えるワークフローを提供する
- 将来の拡張を前提に、責務と設定を分離した設計にする

### Non-goals

- 音声合成や動画生成の自動化
- アプリ内での台本編集機能
- 台本プレビュー UI
- ユーザー管理、認証、マルチテナント対応
- 再生成ボタンなどの高度な UX
- 複数話者や高度な演出制御

---

## Use cases

### UC-1: ゆっくり動画用台本を素早く用意したい

- ユーザーがテーマを入力する
- AI が会話形式の台本を生成する
- 台本がスプレッドシートに自動で書き込まれる
- 動画編集作業にそのまま使える

### UC-2: 台本管理をスプレッドシートに集約したい

- 動画ごとに新規シートが作成される
- 行番号・話者・セリフが整理された形で保存される
- 後工程（音声合成・編集）に流しやすい

---

## Functional requirements

### Script generation

- 台本は AI により生成される
- 出力形式は TSV
- 1行につき「話者 タブ セリフ」
- 話者は「霊夢」「魔理沙」で固定
- 構成は以下を含む
  - 導入
  - 本編
  - まとめ
  - 締めの一言

- 1行のセリフは短めであること

### Google Sheets integration

- 書き込み先は固定の Google スプレッドシート
- 動画1本につき新規シートを作成する
- シート名は `001_テーマ` 形式
  - 3桁連番
  - テーマは最大20文字
  - 999を超えた場合は001に戻す

- ヘッダ行を必ず作成する

### TSV parsing

- 改行区切りで行を分割する
- タブ区切りで話者・セリフを抽出する
- 不正な行はスキップして続行する
- スキップした行数をレスポンスに含める

### Webhook

- Google Apps Script の Web アプリとして提供する
- POST リクエストのみを受け付ける
- シークレットトークンによる簡易認証を行う

---

## Non-functional requirements

### Simplicity

- 初期版は個人利用を前提とし、構成を極力シンプルに保つ

### Extensibility

- 列追加や設定移行に耐えられる設計にする
- 設定値へのアクセスは一箇所に集約する

### Maintainability

- GAS 内のロジックは責務ごとに関数分割する
- 設定と処理ロジックを分離する

### Security (minimal)

- Webhook はシークレットトークンで保護する
- GAS Web アプリの公開範囲は「リンクを知っている全員」

---

## Architecture / 技術方針

### Overview

- AI による台本生成はバックエンド側で行う
- 台本データは TSV として GAS Webhook に送信する
- Google Apps Script がスプレッドシート操作を担当する

### Components

- Backend
  - テーマ入力受付
  - AI への台本生成リクエスト
  - TSV 整形
  - GAS Webhook への POST

- Google Apps Script
  - 認証（トークン）
  - TSV パース
  - シート採番
  - 新規シート作成
  - 一括書き込み
  - JSON レスポンス返却

### Configuration strategy

- 初期版
  - SPREADSHEET_ID: GAS 側に固定
  - TOKEN: GAS Script Properties

- 将来
  - バックエンドの環境変数から注入できる構造を想定

---

## Data model or state design

### Request payload

```json
{
  "theme": "string",
  "script_tsv": "string",
  "meta": {
    "duration": "string",
    "tone": "string",
    "format_version": "string"
  }
}
```

### Spreadsheet schema (initial)

| Column | Name   | Description   |
| ------ | ------ | ------------- |
| A      | 行番号 | 1始まりの連番 |
| B      | 話者   | 霊夢 / 魔理沙 |
| C      | セリフ | 発話内容      |

将来、D列以降に追加可能な余地を残す。

---

## Risks / 懸念点

- GAS の Webhook は HTTP ステータス制御が限定的
- TSV フォーマットが壊れた場合の検知精度
- シート数が増え続けた場合の管理性
- GAS の実行時間制限に将来的に引っかかる可能性
- 認証がトークン1本のため強固ではない

---

## Open questions / TODO

推測せず、判断が必要な点のみ列挙する。

1. バックエンドの実装言語・フレームワークは何を想定するか
2. AI 台本生成のプロンプトはどこで、どの粒度で管理するか
3. 動画尺と行数の対応ルールを定義するか
4. TSV に含める話者は将来拡張を前提に自由入力を許可するか
5. GAS Webhook のログ保存方針は必要か

---

## Development steps

### Phase 1: 基盤実装

- GAS Webhook の実装
- Script Properties 設定
- 新規シート作成と TSV 書き込み

### Phase 2: バックエンド接続

- AI 台本生成処理の実装
- TSV 整形処理
- GAS Webhook への POST 連携

### Phase 3: 安定化

- エラーハンドリングの整理
- ログの最小実装
- README 整備
