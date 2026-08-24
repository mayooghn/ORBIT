import type {
  ScenarioProcurementContext,
  ScenarioProcurementDataResolution,
  ScenarioProcurementDataProvider,
} from './scenario-adapter';

/**
 * Explicitly opt-in demo inputs for the Phase 7 presentation. These values
 * are not live ORBIT data and are never used by the default provider.
 */
export class DemoScenarioProcurementDataProvider
  implements ScenarioProcurementDataProvider
{
  resolve({ scenario }: ScenarioProcurementContext): ScenarioProcurementDataResolution {
    const gap = Math.max(0, scenario.shortage);
    const unit = scenario.shortageUnit;

    return {
      status: 'AVAILABLE',
      data: {
        source: 'Demo procurement data (deterministic fixture; not live data)',
        suppliers: [
          {
            supplierId: 'demo-supplier-a',
            name: 'Demo Supplier A',
            capacity: gap * 0.65,
            capacityUnit: unit,
          },
          {
            supplierId: 'demo-supplier-b',
            name: 'Demo Supplier B',
            capacity: gap * 0.55,
            capacityUnit: unit,
          },
        ],
        routes: [
          {
            routeId: 'demo-route-west',
            name: 'Demo Western Route',
            capacity: gap * 0.75,
            capacityUnit: unit,
          },
          {
            routeId: 'demo-route-east',
            name: 'Demo Eastern Route',
            capacity: gap * 0.75,
            capacityUnit: unit,
          },
        ],
        lanes: [
          {
            laneId: 'demo-lane-a-west',
            supplierId: 'demo-supplier-a',
            routeId: 'demo-route-west',
            compatible: true,
            procurementCostPerUnit: 72,
            procurementCostUnit: 'demo_cost_per_unit',
            transitTimeDays: 6,
            riskScore: 18,
            reliabilityScore: 0.92,
          },
          {
            laneId: 'demo-lane-a-east',
            supplierId: 'demo-supplier-a',
            routeId: 'demo-route-east',
            compatible: true,
            procurementCostPerUnit: 68,
            procurementCostUnit: 'demo_cost_per_unit',
            transitTimeDays: 9,
            riskScore: 28,
            reliabilityScore: 0.89,
          },
          {
            laneId: 'demo-lane-b-west',
            supplierId: 'demo-supplier-b',
            routeId: 'demo-route-west',
            compatible: true,
            procurementCostPerUnit: 61,
            procurementCostUnit: 'demo_cost_per_unit',
            transitTimeDays: 8,
            riskScore: 35,
            reliabilityScore: 0.84,
          },
          {
            laneId: 'demo-lane-b-east',
            supplierId: 'demo-supplier-b',
            routeId: 'demo-route-east',
            compatible: true,
            procurementCostPerUnit: 64,
            procurementCostUnit: 'demo_cost_per_unit',
            transitTimeDays: 7,
            riskScore: 22,
            reliabilityScore: 0.9,
          },
        ],
      },
    };
  }
}
