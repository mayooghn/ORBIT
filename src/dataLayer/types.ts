export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
}

export interface QualityOptions extends ListOptions {
  issueType?: string;
  severity?: string;
  status?: string;
}

export interface DataQualityResult {
  summary: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  pagination: Pagination;
  unresolvedRelationships: Record<string, unknown>[];
  manualReview: PagedResult<Record<string, unknown>>;
}

export type Phase2DataLayerStatus = 'READY' | 'NOT_CONNECTED' | 'ERROR';
