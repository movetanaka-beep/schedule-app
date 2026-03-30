#!/bin/bash
# Prisma マイグレーション デプロイスクリプト
# 初回: ベースラインを適用済みとしてマーク
# 以降: 新しいマイグレーションのみ適用

# _prisma_migrations テーブルが存在しない（初回）場合、
# resolve で0_baselineを「適用済み」にマーク
npx prisma migrate resolve --applied 0_baseline 2>/dev/null

# 未適用のマイグレーションを適用
npx prisma migrate deploy
