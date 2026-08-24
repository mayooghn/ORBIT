import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { buildDigitalTwinFromPhase2 } from '../src/digitalTwin/fromPhase2';
import { DigitalTwinImpactAnalyzer } from '../src/digitalTwin/impact';
import { DigitalTwinGraphModel } from '../src/digitalTwin/model';
import { DigitalTwinStateEngine } from '../src/digitalTwin/state';

test('Digital Twin graph stores node states, edges, and connected nodes', () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: 'supplier-1', nodeType: 'supplier', name: 'Supplier', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addNode({ nodeId: 'route-1', nodeType: 'shipping_route', name: 'Route', operationalState: 'reduced', stateSource: 'OBSERVED', sourceReferences: [] });
  model.addEdge({ edgeId: 'edge-1', edgeType: 'supplier_to_shipping_route', fromNodeId: 'supplier-1', toNodeId: 'route-1', sourceReferences: [], evidence: 'Test edge evidence', notes: 'Test edge notes', confidence: 1 });

  assert.equal(model.getNode('route-1')?.operationalState, 'reduced');
  assert.deepEqual(model.getNode('supplier-1')?.connectedNodeIds, ['route-1']);
  assert.deepEqual(model.getNode('route-1')?.connectedNodeIds, ['supplier-1']);
  assert.equal(model.snapshot().edges.length, 1);

  model.updateNodeState('route-1', 'blocked');
  assert.equal(model.getNode('route-1')?.operationalState, 'blocked');
});

