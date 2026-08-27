import { openPhase2Database } from '../src/dataLayer/database';
import { VERIFIED_REFINERY_MAPPINGS } from './update_refinery_coordinates';

export function runValidation(): void {
  const db = openPhase2Database();
  const allRefineries = db.prepare('SELECT * FROM refineries').all() as any[];

  console.log('--- VALIDATION CHECK 1: Total Record Count ---');
  console.log(`Total refinery records in database: ${allRefineries.length}`);
  if (allRefineries.length !== 24) {
    throw new Error(`FAIL: Record count expected 24, found ${allRefineries.length}`);
  }
  console.log('PASS: Total refinery count is exactly 24.');

  console.log('\n--- VALIDATION CHECK 2: Verified Lat/Lon Mappings ---');
  const mappingMap = new Map(VERIFIED_REFINERY_MAPPINGS.map((m) => [m.id, m]));
  let matchedCount = 0;

  for (const ref of allRefineries) {
    const mapping = mappingMap.get(ref.refinery_id);
    if (!mapping) {
      throw new Error(`FAIL: Unexpected refinery ID in database: ${ref.refinery_id}`);
    }
    const latMatch = Math.abs(Number(ref.latitude) - mapping.lat) < 0.0001;
    const lonMatch = Math.abs(Number(ref.longitude) - mapping.lon) < 0.0001;

    if (!latMatch || !lonMatch) {
      throw new Error(
        `FAIL: Mismatch for ${ref.refinery_id} (${ref.refinery_name}). DB: lat=${ref.latitude}, lon=${ref.longitude} | Expected: lat=${mapping.lat}, lon=${mapping.lon}`
      );
    }
    matchedCount += 1;
    console.log(
      `✓ [${ref.refinery_id}] ${ref.refinery_name} -> Lat: ${ref.latitude}, Lon: ${ref.longitude}`
    );
  }
  console.log(`PASS: All ${matchedCount}/24 records match verified coordinates exactly.`);

  console.log('\n--- VALIDATION CHECK 3: Confirm ONGC Hazira Not Inserted ---');
  const hazira = allRefineries.find(
    (r) =>
      r.refinery_name.toLowerCase().includes('hazira') ||
      r.source_refinery_name.toLowerCase().includes('hazira')
  );
  if (hazira) {
    throw new Error('FAIL: ONGC Hazira was found in refineries table!');
  }
  console.log('PASS: ONGC Hazira was not inserted.');

  console.log('\n--- VALIDATION CHECK 4: Confirm IOC Chennai Not Inserted ---');
  const iocChennai = allRefineries.find(
    (r) =>
      r.refinery_name.toLowerCase().includes('ioc chennai') ||
      r.source_refinery_name.toLowerCase().includes('ioc chennai')
  );
  if (iocChennai) {
    throw new Error('FAIL: IOC Chennai was found in refineries table!');
  }
  console.log('PASS: IOC Chennai was not inserted.');

  console.log('\n==========================================');
  console.log('ALL 5 VALIDATION CHECKS PASSED SUCCESSFULLY!');
  console.log('==========================================');
}

if (process.argv[1]?.includes('verify_refinery_coordinates')) {
  runValidation();
}
