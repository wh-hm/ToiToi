import { PrismaClient } from '@prisma/client'

// 既に接続がある場合はそれを使い、なければ新しく作る（接続過多防止）
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // 実行されたSQLがターミナルで見れるようになるので便利！
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma