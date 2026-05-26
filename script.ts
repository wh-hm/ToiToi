import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("🚀 データベースへの接続テストを開始します...");

  try {
    // ⭕ モデルの形に関係なく、データベースが繋がっているかだけを確かめる魔法のSQL
    const result = await prisma.$queryRaw`SELECT NOW();`;
    console.log("✅ 接続成功！データベースの現在時刻:", result);
  } catch (error) {
    console.error("❌ データベース通信エラー:", error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });