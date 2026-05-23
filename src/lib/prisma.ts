import "dotenv/config";
import pg from "pg";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";

// 1. pgのプールを作成（これがないと動かない）
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. 接続過多を防ぐためのグローバル保存用の設定（Next.jsの必須お作法）
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// 3. すでに接続があればそれを使い、なければ新しく作る
export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

// 4. 開発環境なら、作った接続をグローバルに保存して使い回す
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;