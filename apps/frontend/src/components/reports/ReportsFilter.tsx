'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Check,
  Calendar,
  ChevronDown,
  Filter,
  ListFilter,
  Clock,
  CalendarDays,
  CalendarRange,
  FileText,
  Beaker,
  Flame,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportsFilters } from './types';
import { DEFAULT_FILTERS, STATUS_OPTIONS, DATE_OPTIONS, REPORT_TYPE_OPTIONS } from './types';

interface ReportsFilterProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ReportsFilters;
  onApply: (filters: ReportsFilters) => void;
  onReset: () => void;
  activeFilterCount: number;
}

const statusIcons: Record<string, React.ReactNode> = {
  all: <ListFilter className="h-3.5 w-3.5" />,
  passed: <Check className="h-3.5 w-3.5" />,
  failed: <X className="h-3.5 w-3.5" />,
  in_progress: <Clock className="h-3.5 w-3.5" />,
};

const dateIcons: Record<string, React.ReactNode> = {
  all: <CalendarDays className="h-3.5 w-3.5" />,
  today: <Clock className="h-3.5 w-3.5" />,
  last7: <CalendarRange className="h-3.5 w-3.5" />,
  last30: <Calendar className="h-3.5 w-3.5" />,
  custom: <CalendarDays className="h-3.5 w-3.5" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  TEST_SUMMARY: <FileText className="h-3.5 w-3.5" />,
  REGRESSION_SUITE: <Beaker className="h-3.5 w-3.5" />,
  SMOKE_SUITE: <Flame className="h-3.5 w-3.5" />,
  SANITY_SUITE: <Target className="h-3.5 w-3.5" />,
};

function StatusDot({ value }: { value: string }) {
  if (value === 'passed') return <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />;
  if (value === 'failed') return <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-100" />;
  if (value === 'in_progress') return <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-100" />;
  return null;
}

