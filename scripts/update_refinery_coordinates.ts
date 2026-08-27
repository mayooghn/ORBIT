import fs from 'node:fs';
import path from 'node:path';
import { openPhase2Database } from '../src/dataLayer/database';

export const VERIFIED_REFINERY_MAPPINGS: Array<{
  id: string;
  name: string;
  lat: number;
  lon: number;
}> = [
  { id: 'refinery-ddcb7bc1d2c3587e0206', name: 'IOC, Barauni', lat: 25.3853, lon: 86.0142 },
  { id: 'refinery-06fc3ae96e93b92f091f', name: 'IOC, Bongaigaon', lat: 26.5029, lon: 90.5283 },
  { id: 'refinery-16f2ffe2bd625a195145', name: 'IOC, Digboi', lat: 27.3881, lon: 95.6300 },
  { id: 'refinery-1e607de7028b9562ba9d', name: 'IOC, Guwahati', lat: 26.1822, lon: 91.8028 },
  { id: 'refinery-3ebbfa8bfe4fcd853090', name: 'IOC, Haldia', lat: 22.0632, lon: 88.0772 },
  { id: 'refinery-b26a67787b7ad0c1a108', name: 'IOC, Koyali', lat: 22.3653, lon: 73.1306 },
  { id: 'refinery-2ed4022ae8f1fc0df1c3', name: 'IOC, Mathura', lat: 27.3995, lon: 77.7135 },
  { id: 'refinery-6ed0770ba002c7137ead', name: 'IOC, Panipat', lat: 29.4708, lon: 76.8872 },
  { id: 'refinery-d6474b2cf97a887365fc', name: 'IOC, Paradip', lat: 20.2881, lon: 86.6192 },
  { id: 'refinery-9cc2817e0ab3aeb549ae', name: 'HPC, Mumbai', lat: 19.0019, lon: 72.8944 },
  { id: 'refinery-cde3cd0c803ad63da84f', name: 'HPC, Visakh', lat: 17.6942, lon: 83.2562 },
  { id: 'refinery-ae548d16e9f8e503e505', name: 'BPC, Kochi', lat: 9.9575, lon: 76.3683 },
  { id: 'refinery-21447995bc5b82fa88ea', name: 'BPC, Mumbai', lat: 19.0111, lon: 72.8953 },
  { id: 'refinery-760bc08a737c85699337', name: 'CPCL,Manali', lat: 13.1636, lon: 80.2642 },
  { id: 'refinery-5959b4f0d19d5a6cb07e', name: 'CPCL, Cauvery Basin*', lat: 10.8142, lon: 79.7428 },
  { id: 'refinery-2e0d4ad0d99de43e1e73', name: 'MRPL, Mangalore', lat: 12.9897, lon: 74.8322 },
  { id: 'refinery-5f6014c35ffd265194ec', name: 'NRL, Numaligarh', lat: 26.6089, lon: 93.7547 },
  { id: 'refinery-ba7cb7b6fceea313780a', name: 'ONGC, Tatipaka', lat: 16.4853, lon: 81.8683 },
  { id: 'refinery-512c57b7cda5c85a0b09', name: 'RIL, Jamnagar', lat: 22.3619, lon: 69.8319 },
  { id: 'refinery-35e4cb21573bd5398d9a', name: 'RPL (SEZ), Jamnagar', lat: 22.3481, lon: 69.8517 },
  { id: 'refinery-1e0404fa69bfd51b09d2', name: 'NEL, Vadinar', lat: 22.3847, lon: 69.6961 },
  { id: 'refinery-9cf48c80f61769f2b6b0', name: 'HMEL, GGSR', lat: 29.9725, lon: 75.0069 },
  { id: 'refinery-ab5411d899776f49ee1d', name: 'BPC, Bina', lat: 24.2344, lon: 78.1883 },
  { id: 'refinery-f1ae80f51c4b1adb17cf', name: 'HRRL, Pachpadra', lat: 25.8197, lon: 72.2389 },
];

export function applyRefineryCoordinates(): void {
  const mappingMap = new Map(VERIFIED_REFINERY_MAPPINGS.map((m) => [m.id, m]));

  // 1. Update Data/processed/refinery.csv
  const csvPath = path.join(process.cwd(), 'Data', 'processed', 'refinery.csv');
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    if (lines.length > 0) {
      const header = lines[0].trim().split(',');
      const idIdx = header.indexOf('refinery_id');
      const latIdx = header.indexOf('latitude');
      const lonIdx = header.indexOf('longitude');

      if (idIdx !== -1 && latIdx !== -1 && lonIdx !== -1) {
        const updatedLines = lines.map((line, idx) => {
          if (idx === 0 || !line.trim()) return line;
          // Simple CSV parsing preserving quotes
          const fields: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
              inQuotes = !inQuotes;
              current += char;
            } else if (char === ',' && !inQuotes) {
              fields.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current);

          const refineryId = fields[idIdx]?.trim();
          const mapping = mappingMap.get(refineryId);
          if (mapping) {
            fields[latIdx] = String(mapping.lat);
            fields[lonIdx] = String(mapping.lon);
            return fields.join(',');
          }
          return line;
        });

        fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf8');
        console.log('[UPDATE] Data/processed/refinery.csv updated with verified coordinates.');
      }
    }
  }

  // 2. Update SQLite database data/orbit.db
  const db = openPhase2Database();
  const stmt = db.prepare('UPDATE refineries SET latitude = ?, longitude = ? WHERE refinery_id = ?');

  let updatedCount = 0;
  for (const mapping of VERIFIED_REFINERY_MAPPINGS) {
    const result = stmt.run(mapping.lat, mapping.lon, mapping.id);
    if ((result as any).changes > 0) {
      updatedCount += 1;
    }
  }
  console.log(`[UPDATE] Updated ${updatedCount} records in refineries table of data/orbit.db.`);
}

if (process.argv[1]?.includes('update_refinery_coordinates')) {
  applyRefineryCoordinates();
}
