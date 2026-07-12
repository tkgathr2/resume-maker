import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// app/api/admin/cas/route.ts の generateCode と同一仕様（5文字英数小文字）
function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function main() {
  // CA マスタ初期データ
  const cas = ['ホア', 'ライ', 'マヌス'];

  for (const name of cas) {
    const existing = await prisma.cA.findUnique({
      where: { name },
    });

    if (!existing) {
      await prisma.cA.create({
        data: { name, code: generateCode() },
      });
      console.log(`Created CA: ${name}`);
    } else {
      console.log(`CA already exists: ${name}`);
    }
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
