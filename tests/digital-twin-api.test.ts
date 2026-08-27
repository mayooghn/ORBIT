import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test, { after, before } from 'node:test';
import { createApp } from '../server';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';

const getTestProcessedDir = (): string => {
  const upperData = path.join(process.cwd(), 'Data', 'processed');
  if (existsSync(upperData)) return upperData;
  return path.join(process.cwd(), 'data', 'processed');
};

const processedDir = getTestProcessedDir();
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-digital-twin-api-'));
const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
let database = openPhase2Database({ dbPath: databasePath });
let server: Server;
let baseUrl = '';
let portNodeId = '';

before(async () => {
  importPhase2Data({ dbPath: databasePath, processedDir });
  database.close();
  database = openPhase2Database({ dbPath: databasePath });
  const repository = new Phase2Repository(database);
  const app = createApp(repository);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
  const graphResponse = await fetch(`${baseUrl}/api/digital-twin`);
  const graphBody = await graphResponse.json() as { graph: { nodes: Array<{ nodeId: string; nodeType: string; name: string }> } };
  portNodeId = graphBody.graph.nodes.find((node) => node.nodeType === 'port' && node.name === 'Kochi (Cochin)')?.nodeId || '';
  assert.ok(portNodeId);
});

after(() => {
  server.close();
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('GET /api/digital-twin returns the current real-data graph', async () => {
  const response = await fetch(`${baseUrl}/api/digital-twin`);
  assert.equal(response.status, 200);
  const body = await response.json() as {
    status: string;
    graph: {
      nodes: Array<{
        nodeType: string;
        nodeId: string;
        name: string;
        connectedNodeIds: string[];
        capacity?: { value: number; unit: string };
        currentFlow?: { value: number; unit: string };
        metadata: Record<string, unknown>;
      }>;
      edges: Array<{ edgeId: string; edgeType: string; sourceUrl?: string }>;
    };
  };
  assert.equal(body.status, 'AVAILABLE');
  assert.equal(body.graph.nodes.filter((node) => node.nodeType === 'supplier').length, 52);
  assert.equal(body.graph.nodes.filter((node) => node.nodeType === 'port').length, 13);
  assert.equal(body.graph.nodes.filter((node) => node.nodeType === 'refinery').length, 24);
  assert.equal(body.graph.nodes.filter((node) => node.nodeType === 'shipping_route').length, 6);
  assert.equal(body.graph.nodes.filter((node) => node.nodeType === 'chokepoint').length, 2);
  assert.equal(body.graph.nodes.filter((node) => node.nodeType === 'strategic_reserve').length, 3);
  assert.equal(body.graph.edges.length, 27);
  assert.ok(body.graph.edges.some((edge) => edge.edgeId === 'relationship-hormuz-to-india-facing-route'));
  assert.ok(body.graph.edges.some((edge) => edge.edgeId === 'relationship-port-vishakhapatnam-refinery-hpc-vizag'));
  assert.ok(body.graph.edges.some((edge) => edge.edgeId === 'relationship-hormuz-india-route-to-mumbai-port' && edge.edgeType === 'shipping_route_to_port' && edge.sourceUrl));
  const refinery = body.graph.nodes.find((node) => node.nodeType === 'refinery' && node.name === 'BPC, Kochi');
  const supplier = body.graph.nodes.find((node) => node.nodeType === 'supplier' && node.name === 'Iran');
  const port = body.graph.nodes.find((node) => node.nodeType === 'port' && node.name === 'Kochi (Cochin)');
  assert.equal(refinery?.capacity?.value, 15500);
  assert.equal(refinery?.capacity?.unit, 'thousand_metric_tonnes_per_year');
  assert.equal(supplier?.currentFlow?.value, 2445000);
  assert.equal(port?.currentFlow?.value, 0);
  assert.equal(body.graph.nodes.filter((node) => node.capacity !== undefined).length, 24);
  assert.ok(body.graph.nodes.filter((node) => node.capacity !== undefined).every((node) => node.nodeType === 'refinery'));
  assert.equal(body.graph.nodes.find((node) => node.name === 'CPCL, Cauvery Basin*')?.capacity?.value, 0);
  assert.ok(body.graph.nodes.every((node) => node.connectedNodeIds.length > 0 || node.metadata.sourceBackedOperationalData === true));
});

test('GET /api/scenarios/nodes returns unique selectable Digital Twin nodes', async () => {
  const response = await fetch(`${baseUrl}/api/scenarios/nodes`);
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    nodes: Array<{
      nodeId: string;
      nodeType: string;
      name: string;
      operationalState: string;
      capacity: { value: number; unit: string } | null;
      metadata: Record<string, unknown>;
    }>;
    totals: { total: number; nodeCount: number };
    typeCounts: Record<string, number>;
  };

  assert.equal(body.status, 'AVAILABLE');
  assert.equal(body.totals.total, body.nodes.length);
  assert.equal(body.totals.nodeCount, body.nodes.length);
  assert.equal(new Set(body.nodes.map((node) => node.nodeId)).size, body.nodes.length);
  assert.ok(body.nodes.some((node) => node.nodeId.includes('chokepoint-hormuz')));
  assert.ok(body.nodes.some((node) => node.nodeType === 'port'));
  assert.ok(body.nodes.some((node) => node.nodeType === 'supplier'));
  assert.equal(body.typeCounts.chokepoint, 1);
  assert.equal(body.typeCounts.port, 25);
  assert.equal(body.typeCounts.supplier, 51);
  assert.equal(body.typeCounts.refinery, 0);
  assert.equal(body.typeCounts.shipping_route, 0);
  assert.equal(body.typeCounts.strategic_reserve, 0);
  assert.ok(body.nodes.every((node) => node.nodeId && node.name && node.operationalState && node.metadata));
  assert.equal(Object.values(body.typeCounts).reduce((sum, count) => sum + count, 0), body.nodes.length);

  const graphResponse = await fetch(`${baseUrl}/api/digital-twin`);
  const graphBody = await graphResponse.json() as {
    graph: {
      nodes: Array<{
        nodeId: string;
        metadata: Record<string, unknown>;
        capacity?: { value: number; unit: string };
      }>;
    };
  };
  const sourceNode = graphBody.graph.nodes.find(
    (node) => node.nodeId === 'chokepoint-strait-of-hormuz',
  );
  const listedNode = body.nodes.find(
    (node) => node.nodeId === 'chokepoint-strait-of-hormuz',
  );

  assert.ok(sourceNode);
  assert.ok(listedNode);
  assert.deepEqual(listedNode.metadata, sourceNode.metadata);
  assert.equal(listedNode.capacity, sourceNode.capacity || null);

  const supplierNode = body.nodes.find((node) => node.nodeType === 'supplier');
  assert.ok(supplierNode);
  const simulationResponse = await fetch(`${baseUrl}/api/scenarios/simulate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventId: 'api-supported-supplier-scenario',
      durationDays: 7,
      severity: 'HIGH',
      affectedNodeId: supplierNode.nodeId,
      capacityReductionPercent: 50,
    }),
  });
  assert.equal(simulationResponse.status, 200);
  const simulationBody = await simulationResponse.json() as {
    scenario: { supplyLoss: number; supplyLossUnit: string; alternativeCapacityStatus: string; input: { affectedNodeId: string } };
  };
  assert.equal(simulationBody.scenario.input.affectedNodeId, supplierNode.nodeId);
  assert.ok(simulationBody.scenario.supplyLoss > 0);
  assert.equal(simulationBody.scenario.supplyLossUnit, 'barrels_per_day-days');
  assert.equal(simulationBody.scenario.alternativeCapacityStatus, 'UNAVAILABLE');
});

test('scenario API returns the authoritative deterministic recovery timeline', async () => {
  const response = await fetch(`${baseUrl}/api/scenarios/simulate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventId: 'api-recovery-86-percent',
      durationDays: 14,
      severity: 'HIGH',
      affectedNodeId: 'chokepoint-strait-of-hormuz',
      capacityReductionPercent: 86,
    }),
  });
  assert.equal(response.status, 200);

  const body = await response.json() as {
    status: string;
    scenario: {
      recoveryDays: number;
      recoveryAssumption: string;
      recoveryTimeline: Array<{
        day: number;
        remainingCapacityPercent: number;
      }>;
    };
  };
  const timeline = body.scenario.recoveryTimeline;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  assert.equal(body.status, 'AVAILABLE');
  assert.match(body.scenario.recoveryAssumption, /No source-backed recovery rate/);
  assert.equal(timeline.length, body.scenario.recoveryDays + 1);
  assert.equal(first?.day, 0);
  assert.equal(first?.remainingCapacityPercent, 14);
  assert.equal(last?.day, body.scenario.recoveryDays);
  assert.equal(last?.remainingCapacityPercent, 100);

  for (let index = 1; index < timeline.length; index += 1) {
    assert.ok(
      timeline[index].remainingCapacityPercent >=
        timeline[index - 1].remainingCapacityPercent,
    );
  }

  assert.ok(
    timeline.some(
      (point) =>
        point.day > 14 &&
        point.day < body.scenario.recoveryDays &&
        point.remainingCapacityPercent > 14 &&
        point.remainingCapacityPercent < 100,
    ),
  );
});

