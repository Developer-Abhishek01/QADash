export interface ReportsFilters {
  status: string;
  dateRange: string;
  customDateFrom: string | null;
  customDateTo: string | null;
  reportTypes: string[];
}

export const DEFAULT_FILTERS: ReportsFilters = {
  status: 'all',
  dateRange: 'all',
  customDateFrom: null,
  customDateTo: null,
  reportTypes: [],
};

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'in_progress', label: 'In Progress' },
] as const;

export const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
] as const;

export const REPORT_TYPE_OPTIONS = [
  { value: 'TEST_SUMMARY', label: 'Test Summary' },
  { value: 'REGRESSION_SUITE', label: 'Regression Suite' },
  { value: 'SMOKE_SUITE', label: 'Smoke Suite' },
  { value: 'SANITY_SUITE', label: 'Sanity Suite' },
] as const;
