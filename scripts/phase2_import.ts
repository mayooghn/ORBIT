import { importPhase2Data } from '../src/dataLayer/importer';

try {
  const result = importPhase2Data();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('[ORBIT Phase 2] Import failed:', error);
  process.exitCode = 1;
}
