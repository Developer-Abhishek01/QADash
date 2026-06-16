import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ExecutionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';

export interface Execution {
  id: string;
  testId: string;
  testName: string;
  projectId: string;
  status: ExecutionStatus;
  duration: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  logs?: string;
  retryCount: number;
}

export interface ExecutionFilters {
  status?: ExecutionStatus;
  projectId?: string;
  dateRange?: { start: string; end: string };
  search?: string;
}

export interface ExecutionState {
  executions: Execution[];
  currentExecution: Execution | null;
  filters: ExecutionFilters;
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;
}

const initialState: ExecutionState = {
  executions: [],
  currentExecution: null,
  filters: {},
  isLoading: false,
  isRunning: false,
  error: null,
};

const executionSlice = createSlice({
  name: 'executions',
  initialState,
  reducers: {
    setExecutions: (state, action: PayloadAction<Execution[]>) => {
      state.executions = action.payload;
      state.isLoading = false;
    },
    setCurrentExecution: (state, action: PayloadAction<Execution | null>) => {
      state.currentExecution = action.payload;
    },
    addExecution: (state, action: PayloadAction<Execution>) => {
      state.executions.unshift(action.payload);
    },
    updateExecution: (state, action: PayloadAction<Execution>) => {
      const index = state.executions.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.executions[index] = action.payload;
      }
      if (state.currentExecution?.id === action.payload.id) {
        state.currentExecution = action.payload;
      }
    },
    removeExecution: (state, action: PayloadAction<string>) => {
      state.executions = state.executions.filter((e) => e.id !== action.payload);
    },
    setFilters: (state, action: PayloadAction<ExecutionFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isRunning = false;
    },
  },
});

export const {
  setExecutions,
  setCurrentExecution,
  addExecution,
  updateExecution,
  removeExecution,
  setFilters,
  clearFilters,
  setLoading,
  setRunning,
  setError,
} = executionSlice.actions;
export default executionSlice.reducer;