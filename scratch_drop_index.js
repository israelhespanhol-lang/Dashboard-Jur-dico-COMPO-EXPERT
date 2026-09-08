require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const result = await prisma.process.deleteMany({
    where: { processNumber: { startsWith: 'INVALID-' } }
  });
  console.log(`Deleted ${result.count} invalid processes`);
}
main().finally(() => prisma.$disconnect());
