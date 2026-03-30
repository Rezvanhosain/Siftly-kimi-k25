const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVideos() {
  const videos = await prisma.mediaItem.findMany({
    where: { type: 'video' },
    select: { url: true, thumbnailUrl: true },
    take: 5
  });
  console.log('Sample video URLs:');
  videos.forEach((v, i) => {
    console.log(`\n${i + 1}. URL: ${v.url}`);
    console.log(`   Thumbnail: ${v.thumbnailUrl || 'NULL'}`);
  });
  await prisma.$disconnect();
}
checkVideos();
