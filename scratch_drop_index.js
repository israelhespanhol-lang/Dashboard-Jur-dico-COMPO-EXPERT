require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  console.log('Processes:', await prisma.process.count());
  console.log('Movements (DataJud):', await prisma.movement.count());
  console.log('Communications (DJEN):', await prisma.communication.count());
}
main().finally(() => prisma.$disconnect());