test('retaining Digital Twin nodes removes orphaned edges and connections', () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: 'supplier-1', nodeType: 'supplier', name: 'Supplier', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addNode({ nodeId: 'route-1', nodeType: 'shipping_route', name: 'Route', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addEdge({ edgeId: 'edge-1', edgeType: 'supplier_to_shipping_route', fromNodeId: 'supplier-1', toNodeId: 'route-1', sourceReferences: [], evidence: 'Test edge evidence', notes: 'Test edge notes', confidence: 1 });

  model.retainNodes((node) => node.nodeId === 'route-1');

  assert.deepEqual(model.getNodes().map((node) => node.nodeId), ['route-1']);
  assert.deepEqual(model.getNodes()[0]?.connectedNodeIds, []);
  assert.deepEqual(model.getEdges(), []);
});

test('Digital Twin adapter loads real Phase 2 nodes without inventing relationships', () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-digital-twin-'));
  const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
  const processedDir = path.join(process.cwd(), 'data', 'processed');
  let database = openPhase2Database({ dbPath: databasePath });
  try {
    importPhase2Data({ dbPath: databasePath, processedDir });
    database.close();
    database = openPhase2Database({ dbPath: databasePath });
    const repository = new Phase2Repository(database);
    const phase2Before = {
      ports: JSON.stringify(repository.getPorts({ pageSize: 1000 }).data),
      refineries: JSON.stringify(repository.getRefineries({ pageSize: 1000 }).data),
    };
    const graph = buildDigitalTwinFromPhase2(repository).snapshot();

    assert.equal(graph.nodes.filter((node) => node.nodeType === 'port').length, 27);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'refinery').length, 24);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'refinery' && node.nodeId === 'refinery-refinery-cde3cd0c803ad63da84f').length, 1);
    assert.equal(graph.nodes.some((node) => node.nodeId === 'refinery-hpcl-vizag'), false);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'supplier').length, 52);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'shipping_route').length, 3);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'chokepoint').length, 2);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'strategic_reserve').length, 3);
    assert.ok(graph.nodes.every((node) => node.operationalState === 'operational'));
    assert.ok(graph.nodes.some((node) => node.nodeType === 'refinery' && node.capacity?.value === 650));
    const capacityNodes = graph.nodes.filter((node) => node.capacity !== undefined);
    assert.equal(capacityNodes.length, 24);
    assert.ok(capacityNodes.every((node) => node.nodeType === 'refinery'));
    assert.equal(graph.nodes.find((node) => node.name === 'CPCL, Cauvery Basin*')?.capacity?.value, 0);
    assert.equal(graph.nodes.some((node) => node.name === 'Azhikal (Azhikkal)'), false);
    assert.ok(graph.nodes.some((node) => node.name === 'Kochi (Cochin)'));
    assert.ok(graph.nodes.some((node) => node.name === 'Iran'));
    assert.ok(capacityNodes.every((node) => node.sourceReferences.some((reference) => reference.table === 'refineries')));
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'supplier' && node.capacity !== undefined).length, 0);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'port' && node.capacity !== undefined).length, 0);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'shipping_route' && node.capacity !== undefined).length, 0);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'strategic_reserve' && node.capacity !== undefined).length, 0);
    assert.equal(graph.nodes.filter((node) => node.nodeType === 'chokepoint' && node.capacity !== undefined).length, 0);
    const iran = graph.nodes.find((node) => node.nodeType === 'supplier' && node.name === 'Iran');
    assert.equal(iran?.currentFlow?.value, 2445000);
    assert.equal(iran?.currentFlow?.unit, 'barrels_per_day');
    const kochi = graph.nodes.find((node) => node.name === 'Kochi (Cochin)');
    assert.equal(kochi?.currentFlow?.value, 0);
    assert.equal(kochi?.metadata.currentFlowUnitStatus, 'UNDOCUMENTED');
    assert.ok(graph.nodes.every((node) => node.connectedNodeIds.length > 0 || node.metadata.sourceBackedOperationalData === true));
    assert.equal(graph.nodes.some((node) => node.nodeId.startsWith('shipping-route-shipping-lane-')), false);
    assert.equal(graph.edges.length, 27);
    assert.ok(graph.edges.every((edge) => graph.nodes.some((node) => node.nodeId === edge.fromNodeId) && graph.nodes.some((node) => node.nodeId === edge.toNodeId)));
    assert.equal(new Set(graph.edges.map((edge) => edge.edgeId)).size, graph.edges.length);
    assert.ok(graph.edges.every((edge) => edge.sourceReferences.length >= 1 && edge.evidence && edge.notes && edge.confidence > 0));
    const enrichedEdges = graph.edges.filter((edge) => edge.sourceUrl);
    assert.equal(enrichedEdges.length, 23);
    assert.ok(enrichedEdges.every((edge) => edge.sourceUrl && edge.sourceOrganization));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-kochi-refinery-bpc'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-new-mangalore-refinery-mrpl'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-paradip-refinery-ioc'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-vadinar-refinery-nel'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-paradip-refinery-ioc-haldia'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-mundra-refinery-ioc-panipat'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-vadinar-refinery-ioc-koyali'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-sikka-refinery-ril-jamnagar'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-haldia-refinery-ioc-haldia'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-port-vishakhapatnam-refinery-hpc-vizag'));
    assert.equal(graph.edges.filter((edge) => edge.edgeType === 'shipping_route_to_port').length, 2);
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-hormuz-india-route-to-mumbai-port'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-hormuz-india-route-to-vadinar-port'));
    const saudiNode = graph.nodes.find((node) => node.nodeType === 'supplier' && node.name === 'Saudi Arabia');
    assert.ok(saudiNode);
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-supplier-saudi-arabia-hormuz-route'));
    assert.ok(graph.edges.some((edge) => edge.edgeId === 'relationship-hormuz-route-to-chokepoint'));
    const connectedPath = [
      saudiNode.nodeId,
      'shipping-route-persian-gulf-hormuz-arabian-sea',
      'chokepoint-strait-of-hormuz',
      'shipping-route-hormuz-india',
      'port-port-42e3af128436239dad1c',
      'refinery-refinery-b26a67787b7ad0c1a108',
    ];
    for (let index = 0; index < connectedPath.length - 1; index += 1) {
      assert.ok(graph.edges.some((edge) =>
        (edge.fromNodeId === connectedPath[index] && edge.toNodeId === connectedPath[index + 1]) ||
        (edge.fromNodeId === connectedPath[index + 1] && edge.toNodeId === connectedPath[index]),
      ));
    }
    const realStateEngine = new DigitalTwinStateEngine(graph);
    realStateEngine.updateNodeState(saudiNode.nodeId, 'disrupted');
    const realImpact = new DigitalTwinImpactAnalyzer(realStateEngine).analyzeNode(saudiNode.nodeId);
    assert.ok(realImpact.affectedNodeIds.includes('chokepoint-strait-of-hormuz'));
    assert.ok(realImpact.affectedNodeIds.includes('shipping-route-hormuz-india'));
    assert.ok(realImpact.affectedNodeIds.includes('port-port-42e3af128436239dad1c'));
    assert.ok(realImpact.affectedNodeIds.includes('refinery-refinery-b26a67787b7ad0c1a108'));
    assert.ok(realImpact.affectedEdgeIds.includes('relationship-hormuz-to-india-facing-route'));
    const reserveEngine = new DigitalTwinStateEngine(graph);
    reserveEngine.updateNodeState('strategic-reserve-isprl-mangalore', 'disrupted');
    const reserveImpact = new DigitalTwinImpactAnalyzer(reserveEngine).analyzeNode('strategic-reserve-isprl-mangalore');
    assert.ok(reserveImpact.affectedNodeIds.includes('refinery-refinery-2e0d4ad0d99de43e1e73'));
    assert.deepEqual(graph, buildDigitalTwinFromPhase2(repository).snapshot());
    assert.equal(JSON.stringify(repository.getPorts({ pageSize: 1000 }).data), phase2Before.ports);
    assert.equal(JSON.stringify(repository.getRefineries({ pageSize: 1000 }).data), phase2Before.refineries);
  } finally {
    database.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

const createStateTestGraph = () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: 'supplier-1', nodeType: 'supplier', name: 'Supplier', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addNode({ nodeId: 'route-1', nodeType: 'shipping_route', name: 'Route', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addEdge({ edgeId: 'edge-1', edgeType: 'supplier_to_shipping_route', fromNodeId: 'supplier-1', toNodeId: 'route-1', sourceReferences: [], evidence: 'Test edge evidence', notes: 'Test edge notes', confidence: 1 });
  return model.snapshot();
};

test('Digital Twin state engine starts from the baseline state', () => {
  const engine = new DigitalTwinStateEngine(createStateTestGraph());
  assert.deepEqual(engine.getCurrentNodeState('supplier-1'), { nodeId: 'supplier-1', operationalState: 'operational', stateSource: 'BASELINE' });
  assert.equal(engine.getCurrentTwin().edges.length, 1);
});

test('Digital Twin state engine accepts valid state updates', () => {
  const engine = new DigitalTwinStateEngine(createStateTestGraph());
  assert.deepEqual(engine.updateNodeState('supplier-1', 'disrupted'), { nodeId: 'supplier-1', operationalState: 'disrupted', stateSource: 'OVERRIDE' });
  assert.equal(engine.getCurrentNodeState('supplier-1').operationalState, 'disrupted');
});

test('Digital Twin state engine rejects invalid node IDs and states', () => {
  const engine = new DigitalTwinStateEngine(createStateTestGraph());
  assert.throws(() => engine.getCurrentNodeState('missing-node'), /node not found/);
  assert.throws(() => engine.updateNodeState('missing-node', 'blocked'), /node not found/);
  assert.throws(() => engine.updateNodeState('supplier-1', 'invalid' as 'operational'), /Invalid Digital Twin operational state/);
});

test('Digital Twin state reset restores baseline without mutating the source graph', () => {
  const sourceGraph = createStateTestGraph();
  const sourceBeforeUpdate = JSON.stringify(sourceGraph);
  const engine = new DigitalTwinStateEngine(sourceGraph);

  engine.updateNodeState('route-1', 'blocked');
  assert.equal(engine.getCurrentNodeState('route-1').operationalState, 'blocked');
  const resetGraph = engine.resetToBaseline();

  assert.equal(resetGraph.nodes.find((node) => node.nodeId === 'route-1')?.operationalState, 'operational');
  assert.equal(resetGraph.nodes.find((node) => node.nodeId === 'route-1')?.stateSource, 'BASELINE');
  assert.equal(JSON.stringify(sourceGraph), sourceBeforeUpdate);
  assert.deepEqual(resetGraph.edges, sourceGraph.edges);
});

const createImpactTestGraph = () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: 'supplier-1', nodeType: 'supplier', name: 'Supplier', capacity: { value: 100, unit: 'tonnes_per_year' }, currentFlow: { value: 60, unit: 'tonnes_per_day' }, operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addNode({ nodeId: 'route-1', nodeType: 'shipping_route', name: 'Route', capacity: { value: 80, unit: 'tonnes_per_day' }, currentFlow: { value: 40, unit: 'tonnes_per_day' }, operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addNode({ nodeId: 'port-1', nodeType: 'port', name: 'Port', capacity: { value: 50, unit: 'tonnes_per_day' }, currentFlow: { value: 30, unit: 'tonnes_per_day' }, operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addNode({ nodeId: 'refinery-1', nodeType: 'refinery', name: 'Refinery', capacity: { value: 25, unit: 'tonnes_per_day' }, currentFlow: { value: 20, unit: 'tonnes_per_day' }, operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addEdge({ edgeId: 'edge-1', edgeType: 'supplier_to_shipping_route', fromNodeId: 'supplier-1', toNodeId: 'route-1', capacity: { value: 80, unit: 'tonnes_per_day' }, currentFlow: { value: 40, unit: 'tonnes_per_day' }, sourceReferences: [], evidence: 'Test edge evidence', notes: 'Test edge notes', confidence: 1 });
  model.addEdge({ edgeId: 'edge-2', edgeType: 'shipping_route_to_port', fromNodeId: 'route-1', toNodeId: 'port-1', capacity: { value: 70, unit: 'tonnes_per_day' }, currentFlow: { value: 35, unit: 'tonnes_per_day' }, sourceReferences: [], evidence: 'Test edge evidence', notes: 'Test edge notes', confidence: 1 });
  model.addEdge({ edgeId: 'edge-3', edgeType: 'port_to_refinery', fromNodeId: 'port-1', toNodeId: 'refinery-1', capacity: { value: 50, unit: 'tonnes_per_day' }, currentFlow: { value: 20, unit: 'tonnes_per_day' }, sourceReferences: [], evidence: 'Test edge evidence', notes: 'Test edge notes', confidence: 1 });
  model.addNode({ nodeId: 'isolated-1', nodeType: 'chokepoint', name: 'Isolated', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  return model.snapshot();
};

test('Digital Twin disruption analysis reports connected and downstream impact', () => {
  const sourceGraph = createImpactTestGraph();
  const stateEngine = new DigitalTwinStateEngine(sourceGraph);
  stateEngine.updateNodeState('route-1', 'disrupted');
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode('route-1');

  assert.equal(result.sourceNode.operationalState, 'disrupted');
  assert.deepEqual(result.affectedNodeIds, ['port-1', 'refinery-1', 'supplier-1']);
  assert.deepEqual(result.affectedEdgeIds, ['edge-1', 'edge-2', 'edge-3']);
  assert.deepEqual(result.affectedNodeTypes, ['port', 'refinery', 'supplier']);
  assert.deepEqual(result.affectedCapacity.nodeTotals, [{ value: 75, unit: 'tonnes_per_day' }, { value: 100, unit: 'tonnes_per_year' }]);
  assert.deepEqual(result.affectedFlow.nodeTotals, [{ value: 150, unit: 'tonnes_per_day' }]);
  assert.deepEqual(result.affectedFlow.edgeTotals, [{ value: 95, unit: 'tonnes_per_day' }]);
});

test('Digital Twin impact preserves verified direct flow, including zero', () => {
  const model = new DigitalTwinGraphModel();
  model.addNode({ nodeId: 'source-1', nodeType: 'supplier', name: 'Source', currentFlow: { value: 0, unit: 'barrels_per_day' }, operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [{ table: 'global_oil_snapshots', id: 'snapshot-1' }] });
  model.addNode({ nodeId: 'destination-1', nodeType: 'port', name: 'Destination', operationalState: 'operational', stateSource: 'BASELINE', sourceReferences: [] });
  model.addEdge({ edgeId: 'edge-1', edgeType: 'supplier_to_shipping_route', fromNodeId: 'source-1', toNodeId: 'destination-1', sourceReferences: [], evidence: 'Verified source relationship', notes: 'No edge flow inferred.', confidence: 1 });

  const stateEngine = new DigitalTwinStateEngine(model.snapshot());
  stateEngine.updateNodeState('source-1', 'disrupted');
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode('source-1');

  assert.deepEqual(result.affectedFlow.nodeTotals, [{ value: 0, unit: 'barrels_per_day' }]);
});

test('Digital Twin blocked-node analysis includes affected incident edges', () => {
  const stateEngine = new DigitalTwinStateEngine(createImpactTestGraph());
  stateEngine.updateNodeState('port-1', 'blocked');
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode('port-1');

  assert.deepEqual(result.affectedNodeIds, ['refinery-1', 'route-1']);
  assert.deepEqual(result.affectedEdgeIds, ['edge-2', 'edge-3']);
});

test('Digital Twin impact analysis returns no impact for an isolated disrupted node', () => {
  const stateEngine = new DigitalTwinStateEngine(createImpactTestGraph());
  stateEngine.updateNodeState('isolated-1', 'disrupted');
  const result = new DigitalTwinImpactAnalyzer(stateEngine).analyzeNode('isolated-1');

  assert.deepEqual(result.affectedNodeIds, []);
  assert.deepEqual(result.affectedEdgeIds, []);
  assert.deepEqual(result.affectedCapacity, { nodeTotals: [], edgeTotals: [] });
  assert.deepEqual(result.affectedFlow, { nodeTotals: [], edgeTotals: [] });
});

test('Digital Twin impact analysis rejects nonexistent nodes and analyzes current state deterministically', () => {
  const sourceGraph = createImpactTestGraph();
  const stateEngine = new DigitalTwinStateEngine(sourceGraph);
  const analyzer = new DigitalTwinImpactAnalyzer(stateEngine);
  assert.throws(() => analyzer.analyzeNode('missing-node'), /node not found/);

  stateEngine.updateNodeState('route-1', 'blocked');
  stateEngine.updateNodeState('isolated-1', 'disrupted');
  const first = analyzer.analyzeCurrentState();
  const second = analyzer.analyzeCurrentState();
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(sourceGraph), JSON.stringify(createImpactTestGraph()));
});
