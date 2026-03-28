import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

// 遅延初期化: ビルド時にDB接続を試みないようにする
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = new PrismaClient();
    }
    return (globalForPrisma._prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
