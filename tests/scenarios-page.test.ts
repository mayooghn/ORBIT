import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const scenariosPageSource = readFileSync(
  path.join(process.cwd(), 'src/pages/ScenariosPage.tsx'),
  'utf8',
);

test('Scenario Studio loads its affected-node selector from the Digital Twin endpoint', () => {
  assert.match(scenariosPageSource, /\/api\/scenarios\/nodes/);
  assert.match(scenariosPageSource, /response\.text\(\)/);
  assert.match(scenariosPageSource, /content-type/);
  assert.match(scenariosPageSource, /invalid JSON/);
  assert.match(scenariosPageSource, /empty response/);
  assert.match(scenariosPageSource, /<optgroup/);
  assert.match(scenariosPageSource, /Loading supply chain assets/);
  assert.match(scenariosPageSource, /No scenario-selectable supply chain assets are available/);
  assert.match(scenariosPageSource, /role="alert"/);
  assert.match(scenariosPageSource, /chokepoint-strait-of-hormuz/);
  assert.match(scenariosPageSource, /Not available/);
  assert.match(scenariosPageSource, /No verified data/);
  assert.match(scenariosPageSource, /recoveryAssumption/);
  assert.match(scenariosPageSource, /result\.recoveryTimeline\.map/);
  assert.match(scenariosPageSource, /point\.remainingCapacityPercent/);
  assert.doesNotMatch(scenariosPageSource, /calculateRecoveryDays/);
  assert.doesNotMatch(scenariosPageSource, /buildRecoveryTimeline/);
  assert.doesNotMatch(scenariosPageSource, /Alternative capacity: Not verified/);
  assert.doesNotMatch(scenariosPageSource, /Alternative capacity is unavailable for this node/);
  assert.doesNotMatch(scenariosPageSource, /border-amber/);
  assert.doesNotMatch(scenariosPageSource, /Strait of Hormuz/);
});
