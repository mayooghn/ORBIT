import assert from 'node:assert/strict';
import test from 'node:test';
import { openPhase2Database, defaultPhase2DbPath } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';
import { createDigitalTwinRuntime } from '../src/digitalTwin/runtime';
import {
  RealScenarioProcurementDataProvider,
  optimizeProcurement,
} from '../src/procurement';

const dbPath = defaultPhase2DbPath();
importPhase2Data({ dbPath, processedDir: './Data/processed' });
const database = openPhase2Database({ dbPath });
const repository = new Phase2Repository(database);
const runtime = createDigitalTwinRuntime(repository);

test('Strait of Hormuz physical route dependency validation under 100% total blockade', async () => {
  const provider = new RealScenarioProcurementDataProvider(repository);

  // Construct a robust mock ScenarioResult representing a total Hormuz blockade
  const mockScenario = {
    scenarioId: 'mock-hormuz-blockade-test',
    input: {
      eventId: 'hormuz-blockade',
      durationDays: 30,
      severity: 'CRITICAL',
      affectedNodeId: 'chokepoint-strait-of-hormuz',
      capacityReductionPercent: 100, // 100% complete blockade
    },
    supplyLoss: 3000000,
    supplyLossUnit: 'tonnes',
    affectedRoutes: [],
    affectedPorts: [],
    affectedRefineries: [],
    alternativeCapacity: 0,
    alternativeCapacityUnit: 'tonnes',
    alternativeCapacitySource: 'mock',
    alternativeCapacityStatus: 'UNAVAILABLE',
    shortage: 3000000,
    shortageUnit: 'tonnes',
    recoveryDays: 60,
  } as any;

  const resolution = provider.resolve({
    scenario: mockScenario,
    graph: runtime.stateEngine.getCurrentTwin(),
  });

  assert.equal(resolution.status, 'AVAILABLE');

  if (resolution.status === 'AVAILABLE') {
    const { suppliers, routes, lanes } = resolution.data;

    // A. Verify that Persian Gulf exporters are flagged as physically Hormuz-dependent and therefore compatible: false
    const PG_SUPPLIERS = ['saudi', 'iraq', 'iran', 'kuwait', 'qatar', 'emirates'];
    
    for (const pgName of PG_SUPPLIERS) {
      const supplier = suppliers.find((s) => s.name.toLowerCase().includes(pgName));
      if (supplier) {
        // Find lanes for this supplier
        const supplierLanes = lanes.filter((l) => l.supplierId === supplier.supplierId);
        
        // Under a total blockade, ALL Middle East and General routes for a Persian Gulf supplier MUST be compatible: false
        for (const lane of supplierLanes) {
          assert.equal(
            lane.compatible,
            false,
            `Lane ${lane.laneId} for Persian Gulf supplier ${supplier.name} must be inactive under total Hormuz blockade`
          );
        }
      }
    }

    // B. Verify that Russia remains eligible (independent of Hormuz)
    const russiaSupplier = suppliers.find((s) => s.name.toLowerCase().includes('russia'));
    assert.ok(russiaSupplier, 'Russia alternative supplier should exist');
    const russiaLanes = lanes.filter((l) => l.supplierId === russiaSupplier.supplierId);
    assert.ok(russiaLanes.length > 0, 'Russia should have routing lanes');
    
    for (const lane of russiaLanes) {
      assert.equal(
        lane.compatible,
        true,
        `Russia lane ${lane.laneId} must remain compatible/active during Hormuz blockade`
      );
    }

    // C. Verify that Oman remains independent of Hormuz for the generic corridor
    const omanSupplier = suppliers.find((s) => s.name.toLowerCase().includes('oman'));
    if (omanSupplier) {
      const omanLanes = lanes.filter((l) => l.supplierId === omanSupplier.supplierId);
      
      // Lanes using the specific Hormuz routes should be compatible: false
      const specificHormuzLanes = omanLanes.filter(
        (l) => l.routeId === 'shipping-route-hormuz-india' || l.routeId === 'shipping-route-persian-gulf-hormuz-arabian-sea'
      );
      for (const l of specificHormuzLanes) {
        assert.equal(l.compatible, false, `Oman lane on specific Hormuz route ${l.routeId} must be blocked`);
      }

      // Oman lane using the generic corridor (Major Global Maritime Shipping Corridor) must remain compatible: true
      const generalCorridorLane = omanLanes.find(
        (l) => l.routeId === 'shipping-route-shipping-lane-b3f78c886f6e22a23bbf'
      );
      if (generalCorridorLane) {
        assert.equal(
          generalCorridorLane.compatible,
          true,
          'Oman lane on Major Global Maritime Shipping Corridor must remain compatible during Hormuz blockade'
        );
      }
    }

    // D. Run optimizer over these resolved lanes and check that absolutely no Persian Gulf allocations occur
    const result = await optimizeProcurement({
      supplyGap: { quantity: mockScenario.shortage, unit: mockScenario.shortageUnit },
      suppliers,
      routes,
      lanes,
    });

    // Verify no allocation > 0 is made to any Persian Gulf supplier
    for (const allocation of result.allocations) {
      if (allocation.quantity > 0) {
        const allocSupplier = suppliers.find((s) => s.supplierId === allocation.supplierId);
        if (allocSupplier) {
          const nameLower = allocSupplier.name.toLowerCase();
          const isPG = PG_SUPPLIERS.some((pg) => nameLower.includes(pg));
          assert.equal(
            isPG,
            false,
            `The solver must not allocate quantity to physically blocked Persian Gulf supplier: ${allocSupplier.name}`
          );
        }
      }
    }
  }
});

