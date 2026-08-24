import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { ReservesPage } from '../src/pages/ReservesPage';

const pageSource = readFileSync(
  path.join(process.cwd(), 'src/pages/ReservesPage.tsx'),
  'utf8',
);
const apiSource = readFileSync(
  path.join(process.cwd(), 'src/services/api.ts'),
  'utf8',
);

test('Strategic Reserves page presents the Round 1 real-optimizer demo', () => {
  const markup = renderToStaticMarkup(React.createElement(ReservesPage));

  assert.match(markup, /Strategic Reserves/);
  assert.match(markup, /Round 1 Demo Inputs/);
  assert.match(markup, /DEMO \/ MOCK DATA/);
  assert.match(markup, /Calculating\.\.\.|Run Reserve Optimization/);
  assert.match(markup, /Not live telemetry/);
});

test('Strategic Reserves page renders API-backed result fields and failure handling', () => {
  for (const label of [
    'Effective supply gap',
    'Drawdown amount',
    'Drawdown rate',
    'Duration',
    'Remaining reserve',
    'Replenishment requirement',
    'Fully covered',
    'Reserve optimization failed',
  ]) {
    assert.match(pageSource, new RegExp(label));
  }

  assert.match(pageSource, /optimizeStrategicReserve\(ROUND_ONE_RESERVE_DEMO_INPUT\)/);
  assert.match(apiSource, /\/api\/reserves\/optimize/);
  assert.match(apiSource, /StrategicReserveOptimizationResult/);
});
