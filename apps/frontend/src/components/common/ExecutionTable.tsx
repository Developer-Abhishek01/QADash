'use client';

import { Box, Button, IconButton, Chip, TextField, InputAdornment } from '@mui/material';
import { Search, FilterList, Download, Refresh } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, RowClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import { useState, useCallback, useMemo } from 'react';
import { StatusBadge } from '../common/StatusBadge';

interface Execution {
  id: string;
  testName: string;
  project: string;
  status: string;
  duration: string;
  browser: string;
  environment: string;
  startedAt: string;
  user: string;
}

interface DataTableProps {
  data: Execution[];
  onRowClick?: (row: Execution) => void;
  loading?: boolean;
}

export function ExecutionTable({ data, onRowClick, loading: _loading }: DataTableProps) {
  const [quickFilterText, setQuickFilterText] = useState('');

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'testName',
      headerName: 'Test Name',
      flex: 2,
      minWidth: 200,
      checkboxSelection: true,
    },
    {
      field: 'project',
      headerName: 'Project',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: any) => (
        <StatusBadge status={params.value} />
      ),
    },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 100,
    },
    {
      field: 'browser',
      headerName: 'Browser',
      width: 100,
    },
    {
      field: 'environment',
      headerName: 'Environment',
      width: 120,
    },
    {
      field: 'startedAt',
      headerName: 'Started',
      width: 160,
      sort: 'desc',
    },
    {
      headerName: 'Actions',
      width: 100,
      cellRenderer: (_params: any) => (
        <Box>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); }}>
            <FilterList fontSize="small" />
          </IconButton>
        </Box>
      ),
      pinned: 'right',
      sortable: false,
      filter: false,
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onRowClicked = useCallback((event: RowClickedEvent) => {
    onRowClick?.(event.data);
  }, [onRowClick]);

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search tests..."
          value={quickFilterText}
          onChange={(e) => setQuickFilterText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Button variant="outlined" startIcon={<FilterList />} size="small">
          Filters
        </Button>
        <Button variant="outlined" startIcon={<Download />} size="small">
          Export
        </Button>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small">
          <Refresh />
        </IconButton>
      </Box>

      <Box className="ag-theme-material" sx={{ height: 500, width: '100%' }}>
        <AgGridReact
          rowData={data}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onRowClicked={onRowClicked}
          quickFilterText={quickFilterText}
          rowSelection="multiple"
          pagination={true}
          paginationPageSize={20}
          suppressRowClickSelection={true}
          animateRows={true}
        />
      </Box>
    </Box>
  );
}

interface ReportTableProps {
  data: any[];
  onRowClick?: (row: any) => void;
}

export function ReportTable({ data, onRowClick }: ReportTableProps) {
  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Report Name', flex: 2 },
    { field: 'type', headerName: 'Type', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: any) => <StatusBadge status={params.value} />,
    },
    { field: 'generatedAt', headerName: 'Generated', width: 160 },
    { field: 'size', headerName: 'Size', width: 100 },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: () => (
        <Box>
          <IconButton size="small"><Download /></IconButton>
        </Box>
      ),
    },
  ], []);

  return (
    <Box className="ag-theme-material" sx={{ height: 400, width: '100%' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        onRowClicked={(e: any) => onRowClick?.(e.data)}
        pagination={true}
        paginationPageSize={10}
      />
    </Box>
  );
}

interface BugsTableProps {
  data: any[];
  onRowClick?: (row: any) => void;
}

export function BugsTable({ data, onRowClick }: BugsTableProps) {
  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'title', headerName: 'Title', flex: 2 },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 100,
      cellRenderer: (params: any) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'High' ? 'error' : params.value === 'Medium' ? 'warning' : 'info'}
        />
      ),
    },
    { field: 'testCase', headerName: 'Test Case', flex: 1 },
    { field: 'assignedTo', headerName: 'Assigned', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      cellRenderer: (params: any) => <StatusBadge status={params.value} />,
    },
    { field: 'createdAt', headerName: 'Created', width: 140 },
  ], []);

  return (
    <Box className="ag-theme-material" sx={{ height: 500, width: '100%' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        onRowClicked={(e: any) => onRowClick?.(e.data)}
        pagination={true}
        paginationPageSize={15}
      />
    </Box>
  );
}