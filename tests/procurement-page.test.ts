import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { ProcurementPage } from '../src/pages/ProcurementPage';

const procurementSource = readFileSync(
  path.join(process.cwd(), 'src/pages/ProcurementPage.tsx'),
  'utf8',
);

test('Procurement page presents the adaptive replacement-supply workflow', () => {
  const markup = renderToStaticMarkup(React.createElement(ProcurementPage));

  assert.match(markup, /Adaptive Procurement Orchestrator/);
  assert.match(markup, /Generate Procurement Plan/);
  assert.match(markup, /Scenario supply gap/);
  assert.match(markup, /Demo procurement data/);
});

test('Procurement page renders all optimizer outcome sections and API data states', () => {
  const requiredLabels = [
    'Supply Gap',
    'Procurement Plan',
    'Supplier allocations',
    'Route allocations',
    'Lane allocations',
    'Constraint validation',
    'INFEASIBLE',
    'Verified procurement data is not available for this scenario.',
  ];

  for (const label of requiredLabels) assert.match(procurementSource, new RegExp(label));
  assert.match(procurementSource, /runScenarioProcurement\(/);
  assert.match(procurementSource, /useDemoData/);
  assert.match(procurementSource, /OPTIMAL/);
  assert.match(procurementSource, /Maximum feasible/);
  assert.match(procurementSource, /Unmet quantity/);
});
