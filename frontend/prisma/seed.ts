import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // CA マスタ初期データ
  const cas = ['ホア', 'ライ', 'マヌス'];

  for (const name of cas) {
    const existing = await prisma.cA.findUnique({
      where: { name },
    });

    if (!existing) {
      await prisma.cA.create({
        data: { name },
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
