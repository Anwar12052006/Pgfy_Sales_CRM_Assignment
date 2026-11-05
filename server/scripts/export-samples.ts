import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { reportService } from '../src/services/report.service.js';
import { prisma } from '../src/config/prisma.js';

async function generateSampleExports() {
  console.log('Generating fresh sample CSV reports from live database...');
  const outDir = path.resolve(process.cwd(), '../sample-exports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const leadsCsv = await reportService.exportLeadsCSV();
  const callsCsv = await reportService.exportCallsCSV();
  const perfCsv = await reportService.exportPerformanceCSV();

  fs.writeFileSync(path.join(outDir, 'leads.csv'), leadsCsv, 'utf8');
  fs.writeFileSync(path.join(outDir, 'all-leads.csv'), leadsCsv, 'utf8');
  fs.writeFileSync(path.join(outDir, 'call-history.csv'), callsCsv, 'utf8');
  fs.writeFileSync(path.join(outDir, 'executive-performance.csv'), perfCsv, 'utf8');

  console.log('✅ Generated sample-exports/leads.csv');
  console.log('✅ Generated sample-exports/call-history.csv');
  console.log('✅ Generated sample-exports/executive-performance.csv');

  await prisma.$disconnect();
}

generateSampleExports().catch((err) => {
  console.error('Error generating sample exports:', err);
  process.exit(1);
});
