import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PHASE2_SCHEMA_SQL } from './schema';

export interface Phase2DatabaseOptions {
  dbPath?: string;
}

export const defaultPhase2DbPath = (): string =>
  process.env.ORBIT_DB_PATH || path.join(process.cwd(), 'data', 'orbit.db');

export const openPhase2Database = (options: Phase2DatabaseOptions = {}): DatabaseSync => {
  const dbPath = options.dbPath || defaultPhase2DbPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath, {
    enableForeignKeyConstraints: true,
    timeout: 5000,
  });
  database.exec(PHASE2_SCHEMA_SQL);
  // Step 3D databases may already exist without the Step 3E source fields.
  // Apply only additive, non-destructive migrations so an importer rerun can
  // upgrade the local database without deleting or rewriting raw data.
  const portColumns = database.prepare('PRAGMA table_info(ports)').all() as Array<{ name?: string }>;
  const portColumnNames = new Set(portColumns.map((column) => column.name));
  if (!portColumnNames.has('liquid_bulk_facility')) database.exec('ALTER TABLE ports ADD COLUMN liquid_bulk_facility TEXT');
  if (!portColumnNames.has('oil_terminal_facility')) database.exec('ALTER TABLE ports ADD COLUMN oil_terminal_facility TEXT');
  return database;
};

export const closePhase2Database = (database: DatabaseSync): void => {
  database.close();
};
