import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- Database Health Check ---');
    
    const volunteers = await prisma.volunteer.findMany();
    console.log(`\nVolunteers found: ${volunteers.length}`);
    volunteers.forEach(v => {
      console.log(`- ${v.username} (DisplayName: ${v.displayName}, isVerified: ${v.isVerified})`);
    });

    const botUsers = await prisma.botUser.findMany();
    console.log(`\nBot Users found: ${botUsers.length}`);
    botUsers.forEach(u => {
      console.log(`- ID: ${u.id} (isAdmin: ${u.isAdmin}, tgId: ${u.telegramId})`);
    });

    const waitingRooms = await prisma.chatRoom.findMany({ where: { status: 'waiting' } });
    console.log(`\nWaiting Chat Rooms: ${waitingRooms.length}`);

  } catch (err) {
    console.error('Error during database check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
