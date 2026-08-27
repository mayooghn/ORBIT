import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { MeasurementGroup, searchDigitalTwinNodes, NodeDetails } from '../src/pages/NetworkPage';
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

test('No verification coordinate values are hardcoded in NetworkPage component source', () => {
  assert.doesNotMatch(networkSource, /25\.3853/);
  assert.doesNotMatch(networkSource, /86\.0142/);
  assert.doesNotMatch(networkSource, /20\.2881/);
  assert.doesNotMatch(networkSource, /86\.6192/);
  assert.doesNotMatch(networkSource, /22\.3619/);
  assert.doesNotMatch(networkSource, /69\.8319/);
  assert.doesNotMatch(networkSource, /9\.9575/);
  assert.doesNotMatch(networkSource, /76\.3683/);
  assert.doesNotMatch(networkSource, /22\.3847/);
  assert.doesNotMatch(networkSource, /69\.6961/);
});

test('Digital Twin UI omits missing metrics and reflows gracefully', () => {
  const nodeWithCapacity: DigitalTwinNode = {
    nodeId: 'test-node-1',
    name: 'Test Supplier Alpha',
    nodeType: 'supplier',
    operationalState: 'operational',
    stateSource: 'BASELINE',
    connectedNodeIds: [],
    sourceReferences: [],
    capacity: { value: 5000000, unit: 'tonnes_per_year' },
    metadata: { country: 'Saudi Arabia', risk: 'Low' },
  };

  const nodeWithoutCapacity: DigitalTwinNode = {
    nodeId: 'test-node-2',
    name: 'Test Supplier Beta',
    nodeType: 'supplier',
    operationalState: 'operational',
    stateSource: 'BASELINE',
    connectedNodeIds: [],
    sourceReferences: [],
    metadata: {},
  };

  const nodeWithZeroCapacity: DigitalTwinNode = {
    nodeId: 'test-node-3',
    name: 'Test Supplier Gamma',
    nodeType: 'supplier',
    operationalState: 'operational',
    stateSource: 'BASELINE',
    connectedNodeIds: [],
    sourceReferences: [],
    capacity: { value: 0, unit: 'tonnes_per_year' },
    metadata: {},
  };

  // 1. A node with capacity renders a capacity metric.
  const htmlWithCapacity = renderToStaticMarkup(React.createElement(NodeDetails, {
    node: nodeWithCapacity,
    draftState: 'operational',
    action: null,
    impact: null,
    onDraftState: () => {},
    onUpdate: () => {},
    onImpact: () => {},
  }));
  assert.match(htmlWithCapacity, /Capacity/);
  assert.match(htmlWithCapacity, /5,000,000 tonnes per year/);
  assert.match(htmlWithCapacity, /Country/);
  assert.match(htmlWithCapacity, /Saudi Arabia/);
  assert.match(htmlWithCapacity, /Risk/);
  assert.match(htmlWithCapacity, /Low/);

  // 2. A node without capacity does NOT render a capacity metric.
  // 8. No "N/A", "Not Available", "--", or placeholder metric is rendered for missing optional values.
  const htmlWithoutCapacity = renderToStaticMarkup(React.createElement(NodeDetails, {
    node: nodeWithoutCapacity,
    draftState: 'operational',
    action: null,
    impact: null,
    onDraftState: () => {},
    onUpdate: () => {},
    onImpact: () => {},
  }));
  assert.ok(!htmlWithoutCapacity.includes('Capacity'));
  assert.ok(!htmlWithoutCapacity.includes('Current Flow'));
  assert.ok(!htmlWithoutCapacity.includes('N/A'));
  assert.ok(!htmlWithoutCapacity.includes('Not Available'));
  assert.ok(!htmlWithoutCapacity.includes('Unknown'));
  assert.ok(!htmlWithoutCapacity.includes('--'));

  // 5. A valid numeric value of 0 is still rendered.
  const htmlWithZero = renderToStaticMarkup(React.createElement(NodeDetails, {
    node: nodeWithZeroCapacity,
    draftState: 'operational',
    action: null,
    impact: null,
    onDraftState: () => {},
    onUpdate: () => {},
    onImpact: () => {},
  }));
  assert.match(htmlWithZero, /Capacity/);
  assert.match(htmlWithZero, /0 tonnes per year/);
});
