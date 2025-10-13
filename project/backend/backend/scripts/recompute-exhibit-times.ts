import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load env and ensure DATABASE_URL defaults to local SQLite like app.ts
dotenv.config();
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  const defaultDbPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}

const prisma = new PrismaClient();

function computeDurationFromType(exhibitType?: string): number | null {
  const t = (exhibitType || '').toLowerCase().trim();
  if (t === 'interactive') return 6; // Interactive: 6 minutes
  if (t === 'passive' || t === 'observational' || t === 'passive/observational') return 3; // Passive/Observational: 3 minutes
  if (t === 'hands-on' || t === 'hands on' || t === 'handson') return 8; // Hands-on: 8 minutes
  return null;
}

async function main() {
  console.log('🔧 Recomputing exhibit durations based on exhibitType...');
  const exhibits = await prisma.exhibit.findMany();

  let updatedCount = 0;
  let skippedCount = 0;
  let total = exhibits.length;

  for (const ex of exhibits) {
    const computed = computeDurationFromType((ex as any).exhibitType as string | undefined);
    if (computed === null) {
      skippedCount += 1;
      continue;
    }

    const needsUpdate = (ex.duration ?? null) !== computed || (ex.averageTime ?? 0) !== computed;
    if (!needsUpdate) {
      skippedCount += 1;
      continue;
    }

    await prisma.exhibit.update({
      where: { id: ex.id },
      data: { duration: computed, averageTime: computed },
    });
    updatedCount += 1;
  }

  console.log(`✅ Done. Total: ${total}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
}

main()
  .catch((err) => {
    console.error('❌ Recompute failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

