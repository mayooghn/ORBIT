import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { MeasurementGroup, searchDigitalTwinNodes } from '../src/pages/NetworkPage';
import type { DigitalTwinNode } from '../src/digitalTwin/model';

const networkSource = readFileSync(path.join(process.cwd(), 'src/pages/NetworkPage.tsx'), 'utf8');

test('Network page uses business-friendly supply chain terminology', () => {
  assert.match(networkSource, /Supply Chain Network/);
  assert.match(networkSource, /Supply Chain Assets/);
  assert.match(networkSource, /Connections/);
  assert.match(networkSource, /Affected Assets/);
  assert.match(networkSource, /Affected Connections/);
  assert.match(networkSource, /Asset Types/);
  assert.doesNotMatch(networkSource, /Network Topology/);
  assert.doesNotMatch(networkSource, /label="Affected Nodes"/);
  assert.doesNotMatch(networkSource, /label="Affected Edges"/);
});

test('Network impact flow displays verified values, zero, and unavailable data distinctly', () => {
  const verified = renderToStaticMarkup(React.createElement(MeasurementGroup, {
    label: 'Affected Flow',
    summary: { nodeTotals: [{ value: 2445000, unit: 'barrels_per_day' }], edgeTotals: [] },
  }));
  const zero = renderToStaticMarkup(React.createElement(MeasurementGroup, {
    label: 'Affected Flow',
    summary: { nodeTotals: [{ value: 0, unit: 'barrels_per_day' }], edgeTotals: [] },
  }));
  const unavailable = renderToStaticMarkup(React.createElement(MeasurementGroup, {
    label: 'Affected Flow',
    summary: { nodeTotals: [], edgeTotals: [] },
  }));

  assert.match(verified, /(2,445,000|24,45,000) barrels per day/);
  assert.match(zero, /0 barrels per day/);
  assert.match(unavailable, /Not supplied/);
});

test('Digital Twin search filters nodes by canonical name, alias, and asset type', () => {
  const mockNodes: DigitalTwinNode[] = [
    {
      nodeId: 'port-ras-tanura',
      name: 'Ras Tanura',
      nodeType: 'port',
      operationalState: 'operational',
      stateSource: 'BASELINE',
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { latitude: 26.64, longitude: 50.16 },
    },
    {
      nodeId: 'supplier-saudi-arabia',
      name: 'Saudi Arabia',
      nodeType: 'supplier',
      operationalState: 'operational',
      stateSource: 'BASELINE',
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { sourceCountryName: 'Saudi Arabia', countryId: 'SA' },
    },
    {
      nodeId: 'refinery-mangalore',
      name: 'Mangalore Refinery',
      nodeType: 'refinery',
      operationalState: 'reduced',
      stateSource: 'BASELINE',
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { state: 'Karnataka' },
    },
    {
      nodeId: 'chokepoint-hormuz',
      name: 'Strait of Hormuz',
      nodeType: 'chokepoint',
      operationalState: 'disrupted',
      stateSource: 'BASELINE',
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: { latitude: 26.56, longitude: 56.25 },
    },
    {
      nodeId: 'shipping-route-hormuz-india',
      name: 'Shipping Route: Hormuz to India',
      nodeType: 'shipping_route',
      operationalState: 'operational',
      stateSource: 'BASELINE',
      connectedNodeIds: [],
      sourceReferences: [],
      metadata: {},
    },
  ];

  // Search by exact/partial canonical name
  const nameMatches = searchDigitalTwinNodes(mockNodes, 'Ras Tanura');
  assert.equal(nameMatches.length, 1);
  assert.equal(nameMatches[0].nodeId, 'port-ras-tanura');

  // Search by country/alias
  const countryMatches = searchDigitalTwinNodes(mockNodes, 'Saudi');
  assert.equal(countryMatches.length, 1);
  assert.equal(countryMatches[0].nodeId, 'supplier-saudi-arabia');

  // Search by state metadata alias
  const stateMatches = searchDigitalTwinNodes(mockNodes, 'Karnataka');
  assert.equal(stateMatches.length, 1);
  assert.equal(stateMatches[0].nodeId, 'refinery-mangalore');

  // Search by asset type label ("chokepoint")
  const typeMatches = searchDigitalTwinNodes(mockNodes, 'chokepoint');
  assert.equal(typeMatches.length, 1);
  assert.equal(typeMatches[0].nodeId, 'chokepoint-hormuz');

  // Search with no matching query
  const emptyMatches = searchDigitalTwinNodes(mockNodes, 'NonExistentAsset');
  assert.equal(emptyMatches.length, 0);

  // Blank query returns empty list
  const blankMatches = searchDigitalTwinNodes(mockNodes, '   ');
  assert.equal(blankMatches.length, 0);
});
