// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Michael',
      phoneNumber: '+1234567890',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+1987654321',
    },
  });

  // Create sample posts
  await prisma.post.upsert({
    where: { id: 'post-1' },
    update: {},
    create: {
      id: 'post-1',
      title: 'Welcome to Fusee Backend Grid',
      content: 'This is the first post in our amazing backend system!',
      published: true,
      authorId: user1.id,
    },
  });

  await prisma.post.upsert({
    where: { id: 'post-2' },
    update: {},
    create: {
      id: 'post-2',
      title: 'Getting Started with Prisma',
      content: 'Learn how to use Prisma with PostgreSQL in your Node.js applications.',
      published: true,
      authorId: user2.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log('Created users:', { user1, user2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
