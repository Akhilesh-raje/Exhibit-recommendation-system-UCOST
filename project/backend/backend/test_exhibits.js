const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Listing existing exhibits...');
    const before = await prisma.exhibit.findMany();
    console.log('Count before:', before.length);

    console.log('Creating a test exhibit...');
    const created = await prisma.exhibit.create({
      data: {
        name: 'Debug Exhibit',
        description: 'Inserted via test_exhibits.js',
        isActive: true,
        images: JSON.stringify([]),
        interactiveFeatures: JSON.stringify([]),
      }
    });
    console.log('Created ID:', created.id);

    const after = await prisma.exhibit.findMany();
    console.log('Count after:', after.length);
    console.log('Last exhibit:', after[0] || null);
  } catch (err) {
    console.error('Error running test_exhibits:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

