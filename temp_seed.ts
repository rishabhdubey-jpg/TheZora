import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.studio.upsert({
    where: { id: 'demo-studio' },
    update: {},
    create: {
      id: 'demo-studio',
      name: 'Studio Aurora',
      email: 'your-email@example.com',
      plan: 'FREE'
    },
  })
}
main()