test('Strait of Hormuz physical route dependency validation under 50% partial disruption', () => {
  const provider = new RealScenarioProcurementDataProvider(repository);

  // Construct a robust mock ScenarioResult representing a partial Hormuz disruption
  const mockScenario = {
    scenarioId: 'mock-hormuz-partial-test',
    input: {
      eventId: 'hormuz-partial',
      durationDays: 14,
      severity: 'HIGH',
      affectedNodeId: 'chokepoint-strait-of-hormuz',
      capacityReductionPercent: 50, // 50% partial disruption
    },
    supplyLoss: 1400000,
    supplyLossUnit: 'tonnes',
    affectedRoutes: [],
    affectedPorts: [],
    affectedRefineries: [],
    alternativeCapacity: 0,
    alternativeCapacityUnit: 'tonnes',
    alternativeCapacitySource: 'mock',
    alternativeCapacityStatus: 'UNAVAILABLE',
    shortage: 1400000,
    shortageUnit: 'tonnes',
    recoveryDays: 28,
  } as any;

  const resolution = provider.resolve({
    scenario: mockScenario,
    graph: runtime.stateEngine.getCurrentTwin(),
  });

  assert.equal(resolution.status, 'AVAILABLE');

  if (resolution.status === 'AVAILABLE') {
    const { suppliers, lanes } = resolution.data;

    // Verify that Persian Gulf exporters are still compatible, but carry risk adjustment
    const PG_SUPPLIERS = ['saudi', 'iraq', 'iran', 'kuwait', 'qatar', 'emirates'];
    
    for (const pgName of PG_SUPPLIERS) {
      const supplier = suppliers.find((s) => s.name.toLowerCase().includes(pgName));
      if (supplier) {
        const supplierLanes = lanes.filter((l) => l.supplierId === supplier.supplierId);
        assert.ok(supplierLanes.length > 0);

        for (const lane of supplierLanes) {
          assert.equal(
            lane.compatible,
            true,
            `Lane ${lane.laneId} for PG supplier ${supplier.name} must remain compatible during partial disruption`
          );
          // Risk score should reflect the 1.8x riskMultiplier
          assert.ok(
            lane.riskScore > 30,
            `Lane ${lane.laneId} risk score should be adjusted for chokepoint transit risk`
          );
        }
      }
    }
  }
});
