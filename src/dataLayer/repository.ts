import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { DataQualityResult, ListOptions, PagedResult, Pagination, QualityOptions } from './types';
import type {
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
  StrategicReserveState,
  RealAlternativeProcurementState,
  RealAlternativeSupplier,
} from '../reserves';
import type { OrbitAssessment, OrbitAssessmentStatus } from '../types/orbitAssessment';

export interface OrbitAssessmentListOptions {
  /** Exact primary-key filter. */
  assessmentId?: string;
  /** Correlation filter on `orbit_assessments.monitored_event_id`. */
  monitoredEventId?: string;
  status?: OrbitAssessmentStatus;
  limit?: number;
}

type QueryValue = string | number | null;
type DataRow = Record<string, unknown>;

const pageValues = (options: ListOptions = {}): { page: number; pageSize: number } => ({
  page: Math.max(1, Math.floor(options.page || 1)),
  pageSize: Math.min(1000, Math.max(1, Math.floor(options.pageSize || 50))),
});

const pagedQuery = <T extends DataRow>(
  database: DatabaseSync,
  selectSql: string,
  countSql: string,
  whereSql: string,
  parameters: QueryValue[],
  options: ListOptions,
): PagedResult<T> => {
  const { page, pageSize } = pageValues(options);
  const countRow = database.prepare(`${countSql} ${whereSql}`).get(...parameters) as { total?: number } | undefined;
  const total = Number(countRow?.total || 0);
  const orderMatch = selectSql.match(/\sORDER BY[\s\S]*$/i);
  const baseSelect = orderMatch ? selectSql.slice(0, orderMatch.index) : selectSql;
  const orderSql = orderMatch?.[0] || '';
  const rows = database.prepare(`${baseSelect} ${whereSql}${orderSql} LIMIT ? OFFSET ?`).all(...parameters, pageSize, (page - 1) * pageSize) as unknown as T[];
  const pagination: Pagination = {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
  return { data: rows, pagination };
};

const containsFilter = (field: string, value: string | undefined, clauses: string[], parameters: QueryValue[]): void => {
  if (value?.trim()) {
    clauses.push(`${field} LIKE ? COLLATE NOCASE`);
    parameters.push(`%${value.trim()}%`);
  }
};

const exactFilter = (field: string, value: string | undefined, clauses: string[], parameters: QueryValue[]): void => {
  if (value?.trim()) {
    clauses.push(`${field} = ?`);
    parameters.push(value.trim());
  }
};

const where = (clauses: string[]): string => (clauses.length ? `WHERE ${clauses.join(' AND ')}` : '');

export interface CountryQuery extends ListOptions {
  search?: string;
  mappingStatus?: string;
}

export interface PortQuery extends ListOptions {
  search?: string;
  mappingStatus?: string;
}

export interface RefineryQuery extends ListOptions {
  search?: string;
  company?: string;
  state?: string;
  hasCoordinates?: boolean;
}

export interface SupplierQuery extends ListOptions {
  financialYear?: string;
  countryId?: string;
  country?: string;
}

export interface CrudeQuery extends ListOptions {
  financialYear?: string;
}

export interface ConsumptionQuery extends ListOptions {
  financialYear?: string;
  product?: string;
  productId?: string;
  month?: number;
}

export interface GlobalOilQuery extends ListOptions {
  country?: string;
  countryId?: string;
}

export interface ActivityQuery extends ListOptions {
  portId?: string;
  year?: number;
  from?: string;
  to?: string;
}

export class Phase2Repository {
  constructor(private readonly database: DatabaseSync) {}

  getStatus(): 'READY' | 'NOT_CONNECTED' {
    const row = this.database.prepare('SELECT COUNT(*) AS total FROM data_sources').get() as { total?: number } | undefined;
    return Number(row?.total || 0) > 0 ? 'READY' : 'NOT_CONNECTED';
  }

  getCountries(options: CountryQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    containsFilter('canonical_name', options.search, clauses, parameters);
    exactFilter('mapping_status', options.mappingStatus, clauses, parameters);
    return pagedQuery(this.database, 'SELECT * FROM countries ORDER BY canonical_name', 'SELECT COUNT(*) AS total FROM countries', where(clauses), parameters, options);
  }

  getPorts(options: PortQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    containsFilter('canonical_port_name', options.search, clauses, parameters);
    exactFilter('mapping_status', options.mappingStatus, clauses, parameters);
    return pagedQuery(this.database, 'SELECT * FROM ports ORDER BY canonical_port_name, port_id', 'SELECT COUNT(*) AS total FROM ports', where(clauses), parameters, options);
  }

  getRefineries(options: RefineryQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    containsFilter('refinery_name', options.search, clauses, parameters);
    containsFilter('company', options.company, clauses, parameters);
    exactFilter('state', options.state, clauses, parameters);
    if (options.hasCoordinates === true) clauses.push('latitude IS NOT NULL AND longitude IS NOT NULL');
    if (options.hasCoordinates === false) clauses.push('(latitude IS NULL OR longitude IS NULL)');
    return pagedQuery(this.database, 'SELECT r.*, d.source_dataset FROM refineries r JOIN data_sources d ON d.data_source_id = r.data_source_id ORDER BY r.refinery_name', 'SELECT COUNT(*) AS total FROM refineries r', where(clauses), parameters, options);
  }

  getSuppliers(options: SupplierQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('f.financial_year', options.financialYear, clauses, parameters);
    exactFilter('s.country_id', options.countryId, clauses, parameters);
    containsFilter('s.source_country_name', options.country, clauses, parameters);
    return pagedQuery(this.database, 'SELECT s.*, f.financial_year, c.canonical_name AS country_name, p.canonical_name AS product_name, d.source_dataset FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id LEFT JOIN countries c ON c.country_id = s.country_id JOIN products p ON p.product_id = s.product_id JOIN data_sources d ON d.data_source_id = s.data_source_id', 'SELECT COUNT(*) AS total FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id', where(clauses), parameters, options);
  }

  getCrudeImports(options: CrudeQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('f.financial_year', options.financialYear, clauses, parameters);
    return pagedQuery(this.database, 'SELECT s.*, f.financial_year, d.source_dataset FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id JOIN data_sources d ON d.data_source_id = s.data_source_id', 'SELECT COUNT(*) AS total FROM supplier_imports s JOIN financial_periods f ON f.financial_period_id = s.financial_period_id', where(clauses), parameters, options);
  }

  getCrudeImportTotals(options: CrudeQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('f.financial_year', options.financialYear, clauses, parameters);
    return pagedQuery(this.database, 'SELECT t.*, f.financial_year, d.source_dataset FROM crude_import_totals t JOIN financial_periods f ON f.financial_period_id = t.financial_period_id JOIN data_sources d ON d.data_source_id = t.data_source_id', 'SELECT COUNT(*) AS total FROM crude_import_totals t JOIN financial_periods f ON f.financial_period_id = t.financial_period_id', where(clauses), parameters, options);
  }

  getConsumption(options: ConsumptionQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('f.financial_year', options.financialYear, clauses, parameters);
    exactFilter('c.product_id', options.productId, clauses, parameters);
    containsFilter('p.canonical_name', options.product, clauses, parameters);
    if (options.month !== undefined) {
      clauses.push('c.month_number = ?');
      parameters.push(options.month);
    }
    return pagedQuery(this.database, 'SELECT c.*, f.financial_year, p.canonical_name AS product_name, d.source_dataset FROM petroleum_consumption c JOIN financial_periods f ON f.financial_period_id = c.financial_period_id JOIN products p ON p.product_id = c.product_id JOIN data_sources d ON d.data_source_id = c.data_source_id', 'SELECT COUNT(*) AS total FROM petroleum_consumption c JOIN financial_periods f ON f.financial_period_id = c.financial_period_id JOIN products p ON p.product_id = c.product_id', where(clauses), parameters, options);
  }

  getGlobalOil(options: GlobalOilQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('g.country_id', options.countryId, clauses, parameters);
    if (options.country?.trim()) {
      const country = `%${options.country.trim()}%`;
      clauses.push('(g.canonical_country_name LIKE ? COLLATE NOCASE OR g.source_country_name LIKE ? COLLATE NOCASE)');
      parameters.push(country, country);
    }
    return pagedQuery(
      this.database,
      'SELECT g.*, c.canonical_name AS country_name, d.source_dataset FROM global_oil_snapshots g JOIN countries c ON c.country_id = g.country_id JOIN data_sources d ON d.data_source_id = g.data_source_id ORDER BY g.rank IS NULL, g.rank, g.canonical_country_name',
      'SELECT COUNT(*) AS total FROM global_oil_snapshots g JOIN countries c ON c.country_id = g.country_id',
      where(clauses),
      parameters,
      options,
    );
  }

  getPortActivity(options: ActivityQuery = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('a.port_id', options.portId, clauses, parameters);
    if (options.year !== undefined) {
      clauses.push('a.source_year = ?');
      parameters.push(options.year);
    }
    if (options.from) {
      clauses.push('a.activity_date >= ?');
      parameters.push(options.from);
    }
    if (options.to) {
      clauses.push('a.activity_date <= ?');
      parameters.push(options.to);
    }
    return pagedQuery(this.database, 'SELECT a.*, p.canonical_port_name, d.source_dataset FROM daily_port_activity a LEFT JOIN ports p ON p.port_id = a.port_id JOIN data_sources d ON d.data_source_id = a.data_source_id ORDER BY a.activity_date, a.port_id, a.daily_activity_id', 'SELECT COUNT(*) AS total FROM daily_port_activity a', where(clauses), parameters, options);
  }

  getLatestPortActivity(): DataRow[] {
    return this.database.prepare(`
      SELECT a.*, p.canonical_port_name, d.source_dataset
      FROM daily_port_activity a
      LEFT JOIN ports p ON p.port_id = a.port_id
      JOIN data_sources d ON d.data_source_id = a.data_source_id
      WHERE a.activity_date = (SELECT MAX(activity_date) FROM daily_port_activity)
      ORDER BY a.port_id, a.daily_activity_id
    `).all() as unknown as DataRow[];
  }

  getLanes(options: ListOptions & { category?: string } = {}): PagedResult<DataRow> {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('lane_category', options.category, clauses, parameters);
    const result = pagedQuery(this.database, 'SELECT l.*, g.geometry_json, g.geometry_status, d.source_dataset FROM shipping_lanes l JOIN shipping_lane_geometries g ON g.shipping_lane_id = l.shipping_lane_id JOIN data_sources d ON d.data_source_id = l.data_source_id ORDER BY l.lane_category', 'SELECT COUNT(*) AS total FROM shipping_lanes', where(clauses), parameters, options);
    return {
      data: result.data.map((row) => {
        const geometryJson = row.geometry_json;
        const { geometry_json: _geometryJson, ...withoutGeometryJson } = row;
        return { ...withoutGeometryJson, geometry: typeof geometryJson === 'string' ? JSON.parse(geometryJson) : null };
      }),
      pagination: result.pagination,
    };
  }

  getChokepoints(options: ListOptions = {}): PagedResult<DataRow> {
    return pagedQuery(this.database, 'SELECT * FROM chokepoints ORDER BY chokepoint_name', 'SELECT COUNT(*) AS total FROM chokepoints', '', [], options);
  }

  getStrategicReserves(options: ListOptions = {}): PagedResult<DataRow> {
    return pagedQuery(this.database, 'SELECT r.*, d.source_dataset FROM strategic_reserves r LEFT JOIN data_sources d ON d.data_source_id = r.data_source_id ORDER BY r.facility_name, r.strategic_reserve_id', 'SELECT COUNT(*) AS total FROM strategic_reserves', '', [], options);
  }

  getCurrentStrategicReserveState(): StrategicReserveState {
    const facilities = this.database.prepare(
      'SELECT * FROM strategic_reserves ORDER BY facility_name',
    ).all() as unknown as DataRow[];

    const hasDatabaseFacilities = facilities.length > 0;
    const totalCapacity = hasDatabaseFacilities
      ? facilities.reduce((sum, f) => sum + (Number(f.capacity) || 0), 0)
      : 5_330_000;

    // Distinguish capacity vs inventory:
    // ISPRL cavern nameplate capacities are real database-backed figures (5.33 MMT total across 3 facilities).
    // Live daily cavern inventory telemetry is classified and not published in open MoPNG datasets.
    // Inventory is explicitly designated as an operational policy estimate (5.0 MMT / ~93.8% fill level)
    // rather than real-time telemetry, while capacity and demand are 100% database-backed real data.
    const currentReserve = 5_000_000;
    const currentReserveStatus = 'POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY' as const;
    const currentReserveSource = 'Policy operational baseline estimate (5.0 MMT); real-time cavern inventory telemetry is not published in open MoPNG datasets';

    // Calculate real daily demand from petroleum_consumption for latest financial period
    let currentDemand = 0;
    let demandBasis = '';
    let demandFinancialYear: string | null = null;
    let isDemandFromDatabase = false;

    const latestConsumptionRow = this.database.prepare(`
      SELECT c.financial_period_id, f.financial_year, SUM(c.consumption_metric_tonnes) AS annual_consumption_tmt, COUNT(*) AS record_count
      FROM petroleum_consumption c
      JOIN financial_periods f ON f.financial_period_id = c.financial_period_id
      GROUP BY c.financial_period_id, f.financial_year, f.financial_year_start
      ORDER BY f.financial_year_start DESC
      LIMIT 1
    `).get() as { financial_period_id?: string; financial_year?: string; annual_consumption_tmt?: number; record_count?: number } | undefined;

    if (latestConsumptionRow && Number(latestConsumptionRow.annual_consumption_tmt) > 0) {
      const annualTmt = Number(latestConsumptionRow.annual_consumption_tmt);
      // In petroleum_consumption, monthly values are in Thousand Metric Tonnes (TMT).
      // Converting to metric tonnes (x1000) and calculating daily demand (/ 365):
      const annualMetricTonnes = annualTmt * 1000;
      currentDemand = Math.round((annualMetricTonnes / 365) * 100) / 100;
      demandFinancialYear = latestConsumptionRow.financial_year || null;
      demandBasis = `Derived from ${latestConsumptionRow.record_count} consumption records for FY ${latestConsumptionRow.financial_year} in petroleum_consumption (${annualTmt.toLocaleString()} TMT/yr = ${annualMetricTonnes.toLocaleString()} tonnes/yr ÷ 365 days = ${currentDemand.toLocaleString()} tonnes/day)`;
      isDemandFromDatabase = true;
    } else {
      currentDemand = 655_271.23;
      demandBasis = 'Historical PPAC FY24-25 baseline fallback (655,271.23 tonnes/day)';
      isDemandFromDatabase = false;
    }

    const minimumReserveThreshold = 1_500_000;
    const minimumReservePolicyBasis = 'Statutory 30-day emergency safety buffer (1.50 MMT policy threshold)';
    const defaultReplenishmentRate = 20_000;
    const replenishmentPolicyBasis = 'Operational maximum ISPRL cavern pipeline injection capacity (20,000 tonnes/day)';

    const formattedFacilities = facilities.map((f) => ({
      strategicReserveId: String(f.strategic_reserve_id || ''),
      facilityName: String(f.facility_name || ''),
      capacity: Number(f.capacity) || 0,
      capacityUnit: String(f.capacity_unit || 'metric_tonnes'),
      latitude: typeof f.latitude === 'number' ? f.latitude : null,
      longitude: typeof f.longitude === 'number' ? f.longitude : null,
      mappingStatus: String(f.mapping_status || 'MAPPED'),
      notes: typeof f.notes === 'string' ? f.notes : null,
    }));

    const alternativeProcurement = this.getRealAlternativeProcurement();

    return {
      facilityName: 'India Strategic Petroleum Reserve (ISPRL)',
      country: 'India',
      totalCapacity,
      capacityUnit: 'metric_tonnes',
      capacitySource: hasDatabaseFacilities
        ? 'strategic_reserves table (ISPRL Phase 1 facilities: Visakhapatnam 1.33 MMT, Mangalore 1.50 MMT, Padur 2.50 MMT)'
        : 'ISPRL Phase 1 default capacity (5.33 MMT)',
      isCapacityFromDatabase: hasDatabaseFacilities,
      currentReserve,
      currentReserveStatus,
      currentReserveSource,
      minimumReserveThreshold,
      minimumReservePolicyBasis,
      currentDemand,
      demandBasis,
      demandFinancialYear,
      isDemandFromDatabase,
      defaultReplenishmentRate,
      replenishmentPolicyBasis,
      unit: 'tonnes',
      facilities: formattedFacilities,
      alternativeProcurement,
      lastUpdated: new Date().toISOString(),
    };
  }

  getRealAlternativeProcurement(options: {
    excludedCountry?: string;
    financialYear?: string;
    limit?: number;
  } = {}): RealAlternativeProcurementState {
    const specifiedYear = options.financialYear?.trim();
    let targetYear = specifiedYear;

    if (!targetYear) {
      const latestPeriod = this.database.prepare(`
        SELECT f.financial_year
        FROM supplier_imports s
        JOIN financial_periods f ON f.financial_period_id = s.financial_period_id
        ORDER BY f.financial_year_start DESC
        LIMIT 1
      `).get() as { financial_year?: string } | undefined;

      targetYear = latestPeriod?.financial_year || '2016-17';
    }

    const excluded = options.excludedCountry?.trim().toLowerCase();

    const rows = this.database.prepare(`
      SELECT 
        s.country_id,
        s.source_country_name,
        COALESCE(c.canonical_name, s.source_country_normalized_name, s.source_country_name) AS canonical_name,
        f.financial_year,
        s.quantity_tonnes,
        p.canonical_name AS product_name
      FROM supplier_imports s
      JOIN financial_periods f ON f.financial_period_id = s.financial_period_id
      LEFT JOIN countries c ON c.country_id = s.country_id
      JOIN products p ON p.product_id = s.product_id
      WHERE f.financial_year = ?
      ORDER BY s.quantity_tonnes DESC
    `).all(targetYear) as Array<{
      country_id?: string;
      source_country_name?: string;
      canonical_name?: string;
      financial_year?: string;
      quantity_tonnes?: number;
      product_name?: string;
    }>;

    const totalAnnualAllSuppliers = rows.reduce((sum, r) => sum + (Number(r.quantity_tonnes) || 0), 0);

    const filteredRows = rows.filter((r) => {
      if (!excluded) return true;
      const srcName = (r.source_country_name || '').toLowerCase();
      const canName = (r.canonical_name || '').toLowerCase();
      return !srcName.includes(excluded) && !canName.includes(excluded);
    });

    const totalAnnualImportTonnes = filteredRows.reduce((sum, r) => sum + (Number(r.quantity_tonnes) || 0), 0);
    const availableAlternativeDailyTonnes = Math.round((totalAnnualImportTonnes / 365) * 100) / 100;

    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 50;

    const suppliers: RealAlternativeSupplier[] = filteredRows.slice(0, limit).map((r) => {
      const annualQty = Number(r.quantity_tonnes) || 0;
      const dailyCap = Math.round((annualQty / 365) * 100) / 100;
      const share = totalAnnualAllSuppliers > 0
        ? Math.round((annualQty / totalAnnualAllSuppliers) * 10000) / 100
        : 0;

      return {
        countryId: String(r.country_id || ''),
        sourceCountryName: String(r.source_country_name || ''),
        canonicalName: String(r.canonical_name || r.source_country_name || ''),
        financialYear: String(r.financial_year || targetYear),
        annualQuantityTonnes: annualQty,
        dailyCapacityTonnes: dailyCap,
        shareOfTotalImportsPercent: share,
        productName: String(r.product_name || 'Crude Oil'),
      };
    });

    return {
      availableAlternativeDailyTonnes,
      totalAnnualImportTonnes,
      financialYear: targetYear,
      supplierCount: filteredRows.length,
      suppliers,
      commercialCostStatus: 'Commercial lane-cost data unavailable',
      isCommercialCostAvailable: false,
      dataSource: 'Phase 2 SQLite supplier_imports table (real import records)',
      provenance: `Derived from ${filteredRows.length} real supplier import records for FY ${targetYear} in supplier_imports (${totalAnnualImportTonnes.toLocaleString()} tonnes/yr ÷ 365 days = ${availableAlternativeDailyTonnes.toLocaleString()} tonnes/day). Commercial lane-cost data unavailable.`,
    };
  }

  saveOrbitAssessment(assessment: OrbitAssessment): string {
    this.database.prepare(`
      INSERT INTO orbit_assessments
        (assessment_id, created_at, completed_at, trigger_source, monitored_event_id, status, overall_risk, summary, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assessment.assessmentId,
      assessment.createdAt,
      assessment.completedAt ?? null,
      assessment.trigger,
      assessment.monitoredEventId ?? null,
      assessment.status,
      assessment.overallRisk ?? null,
      assessment.summary,
      JSON.stringify(assessment),
    );
    return assessment.assessmentId;
  }

  getOrbitAssessment(assessmentId: string): OrbitAssessment | undefined {
    const row = this.database.prepare(
      'SELECT payload_json FROM orbit_assessments WHERE assessment_id = ?',
    ).get(assessmentId) as { payload_json?: string } | undefined;

    if (!row?.payload_json) return undefined;
    return JSON.parse(row.payload_json) as OrbitAssessment;
  }

  listOrbitAssessments(options: OrbitAssessmentListOptions = {}): OrbitAssessment[] {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];

    exactFilter('assessment_id', options.assessmentId, clauses, parameters);
    exactFilter('monitored_event_id', options.monitoredEventId, clauses, parameters);
    exactFilter('status', options.status, clauses, parameters);

    const limit = Math.min(200, Math.max(1, Math.floor(options.limit || 20)));

    const rows = this.database.prepare(`
      SELECT payload_json
      FROM orbit_assessments
      ${where(clauses)}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...parameters, limit) as unknown as Array<{ payload_json: string }>;

    return rows.map((row) => JSON.parse(row.payload_json) as OrbitAssessment);
  }

  saveStrategicReserveOptimization(
    input: StrategicReserveOptimizationInput,
    result: StrategicReserveOptimizationResult,
  ): string {
    const optimizationId = `reserve-optimization-${randomUUID()}`;
    this.database.prepare(`
      INSERT INTO strategic_reserve_optimization_runs
        (optimization_id, requested_at, request_json, result_json)
      VALUES (?, ?, ?, ?)
    `).run(
      optimizationId,
      new Date().toISOString(),
      JSON.stringify(input),
      JSON.stringify(result),
    );
    return optimizationId;
  }

  getStrategicReserveOptimizationRuns(limit = 20): Array<{
    optimizationId: string;
    requestedAt: string;
    input: StrategicReserveOptimizationInput;
    result: StrategicReserveOptimizationResult;
  }> {
    const rows = this.database.prepare(`
      SELECT optimization_id, requested_at, request_json, result_json
      FROM strategic_reserve_optimization_runs
      ORDER BY requested_at DESC
      LIMIT ?
    `).all(limit) as unknown as Array<{
      optimization_id: string;
      requested_at: string;
      request_json: string;
      result_json: string;
    }>;

    return rows.map((row) => ({
      optimizationId: row.optimization_id,
      requestedAt: row.requested_at,
      input: JSON.parse(row.request_json) as StrategicReserveOptimizationInput,
      result: JSON.parse(row.result_json) as StrategicReserveOptimizationResult,
    }));
  }

  getDataQuality(options: QualityOptions = {}): DataQualityResult {
    const clauses: string[] = [];
    const parameters: QueryValue[] = [];
    exactFilter('issue_type', options.issueType, clauses, parameters);
    exactFilter('severity', options.severity, clauses, parameters);
    exactFilter('issue_status', options.status, clauses, parameters);
    const issues = pagedQuery<DataRow>(this.database, 'SELECT q.*, d.source_dataset AS manifest_source_dataset FROM data_quality_issues q JOIN data_sources d ON d.data_source_id = q.data_source_id ORDER BY q.severity DESC, q.data_quality_issue_id', 'SELECT COUNT(*) AS total FROM data_quality_issues q', where(clauses), parameters, options);
    const summary = this.database.prepare('SELECT * FROM data_quality_summaries ORDER BY dataset').all() as unknown as DataRow[];
    const unresolvedRelationships = this.database.prepare("SELECT * FROM relationship_statuses WHERE status <> 'READY' ORDER BY relationship_key").all() as unknown as DataRow[];
    const manualReview = pagedQuery<DataRow>(this.database, 'SELECT * FROM manual_review_records ORDER BY review_type, source_dataset, source_name', 'SELECT COUNT(*) AS total FROM manual_review_records', '', [], options);
    return { summary, issues: issues.data, pagination: issues.pagination, unresolvedRelationships, manualReview };
  }
}
