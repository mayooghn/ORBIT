import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test, { after, before } from 'node:test';
import { createApp } from '../server';
import { openPhase2Database } from '../src/dataLayer/database';
import { importPhase2Data } from '../src/dataLayer/importer';
import { Phase2Repository } from '../src/dataLayer/repository';

const processedDir = existsSync(path.join(process.cwd(), 'Data', 'processed'))
  ? path.join(process.cwd(), 'Data', 'processed')
  : path.join(process.cwd(), 'data', 'processed');
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'orbit-phase2-'));
const databasePath = path.join(temporaryDirectory, 'phase2.sqlite');
let database = openPhase2Database({ dbPath: databasePath });
let repository = new Phase2Repository(database);
let server: Server;
let baseUrl = '';

before(async () => {
  const firstImport = importPhase2Data({ dbPath: databasePath, processedDir });
  assert.equal(firstImport.counts.countries, 210);
  assert.equal(firstImport.counts.ports, 59);
  assert.equal(firstImport.counts.daily_port_activity, 59556);
  assert.equal(firstImport.counts.petroleum_consumption, 3888);

  database.close();
  database = openPhase2Database({ dbPath: databasePath });
  repository = new Phase2Repository(database);
  const app = createApp(repository);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('schema and real processed-data import are populated', () => {
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>;
  const tableNames = new Set(tables.map((table) => table.name));
  for (const requiredTable of ['countries', 'ports', 'refineries', 'shipping_lanes', 'chokepoints', 'supplier_imports', 'crude_import_totals', 'petroleum_consumption', 'daily_port_activity', 'global_oil_snapshots', 'financial_periods', 'products', 'data_sources', 'data_quality_issues']) assert.ok(tableNames.has(requiredTable), `missing table ${requiredTable}`);
  assert.equal(repository.getStatus(), 'READY');
});

test('re-import is idempotent and does not duplicate facts', () => {
  const secondImport = importPhase2Data({ dbPath: databasePath, processedDir });
  assert.equal(secondImport.counts.daily_port_activity, 59556);
  assert.equal((database.prepare('SELECT COUNT(*) AS total FROM daily_port_activity').get() as { total: number }).total, 59556);
  assert.equal((database.prepare('SELECT COUNT(*) AS total FROM supplier_imports').get() as { total: number }).total, 128);
});

test('repository queries return real processed values', () => {
  const country = repository.getCountries({ search: 'Venezuela', pageSize: 10 });
  assert.equal(country.data.length, 1);
  assert.equal(country.data[0].canonical_name, 'Venezuela');

  const port = repository.getPorts({ search: 'Sikka', pageSize: 10 });
  assert.equal(port.data.length, 1);
  assert.equal(port.data[0].canonical_port_name, 'Sikka');

  const facilityPort = repository.getPorts({ search: 'Mundra', pageSize: 10 });
  assert.equal(facilityPort.data.length, 1);
  assert.equal(facilityPort.data[0].liquid_bulk_facility, 'Yes');
  assert.equal(facilityPort.data[0].oil_terminal_facility, 'Yes');

  const refinery = repository.getRefineries({ search: 'Digboi', pageSize: 10 });
  assert.equal(refinery.data.length, 1);
  assert.equal(refinery.data[0].capacity, 650);
  assert.equal(refinery.data[0].latitude, null);

  const suppliers = repository.getSuppliers({ financialYear: '2014-15', country: 'Saudi', pageSize: 10 });
  assert.equal(suppliers.data.length, 1);
  assert.equal(suppliers.data[0].quantity_tonnes, 34492347);

  const crude = repository.getCrudeImports({ financialYear: '2014-15', pageSize: 10 });
  assert.equal(crude.pagination.total, 40);

  const totals = repository.getCrudeImportTotals({ financialYear: '2023-24', pageSize: 10 });
  assert.equal(totals.data[0].quantity_thousand_metric_tonnes, 234261.5795730779);

  const consumption = repository.getConsumption({ product: 'LPG', financialYear: '2024-25', month: 4, pageSize: 10 });
  assert.equal(consumption.data.length, 1);
  assert.equal(consumption.data[0].consumption_metric_tonnes, 2373);

  const globalOil = repository.getGlobalOil({ country: 'Venezuela', pageSize: 10 });
  assert.equal(globalOil.data.length, 1);
  assert.equal(globalOil.data[0].canonical_country_name, 'Venezuela');
  assert.ok(Number(globalOil.data[0].proven_reserves_barrels) > 0);
});

test('shipping lane geometry is loaded from the processed source GeoJSON', async () => {
  const source = JSON.parse(readFileSync(path.join(processedDir, 'shipping_lanes_v1.geojson'), 'utf8')) as { features: Array<{ id: string | number; geometry: unknown }> };
  const sourceGeometryById = new Map(source.features.map((feature) => [String(feature.id), feature.geometry]));
  const storedGeometryRows = database.prepare("SELECT geometry_json, geometry_status FROM shipping_lane_geometries WHERE geometry_status = 'AVAILABLE'").all() as Array<{ geometry_json: string | null; geometry_status: string }>;
  assert.equal(storedGeometryRows.length, source.features.length);
  assert.ok(storedGeometryRows.every((row) => row.geometry_json));

  const lanes = repository.getLanes({ pageSize: 10 });
  assert.equal(lanes.data.length, source.features.length);
  for (const lane of lanes.data) {
    const sourceGeometry = sourceGeometryById.get(String(lane.source_feature_id));
    assert.ok(sourceGeometry);
    assert.deepEqual(lane.geometry, sourceGeometry);
    assert.equal((lane.geometry as { type: string }).type, lane.geometry_type);
  }

  const response = await fetch(`${baseUrl}/api/phase2/lanes?pageSize=10`);
  assert.equal(response.status, 200);
  const body = await response.json() as { data: Array<Record<string, unknown>> };
  assert.equal(body.data.length, source.features.length);
  assert.ok(body.data.every((lane) => lane.geometry && typeof lane.geometry === 'object'));
  assert.deepEqual(body.data[0].geometry, source.features.find((feature) => String(feature.id) === String(body.data[0].source_feature_id))?.geometry);
});

test('global oil endpoint returns real database records with filters', async () => {
  const response = await fetch(`${baseUrl}/api/phase2/global-oil?country=Venezuela&pageSize=10`);
  assert.equal(response.status, 200);
  const body = await response.json() as { data: Array<Record<string, unknown>>; pagination: { total: number } };
  assert.equal(body.pagination.total, 1);
  assert.equal(body.data[0].canonical_country_name, 'Venezuela');
  assert.ok(Number(body.data[0].production_barrels_per_day) > 0);
});

test('daily activity pagination and filters are bounded', () => {
  const page = repository.getPortActivity({ page: 2, pageSize: 25, portId: 'port-21bd5d045171a73e0012', year: 2019 });
  assert.equal(page.data.length, 25);
  assert.equal(page.pagination.page, 2);
  assert.equal(page.pagination.pageSize, 25);
  assert.ok(page.pagination.total > 25);
  assert.ok(page.data.every((row) => row.source_year === 2019));
});

test('data-quality query exposes review states and unresolved relationships', () => {
  const quality = repository.getDataQuality({ issueType: 'unresolved_port_mapping', pageSize: 10 });
  assert.equal(quality.issues.length, 3);
  assert.equal(quality.unresolvedRelationships.length, 5);
  assert.equal(quality.manualReview.pagination.total, 11);
  assert.ok(quality.summary.some((row) => row.dataset === 'daily_port_activity'));
});

test('all Phase 2 API endpoints respond with structured JSON', async () => {
  const endpoints = [
    '/api/phase2/countries?pageSize=2',
    '/api/phase2/ports?pageSize=2',
    '/api/phase2/refineries?pageSize=2',
    '/api/phase2/suppliers?pageSize=2',
    '/api/phase2/imports/crude?pageSize=2',
    '/api/phase2/imports/crude/totals?pageSize=2',
    '/api/phase2/consumption?pageSize=2',
    '/api/phase2/global-oil?pageSize=2',
    '/api/phase2/lanes?pageSize=2',
    '/api/phase2/chokepoints?pageSize=2',
    '/api/phase2/port-activity?pageSize=2',
    '/api/phase2/data-quality?pageSize=2',
  ];
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    assert.equal(response.status, 200, endpoint);
    const body = await response.json() as Record<string, unknown>;
    if (endpoint.includes('data-quality')) {
      assert.ok(Array.isArray(body.issues));
      assert.ok(Array.isArray(body.summary));
    } else {
      assert.ok(Array.isArray(body.data), endpoint);
      assert.ok(body.pagination);
    }
  }
});
