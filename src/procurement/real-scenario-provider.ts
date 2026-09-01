import type { DigitalTwinGraph } from '../digitalTwin/model';
import type { Phase2Repository } from '../dataLayer/repository';
import type {
  ProcurementLane,
  ProcurementRoute,
  ProcurementSupplier,
} from './model';
import type {
  ScenarioProcurementContext,
  ScenarioProcurementDataProvider,
  ScenarioProcurementDataResolution,
} from './scenario-adapter';
import { EiaPriceService } from './eia-price-service';

/**
 * Standard Indian Port Cluster Tanker Handling Capacity (tonnes / year).
 * Derived from Major Ports annual crude handling capacity records.
 */
const INDIAN_CRUDE_PORT_ANNUAL_CAPACITY_TONNES = 240_000_000;

interface RouteDefinition {
  routeId: string;
  name: string;
  shareOfCapacity: number;
  corridorType: 'middle_east' | 'west_africa' | 'southeast_asia' | 'americas' | 'general';
  isHormuzDependent: boolean;
  isMalaccaDependent: boolean;
}

const CANONICAL_ROUTES: readonly RouteDefinition[] = [
  {
    routeId: 'shipping-route-hormuz-india',
    name: 'Strait of Hormuz - Western India Tanker Corridor',
    shareOfCapacity: 0.45,
    corridorType: 'middle_east',
    isHormuzDependent: true,
    isMalaccaDependent: false,
  },
  {
    routeId: 'shipping-route-persian-gulf-hormuz-arabian-sea',
    name: 'Persian Gulf - Arabian Sea Deepwater Corridor',
    shareOfCapacity: 0.35,
    corridorType: 'middle_east',
    isHormuzDependent: true,
    isMalaccaDependent: false,
  },
  {
    routeId: 'shipping-route-cape-good-hope-india',
    name: 'Atlantic / West Africa - Cape of Good Hope Route',
    shareOfCapacity: 0.30,
    corridorType: 'west_africa',
    isHormuzDependent: false,
    isMalaccaDependent: false,
  },
  {
    routeId: 'shipping-route-middle-east-malacca-asia',
    name: 'Southeast Asia - Bay of Bengal Corridor',
    shareOfCapacity: 0.25,
    corridorType: 'southeast_asia',
    isHormuzDependent: false,
    isMalaccaDependent: true,
  },
  {
    routeId: 'shipping-route-shipping-lane-b3f78c886f6e22a23bbf',
    name: 'Major Global Maritime Shipping Corridor',
    shareOfCapacity: 0.50,
    corridorType: 'general',
    isHormuzDependent: false,
    isMalaccaDependent: false,
  },
];

/**
 * Production-grade procurement data provider grounded in real Phase 2 SQLite data,
 * Digital Twin graph topology, maritime navigation geometry, and EIA crude benchmarks.
 */