export function ReportsFilter({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  activeFilterCount,
}: ReportsFilterProps) {
  const [draft, setDraft] = useState<ReportsFilters>(filters);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
      setClosing(false);
    }
  }, [isOpen, filters]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  const handleApply = () => {
    const clean = { ...draft };
    if (clean.dateRange !== 'custom') {
      clean.customDateFrom = null;
      clean.customDateTo = null;
    }
    onApply(clean);
    handleClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_FILTERS);
    onReset();
    handleClose();
  };

  const toggleReportType = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      reportTypes: prev.reportTypes.includes(value)
        ? prev.reportTypes.filter((t) => t !== value)
        : [...prev.reportTypes, value],
    }));
  };

  if (!isOpen && !closing) return null;

  const allReportTypesSelected = draft.reportTypes.length === REPORT_TYPE_OPTIONS.length;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 transition-all duration-300',
          closing ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-surface-900/40 via-surface-900/30 to-surface-900/20 backdrop-blur-sm"
          onClick={handleClose}
        />
      </div>

      <div
        ref={panelRef}
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-sm',
          'bg-white shadow-2xl shadow-surface-900/20',
          'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          closing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="relative border-b border-surface-100 bg-gradient-to-b from-white to-surface-50/50 px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-surface-800">Filters</h2>
                  <p className="mt-0.5 text-xs text-surface-400">
                    {activeFilterCount > 0
                      ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                      : 'Refine your reports view'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-100 hover:text-surface-600 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Active filter count bar */}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-accent-50 px-3 py-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </div>
                <span className="text-xs font-medium text-accent-700">
                  Filter{activeFilterCount > 1 ? 's' : ''} applied
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
            <div className="space-y-8">
              {/* Status Filter */}
              <section className="group">
                <div className="mb-3.5 flex items-center gap-2.5">
                  <div className="h-6 w-1 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-surface-500">
                      Status
                    </h3>
                    <p className="mt-0.5 text-[11px] text-surface-400">
                      Filter by execution result
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = draft.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, status: opt.value }))
                        }
                        className={cn(
                          'group/opt relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition-all',
                          isActive
                            ? 'border-accent-200 bg-gradient-to-br from-accent-50 to-accent-50/50 text-accent-700 shadow-sm shadow-accent-200/50'
                            : 'border-surface-200/70 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50 hover:shadow-sm'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                            isActive
                              ? 'bg-accent-500 text-white shadow-sm shadow-accent-300'
                              : 'bg-surface-100 text-surface-400 group-hover/opt:bg-surface-200'
                          )}
                        >
                          {isActive && opt.value !== 'all' ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            statusIcons[opt.value]
                          )}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-medium leading-tight">
                            {opt.label}
                          </span>
                          {opt.value !== 'all' && (
                            <StatusDot value={opt.value} />
                          )}
                        </span>
                        {isActive && (
                          <span className="absolute right-2.5 top-2.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-500">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] font-medium uppercase tracking-widest text-surface-300">
                    &nbsp;
                  </span>
                </div>
              </div>

              {/* Date Filter */}
              <section>
                <div className="mb-3.5 flex items-center gap-2.5">
                  <div className="h-6 w-1 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-surface-500">
                      Date Range
                    </h3>
                    <p className="mt-0.5 text-[11px] text-surface-400">
                      When the report was generated
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DATE_OPTIONS.filter((o) => o.value !== 'custom').map((opt) => {
                    const isActive = draft.dateRange === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, dateRange: opt.value }))
                        }
                        className={cn(
                          'group/opt relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition-all',
                          isActive
                            ? 'border-accent-200 bg-gradient-to-br from-accent-50 to-accent-50/50 text-accent-700 shadow-sm shadow-accent-200/50'
                            : 'border-surface-200/70 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50 hover:shadow-sm'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                            isActive
                              ? 'bg-accent-500 text-white shadow-sm shadow-accent-300'
                              : 'bg-surface-100 text-surface-400 group-hover/opt:bg-surface-200'
                          )}
                        >
                          {isActive ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            dateIcons[opt.value]
                          )}
                        </span>
                        <span className="text-sm font-medium">{opt.label}</span>
                        {isActive && (
                          <span className="absolute right-2.5 top-2.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-500">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom date range toggle */}
                <button
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      dateRange: prev.dateRange === 'custom' ? 'all' : 'custom',
                    }))
                  }
                  className={cn(
                    'mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all',
                    draft.dateRange === 'custom'
                      ? 'border-accent-200 bg-accent-50 text-accent-700 shadow-sm'
                      : 'border-surface-150 bg-surface-50 text-surface-500 hover:border-surface-250 hover:bg-surface-100'
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  Custom Range
                  {draft.dateRange === 'custom' && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-accent-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </button>

                {/* Custom Date Range */}
                {draft.dateRange === 'custom' && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50/50 to-white shadow-sm animate-fade-in">
                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                            <Calendar className="h-3 w-3" />
                            From
                          </label>
                          <input
                            type="date"
                            value={draft.customDateFrom || ''}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                customDateFrom: e.target.value || null,
                              }))
                            }
                            className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-700 outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                          />
                        </div>
                        <div className="mt-5 flex items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-accent-500">
                            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                            <Calendar className="h-3 w-3" />
                            To
                          </label>
                          <input
                            type="date"
                            value={draft.customDateTo || ''}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                customDateTo: e.target.value || null,
                              }))
                            }
                            className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-700 outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                          />
                        </div>
                      </div>
                      {(draft.customDateFrom || draft.customDateTo) && (
                        <div className="flex items-center justify-between rounded-lg bg-accent-100/50 px-3 py-2">
                          <span className="text-xs text-accent-600">
                            {draft.customDateFrom && draft.customDateTo
                              ? `${new Date(draft.customDateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(draft.customDateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : 'Select both dates'}
                          </span>
                          <Calendar className="h-3.5 w-3.5 text-accent-400" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] font-medium uppercase tracking-widest text-surface-300">
                    &nbsp;
                  </span>
                </div>
              </div>

              {/* Report Type Filter */}
              <section>
                <div className="mb-3.5 flex items-center gap-2.5">
                  <div className="h-6 w-1 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-surface-500">
                      Report Type
                    </h3>
                    <p className="mt-0.5 text-[11px] text-surface-400">
                      Choose specific report categories
                    </p>
                  </div>
                </div>

                {allReportTypesSelected && (
                  <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700">All types selected</span>
                  </div>
                )}

                <div className="space-y-2">
                  {REPORT_TYPE_OPTIONS.map((opt) => {
                    const isChecked = draft.reportTypes.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleReportType(opt.value)}
                        className={cn(
                          'group/opt flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all',
                          isChecked
                            ? 'border-accent-200 bg-gradient-to-br from-accent-50 to-accent-50/50 text-accent-700 shadow-sm shadow-accent-200/50'
                            : 'border-surface-200/70 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50 hover:shadow-sm'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                            isChecked
                              ? 'bg-accent-500 text-white shadow-sm shadow-accent-300'
                              : 'bg-surface-100 text-surface-400 group-hover/opt:bg-surface-200'
                          )}
                        >
                          {typeIcons[opt.value]}
                        </span>
                        <span className="flex-1 text-sm font-medium">
                          {opt.label}
                        </span>
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
                            isChecked
                              ? 'border-accent-500 bg-accent-500 text-white'
                              : 'border-surface-300 bg-white'
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {draft.reportTypes.length > 0 && !allReportTypesSelected && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-50 px-3.5 py-2">
                    <span className="text-xs text-surface-500">
                      {draft.reportTypes.length} of {REPORT_TYPE_OPTIONS.length} selected
                    </span>
                    <button
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          reportTypes: REPORT_TYPE_OPTIONS.map((o) => o.value),
                        }));
                      }}
                      className="text-xs font-medium text-accent-500 transition-colors hover:text-accent-600"
                    >
                      Select all
                    </button>
                  </div>
                )}
                {draft.reportTypes.length > 0 && allReportTypesSelected && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-50 px-3.5 py-2">
                    <span className="text-xs text-surface-500">
                      All types selected
                    </span>
                    <button
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, reportTypes: [] }))
                      }
                      className="text-xs font-medium text-surface-500 transition-colors hover:text-surface-700"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-surface-100 bg-gradient-to-b from-white to-surface-50/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-2xl border border-surface-200 bg-white px-5 py-3 text-sm font-medium text-surface-600 shadow-sm transition-all hover:border-surface-300 hover:bg-surface-50 hover:shadow active:scale-[0.98]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                onClick={handleApply}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-700 hover:shadow-xl hover:shadow-accent-500/30 active:scale-[0.98]"
              >
                <Filter className="h-4 w-4" />
                Apply Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