test('GET and POST node state use the existing Twin State Engine', async () => {
  const initialResponse = await fetch(`${baseUrl}/api/digital-twin/state/${portNodeId}`);
  assert.equal(initialResponse.status, 200);
  assert.equal((await initialResponse.json() as { state: { operationalState: string } }).state.operationalState, 'operational');

  const updateResponse = await fetch(`${baseUrl}/api/digital-twin/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: portNodeId, state: 'reduced' }) });
  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json() as { state: { nodeId: string; operationalState: string; stateSource: string } };
  assert.deepEqual(updateBody.state, { nodeId: portNodeId, operationalState: 'reduced', stateSource: 'OVERRIDE' });
});

test('state API rejects invalid node IDs and states', async () => {
  const unknownNode = await fetch(`${baseUrl}/api/digital-twin/state/missing-node`);
  assert.equal(unknownNode.status, 404);

  const unknownUpdate = await fetch(`${baseUrl}/api/digital-twin/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: 'missing-node', state: 'blocked' }) });
  assert.equal(unknownUpdate.status, 404);

  const invalidState = await fetch(`${baseUrl}/api/digital-twin/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: portNodeId, state: 'invalid' }) });
  assert.equal(invalidState.status, 400);
});

test('reset and impact APIs return state-engine and impact-engine results', async () => {
  const disrupted = await fetch(`${baseUrl}/api/digital-twin/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: portNodeId, state: 'disrupted' }) });
  assert.equal(disrupted.status, 200);

  const impact = await fetch(`${baseUrl}/api/digital-twin/impact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: portNodeId }) });
  assert.equal(impact.status, 200);
  const impactBody = await impact.json() as { impact: { sourceNode: { nodeId: string; operationalState: string }; affectedNodeIds: string[]; affectedEdgeIds: string[]; affectedFlow: { nodeTotals: Array<{ value: number; unit: string }> } } };
  assert.equal(impactBody.impact.sourceNode.nodeId, portNodeId);
  assert.equal(impactBody.impact.sourceNode.operationalState, 'disrupted');
  assert.deepEqual(impactBody.impact.affectedNodeIds, ['refinery-refinery-ae548d16e9f8e503e505']);
  assert.deepEqual(impactBody.impact.affectedEdgeIds, ['relationship-port-kochi-refinery-bpc']);
  assert.deepEqual(impactBody.impact.affectedFlow.nodeTotals, []);

  const reset = await fetch(`${baseUrl}/api/digital-twin/reset`, { method: 'POST' });
  assert.equal(reset.status, 200);
  const resetBody = await reset.json() as { summary: { nodeCount: number; byState: Record<string, number> }; graph: { nodes: Array<{ nodeId: string; operationalState: string }> } };
  assert.equal(resetBody.summary.nodeCount, resetBody.graph.nodes.length);
  assert.equal(resetBody.summary.byState.operational, resetBody.summary.nodeCount);
});

test('existing Phase 2 API remains functional', async () => {
  const response = await fetch(`${baseUrl}/api/phase2/ports?pageSize=1`);
  assert.equal(response.status, 200);
  const body = await response.json() as { data: unknown[]; pagination: { total: number } };
  assert.equal(body.data.length, 1);
  assert.equal(body.pagination.total, 59);
});

test('GET /api/digital-twin exposes real refinery latitude and longitude coordinates', async () => {
  const response = await fetch(`${baseUrl}/api/digital-twin`);
  assert.equal(response.status, 200);
  const body = await response.json() as {
    graph: {
      nodes: Array<{
        nodeId: string;
        nodeType: string;
        name: string;
        metadata: { latitude?: number | null; longitude?: number | null };
      }>;
    };
  };

  const refineries = body.graph.nodes.filter((n) => n.nodeType === 'refinery');
  assert.equal(refineries.length, 24);

  // All 24 refineries expose non-null numeric latitude/longitude
  for (const ref of refineries) {
    assert.equal(typeof ref.metadata.latitude, 'number');
    assert.equal(typeof ref.metadata.longitude, 'number');
  }

  // Verification records contract check
  const barauni = refineries.find((n) => n.nodeId === 'refinery-refinery-ddcb7bc1d2c3587e0206');
  assert.equal(barauni?.metadata.latitude, 25.3853);
  assert.equal(barauni?.metadata.longitude, 86.0142);

  const paradip = refineries.find((n) => n.nodeId === 'refinery-refinery-d6474b2cf97a887365fc');
  assert.equal(paradip?.metadata.latitude, 20.2881);
  assert.equal(paradip?.metadata.longitude, 86.6192);

  const jamnagar = refineries.find((n) => n.nodeId === 'refinery-refinery-512c57b7cda5c85a0b09');
  assert.equal(jamnagar?.metadata.latitude, 22.3619);
  assert.equal(jamnagar?.metadata.longitude, 69.8319);

  const kochi = refineries.find((n) => n.nodeId === 'refinery-refinery-ae548d16e9f8e503e505');
  assert.equal(kochi?.metadata.latitude, 9.9575);
  assert.equal(kochi?.metadata.longitude, 76.3683);

  const vadinar = refineries.find((n) => n.nodeId === 'refinery-refinery-1e0404fa69bfd51b09d2');
  assert.equal(vadinar?.metadata.latitude, 22.3847);
  assert.equal(vadinar?.metadata.longitude, 69.6961);
});
