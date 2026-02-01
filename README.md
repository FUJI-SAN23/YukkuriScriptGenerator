# Yukkuri Script Generator → Google Sheets Writer

## 概要

ゆっくり動画向けの会話台本を TSV 形式で受け取り、Google Apps Script の Webhook 経由で
スプレッドシートに自動書き込みするための最小構成ツールです。動画1本ごとに新規シートを作成し、
行番号・話者・セリフの形で整理された台本を保存します。

## できること

- テーマから会話形式の台本（TSV）を生成する
- Google Apps Script 経由でスプレッドシートに書き込む
- 動画1本ごとに新規シートを自動作成する

## ディレクトリ構成

- `apps-script/` : GAS Webhook 実装
- `backend/` : FastAPI の台本生成 API（Gemini 対応）

## はじめに（最短手順）

1. `apps-script/README.md` を読み、GAS をデプロイする
2. `backend/README.md` を読み、ローカルで API を起動する
3. `/generate` の結果 TSV を Webhook に送信する（手動 or 将来連携）

## ドキュメント

- Apps Script: `apps-script/README.md`
- Backend (FastAPI): `backend/README.md`

## スコープと注意点

- ユーザー管理や高度な認証は対象外（最小構成）
- 台本の編集 UI やプレビュー UI は含まない
- 秘密情報（API キーやトークン）はリポジトリに保存しない

## 開発の進め方

- Phase 1: GAS Webhook の基盤実装（完了）
- Phase 2: バックエンド接続（現在進行中）
- Phase 3: 安定化（ログ最小実装は対応済み）
