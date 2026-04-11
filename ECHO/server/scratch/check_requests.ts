import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching pending chat requests (status: waiting)...');
  
  const waitingRooms = await prisma.chatRoom.findMany({
    where: {
      status: 'waiting'
    },
    include: {
      botUser: true,
      user: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (waitingRooms.length === 0) {
    console.log('\n❌ No pending chat requests found.');
  } else {
    console.log(`\n✅ Found ${waitingRooms.length} pending request(s):\n`);
    
    waitingRooms.forEach((room, index) => {
      console.log(`--- Request #${index + 1} ---`);
      console.log(`ID: ${room.id}`);
      console.log(`Topic: ${room.topic}`);
      console.log(`Mood: ${room.mood}`);
      console.log(`Source: ${room.source}`);
      console.log(`Nickname: ${room.anonNickname}`);
      console.log(`Created At: ${room.createdAt.toLocaleString()}`);
      if (room.botUser) {
        console.log(`Telegram User ID: ${room.botUser.telegramId}`);
      }
      console.log('------------------------\n');
    });
  }
}

main()
  .catch((e) => {
    console.error('Error fetching data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