export class RealScenarioProcurementDataProvider
  implements ScenarioProcurementDataProvider
{
  private readonly repository: Phase2Repository;
  private readonly eiaService: EiaPriceService;

  constructor(repository: Phase2Repository, eiaService = new EiaPriceService()) {
    this.repository = repository;
    this.eiaService = eiaService;
  }

  resolve({ scenario, graph }: ScenarioProcurementContext): ScenarioProcurementDataResolution {
    const unit = scenario.shortageUnit;

    if (!unit || unit === 'unavailable' || scenario.shortage <= 0) {
      return {
        status: 'UNAVAILABLE',
        source: 'ORBIT Real Procurement Data Provider (Phase 2 SQLite & Digital Twin)',
        reason:
          unit === 'unavailable'
            ? 'Scenario supply gap is unverified (unavailable unit). Cannot resolve physical procurement network.'
            : 'No active scenario shortage to procure.',
      };
    }

    const durationDays = Math.max(1, scenario.input.durationDays || 14);
    const affectedNodeId = (scenario.input.affectedNodeId || '').trim();
    const affectedNode = graph.nodes.find((n) => n.nodeId === affectedNodeId);

    // 1. Identify excluded supplier / region
    let excludedCountryName: string | undefined = undefined;
    if (affectedNode?.nodeType === 'supplier') {
      excludedCountryName = affectedNode.name;
    } else if (affectedNodeId.startsWith('supplier-')) {
      const candidateName = affectedNodeId.replace(/^supplier-/, '').replace(/-/g, ' ');
      excludedCountryName = candidateName;
    }

    // 2. Fetch real suppliers from Phase 2 SQLite (supplier_imports)
    const realProcurement = this.repository.getRealAlternativeProcurement({
      excludedCountry: excludedCountryName,
      limit: 25,
    });

    if (realProcurement.suppliers.length === 0) {
      return {
        status: 'UNAVAILABLE',
        source: 'ORBIT Real Procurement Data Provider (Phase 2 SQLite)',
        reason: `No real alternative suppliers found in SQLite supplier_imports table (excluding: ${excludedCountryName || 'none'}).`,
      };
    }

    // Scale supplier capacity to scenario duration & unit
    const suppliers: ProcurementSupplier[] = realProcurement.suppliers.map((s) => {
      let capacity: number;
      if (unit === 'tonnes' || unit === 'metric_tonnes' || unit === 'thousand_metric_tonnes') {
        const factor = unit === 'thousand_metric_tonnes' ? 0.001 : 1;
        // Capacity over scenario duration with verified historical volume basis
        capacity = Math.round((s.annualQuantityTonnes / 365) * durationDays * 1.15 * factor);
      } else if (unit === 'barrels_per_day') {
        // Daily rate in barrels per day (7.33 barrels per metric tonne)
        capacity = Math.round((s.annualQuantityTonnes / 365) * 7.33 * 1.15);
      } else {
        capacity = Math.round((s.annualQuantityTonnes / 365) * durationDays);
      }

      return {
        supplierId: `supplier-${s.countryId}`,
        name: s.canonicalName || s.sourceCountryName,
        capacity: Math.max(1, capacity),
        capacityUnit: unit,
      };
    });

    // 3. Resolve routes with physical capacity grounded in Indian port reception limits
    const reductionPercent = scenario.input.capacityReductionPercent || 0;
    const isHormuzDisrupted =
      affectedNodeId.includes('hormuz') ||
      (affectedNode?.nodeType === 'chokepoint' && affectedNode.name.toLowerCase().includes('hormuz'));
    const isMalaccaDisrupted =
      affectedNodeId.includes('malacca') ||
      (affectedNode?.nodeType === 'chokepoint' && affectedNode.name.toLowerCase().includes('malacca'));

    const routes: ProcurementRoute[] = CANONICAL_ROUTES.map((routeDef) => {
      let routeCapacityTonnes = (INDIAN_CRUDE_PORT_ANNUAL_CAPACITY_TONNES / 365) * durationDays * routeDef.shareOfCapacity;

      // Apply disruption reduction if the route or its controlling chokepoint is affected
      if (affectedNodeId === routeDef.routeId) {
        routeCapacityTonnes *= (100 - reductionPercent) / 100;
      } else if (routeDef.isHormuzDependent && isHormuzDisrupted) {
        routeCapacityTonnes *= (100 - reductionPercent) / 100;
      } else if (routeDef.isMalaccaDependent && isMalaccaDisrupted) {
        routeCapacityTonnes *= (100 - reductionPercent) / 100;
      }

      let capacity: number;
      if (unit === 'thousand_metric_tonnes') {
        capacity = Math.round(routeCapacityTonnes * 0.001);
      } else if (unit === 'barrels_per_day') {
        capacity = Math.round((routeCapacityTonnes / durationDays) * 7.33);
      } else {
        capacity = Math.round(routeCapacityTonnes);
      }

      return {
        routeId: routeDef.routeId,
        name: routeDef.name,
        capacity: Math.max(1, capacity),
        capacityUnit: unit,
      };
    });

    // 4. Generate compatible lanes with EIA benchmark pricing and maritime transit times
    const lanes: ProcurementLane[] = [];
    const costUnit = unit === 'barrels_per_day' ? 'USD_per_barrel' : 'USD_per_tonne';

    for (const supplier of suppliers) {
      const economics = this.eiaService.getSupplierEconomics(supplier.name);
      const supplierNameLower = supplier.name.toLowerCase();

      const isMiddleEast =
        supplierNameLower.includes('saudi') ||
        supplierNameLower.includes('iraq') ||
        supplierNameLower.includes('emirates') ||
        supplierNameLower.includes('kuwait') ||
        supplierNameLower.includes('iran') ||
        supplierNameLower.includes('qatar') ||
        supplierNameLower.includes('oman');

      const isPersianGulfSupplier =
        supplierNameLower.includes('saudi') ||
        supplierNameLower.includes('iraq') ||
        supplierNameLower.includes('emirates') ||
        supplierNameLower.includes('uae') ||
        supplierNameLower.includes('kuwait') ||
        supplierNameLower.includes('iran') ||
        supplierNameLower.includes('qatar');

      const isWestAfrica =
        supplierNameLower.includes('nigeria') ||
        supplierNameLower.includes('angola') ||
        supplierNameLower.includes('gabon') ||
        supplierNameLower.includes('ghana') ||
        supplierNameLower.includes('congo');

      const isSoutheastAsia =
        supplierNameLower.includes('malaysia') ||
        supplierNameLower.includes('indonesia') ||
        supplierNameLower.includes('brunei');

      const isAmericas =
        supplierNameLower.includes('venezuela') ||
        supplierNameLower.includes('brazil') ||
        supplierNameLower.includes('mexico') ||
        supplierNameLower.includes('united states');

      for (const route of routes) {
        const routeDef = CANONICAL_ROUTES.find((r) => r.routeId === route.routeId);
        if (!routeDef) continue;

        let compatible = false;
        let transitMultiplier = 1.0;
        let riskMultiplier = 1.0;

        if (isMiddleEast) {
          if (routeDef.corridorType === 'middle_east' || routeDef.corridorType === 'general') {
            compatible = true;
          }
        } else if (isWestAfrica) {
          if (routeDef.corridorType === 'west_africa' || routeDef.corridorType === 'general') {
            compatible = true;
          }
        } else if (isSoutheastAsia) {
          if (routeDef.corridorType === 'southeast_asia' || routeDef.corridorType === 'general') {
            compatible = true;
          }
        } else if (isAmericas) {
          if (routeDef.corridorType === 'west_africa' || routeDef.corridorType === 'general') {
            // Long-haul via Cape or Atlantic
            compatible = true;
            transitMultiplier = 1.1;
          }
        } else {
          // Default global compatibility via major shipping lane
          if (routeDef.corridorType === 'general') {
            compatible = true;
          }
        }

        if (!compatible) continue;

        // Determine if the specific lane is physically Hormuz-dependent
        let isLaneHormuzDependent = routeDef.isHormuzDependent;
        if (
          isPersianGulfSupplier &&
          (routeDef.corridorType === 'middle_east' || routeDef.corridorType === 'general')
        ) {
          isLaneHormuzDependent = true;
        }

        let laneCompatible = compatible;

        // Elevate risk or block entirely based on chokepoint disruption
        if (isLaneHormuzDependent && isHormuzDisrupted) {
          if (reductionPercent === 100) {
            laneCompatible = false;
          } else {
            riskMultiplier = 1.8;
          }
        } else if (routeDef.isMalaccaDependent && isMalaccaDisrupted) {
          riskMultiplier = 1.5;
        }

        const transitDays = Math.max(
          1,
          Math.round(economics.standardTransitDays * transitMultiplier),
        );
        const riskScore = Math.min(
          99,
          Math.max(1, Math.round(economics.riskScore * riskMultiplier)),
        );

        const costPerUnit =
          unit === 'barrels_per_day'
            ? Math.round((economics.totalCostUsdPerTonne / 7.33) * 100) / 100
            : economics.totalCostUsdPerTonne;

        lanes.push({
          laneId: `lane-${supplier.supplierId.replace('supplier-', '')}-${route.routeId.replace('shipping-route-', '')}`,
          supplierId: supplier.supplierId,
          routeId: route.routeId,
          compatible: laneCompatible,
          procurementCostPerUnit: costPerUnit,
          procurementCostUnit: costUnit,
          transitTimeDays: transitDays,
          riskScore,
          reliabilityScore: economics.reliabilityScore,
        });
      }
    }

    if (lanes.length === 0) {
      return {
        status: 'UNAVAILABLE',
        source: 'ORBIT Real Procurement Data Provider (Phase 2 SQLite & Digital Twin)',
        reason: 'No compatible procurement lanes could be formed between available suppliers and shipping routes.',
      };
    }

    return {
      status: 'AVAILABLE',
      data: {
        source: `ORBIT Procurement Data (FY ${realProcurement.financialYear})`,
        suppliers,
        routes,
        lanes,
      },
    };
  }
}
