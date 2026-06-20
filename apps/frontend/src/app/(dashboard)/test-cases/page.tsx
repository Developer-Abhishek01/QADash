'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  IconButton,
  Checkbox,
  ButtonGroup,
  TextField,
  Autocomplete,
  FormLabel,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  AutoFixHigh as AIIcon,
  PlayArrow as RunIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Speed as SmokeIcon,
  Replay as RegressionIcon,
  ListAlt as TestCasesIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { testsApi, executionsApi, projectsApi, environmentsApi } from '@/lib/api/client';
import * as XLSX from 'xlsx';

const wizardSteps = ['Upload Test Cases', 'AI Mapping', 'Execution Trigger'];

interface ParsedTestCase {
  name: string;
  steps: any[];
  url: string;
  sourceRow: number;
  sourceData: Record<string, string>;
}

export default function TestCasesPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(null);
  const [parsedTestCases, setParsedTestCases] = useState<ParsedTestCase[] | null>(null);
  const [selectedCaseIndices, setSelectedCaseIndices] = useState<number[]>([]);
  const [targetUrl, setTargetUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [environments, setEnvironments] = useState<any[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTc, setViewTc] = useState<any | null>(null);
  const [editTc, setEditTc] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editSourceData, setEditSourceData] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceDataCache = useRef<Map<string, Record<string, string>[]>>(new Map());

  // Only show group/standalone tests — hide individual child rows from file uploads
  const displayedTestCases = useMemo(() =>
    testCases.filter(tc => tc.config?._isGroup || !tc.config?._sourceFileName),
  [testCases]);

  const fetchTestCases = useCallback(async () => {
    try {
      setLoading(true);
      const data = await testsApi.list();
      setTestCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch test cases:', error);
      setTestCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestCases();
    projectsApi.list().then((projectsList: any[]) => {
      setProjects(projectsList);
      if (projectsList.length > 0 && !projectId) setProjectId(projectsList[0].id);
    }).catch(() => {});
  }, [fetchTestCases]);

  useEffect(() => {
    if (!projectId) return;
    const matchedProject = projects.find(p => p.id === projectId || p.name === projectId);
    if (!matchedProject) return;
    setSelectedEnvId('');
    setTargetUrl('');
    environmentsApi.list({ projectId: matchedProject.id }).then((envList: any[]) => {
      setEnvironments(envList);
      if (envList.length > 0 && !selectedEnvId) {
        setSelectedEnvId(envList[0].id);
        setTargetUrl(envList[0].baseUrl);
      }
    }).catch(() => {});
  }, [projectId]);

  const toggleSelect = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedTestIds.length === displayedTestCases.length) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(displayedTestCases.map((tc) => tc.id));
    }
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Find key in row that contains one of the given patterns
  const findKey = (row: Record<string, string>, patterns: string[]): string | undefined => {
    return Object.keys(row).find(k => patterns.some(p => k.includes(p)));
  };

  const getVal = (row: Record<string, string>, patterns: string[]): string => {
    const key = findKey(row, patterns);
    return key ? row[key] || '' : '';
  };

  const rowToStep = (row: Record<string, string>): any | null => {
    let action = getVal(row, ['action', 'type', 'step_type', 'command', 'keyword']);
    if (!action) {
      const stepKey = findKey(row, ['step', 'steps', 'test_step', 'test steps', 'test_steps']);
      if (!stepKey) return null;
      const stepVal = row[stepKey] || '';
      // Multi-line or numbered "steps" column → let caller handle via parseStepsText
      if (stepVal.includes('\n') || /^\d+[\.\)]\s/.test(stepVal.trim())) return null;
      action = stepVal;
    }
    if (!action) return null;

    // Split comma-separated actions like "navigate,input,click" into individual steps
    const actions = action.split(',').map(a => a.trim()).filter(Boolean);
    const selector = getVal(row, ['selector', 'element', 'target', 'locator', 'css', 'xpath']);
    const desc = getVal(row, ['description', 'comment', 'desc', 'remark']);
    const urlCol = getVal(row, ['url', 'baseurl', 'site']);
    const testData = getVal(row, ['value', 'text', 'input', 'data'])
      || getVal(row, ['test_data', 'test data', 'testdata']);

    const makeStep = (a: string) => {
      if (a.startsWith('navigate') || a.startsWith('goto') || a.startsWith('open') || a.startsWith('go to')) {
        const urlMatch = a.match(/(https?:\/\/[^\s]+)/i);
        const url = urlMatch ? urlMatch[1] : (urlCol || '');
        return { type: 'navigate', url, description: desc || a };
      } else if (a.startsWith('click') || a.startsWith('tap') || a.startsWith('press') || a.startsWith('submit')) {
        const target = a.replace(/^(?:click|tap|press|submit)\s+(?:on\s+)?/i, '').trim();
        return { type: 'click', selector: selector || (target ? `text="${target}"` : ''), description: desc || a };
      } else if (a.startsWith('type') || a.startsWith('fill') || a.startsWith('input') || a.startsWith('enter') || a.startsWith('set') || a.startsWith('write') || a.startsWith('put')) {
        const inMatch = a.match(/^(?:type|enter|fill|input|set|write|put)\s+(.+?)(?:\s+in\s+|\s+into\s+|\s+on\s+|\s+at\s+)(.+)/i);
        if (inMatch && !selector) {
          return { type: 'type', value: inMatch[1].trim(), selector: `text="${inMatch[2].trim()}"`, description: desc || a };
        }
        const value = testData || a.replace(/^(?:type|enter|fill|input|set|write|put)\s+/i, '').trim();
        return { type: 'type', selector: selector || 'input', value, description: desc || a };
      } else if (a.startsWith('select') || a.startsWith('choose') || a.startsWith('pick')) {
        const matchVal = a.match(/^(?:select|choose|pick)\s+(.+?)(?:\s+from\s+|\s+in\s+)(.+)/i);
        if (matchVal && !selector) {
          return { type: 'select', value: matchVal[1].trim(), selector: `text="${matchVal[2].trim()}"`, description: desc || a };
        }
        return { type: 'select', selector: selector || '', value: testData || '', description: desc || a };
      } else if (a.startsWith('assert') || a.startsWith('verify') || a.startsWith('check') || a.startsWith('expect') || a.startsWith('should')) {
        return { type: 'assert', selector: selector || 'body', value: testData || a.replace(/^(?:assert|verify|check|expect|should)\s+/i, '').trim(), description: desc || a };
      } else if (a.startsWith('wait') || a.startsWith('pause') || a.startsWith('delay') || a.startsWith('sleep')) {
        const msMatch = a.match(/(\d+)\s*(ms|sec|seconds?)/i);
        const ms = msMatch ? parseInt(msMatch[1]) * (msMatch[2].toLowerCase().startsWith('ms') ? 1 : 1000) : (parseInt(testData) || 2000);
        return { type: 'wait', ms, description: desc || a };
      } else if (a.startsWith('screenshot') || a.startsWith('capture') || a.startsWith('snapshot')) {
        return { type: 'screenshot', description: desc || a };
      }
      return { type: 'custom', selector: selector || '', value: testData || '', description: desc || a };
    };

    const steps = actions.map(makeStep);
    if (steps.length === 0) return null;
    return { _multi: steps };
  };

  // Parse multi-line step text like "1. Step one\n2. Step two" into step objects
  const parseStepsText = (text: string): any[] => {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.map((line) => {
      const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
      const lower = cleaned.toLowerCase();

      // navigate / goto / open
      if (lower.startsWith('navigate') || lower.startsWith('goto') || lower.startsWith('go to') || lower.startsWith('open')) {
        const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/i);
        return {
          type: 'navigate',
          url: urlMatch ? urlMatch[1] : cleaned.replace(/^(navigate|goto|go to|open)\s+/i, '').trim(),
          description: cleaned,
        };
      }

      // click / tap / press / submit
      if (lower.startsWith('click') || lower.startsWith('tap') || lower.startsWith('press') || lower.startsWith('submit') || lower.startsWith('double click') || lower.startsWith('right click')) {
        const target = cleaned.replace(/^(click|tap|press|submit|double.?click|right.?click)\s+(on\s+)?/i, '').trim();
        return { type: 'click', selector: `text="${target}"`, description: cleaned };
      }

      // type / enter / fill / input / set / write
      if (lower.startsWith('type') || lower.startsWith('enter') || lower.startsWith('fill') || lower.startsWith('input') || lower.startsWith('set') || lower.startsWith('write') || lower.startsWith('put')) {
        // Try to parse "Enter <value> in <field>" or "Enter <value>"
        const inMatch = cleaned.match(/(?:type|enter|fill|input|set|write|put)\s+(.+?)(?:\s+in\s+|\s+into\s+|\s+on\s+|\s+at\s+)(.+)/i);
        if (inMatch) {
          return { type: 'type', value: inMatch[1].trim(), selector: `text="${inMatch[2].trim()}"`, description: cleaned };
        }
        // "type <value> in <field>" or just "type <value>"
        const value = cleaned.replace(/^(type|enter|fill|input|set|write|put)\s+/i, '').trim();
        return { type: 'type', value, selector: 'input', description: cleaned };
      }

      // select / choose / pick
      if (lower.startsWith('select') || lower.startsWith('choose') || lower.startsWith('pick')) {
        const target = cleaned.replace(/^(select|choose|pick)\s+(.+?)(?:\s+from\s+|\s+in\s+)(.+)/i, '$2').trim();
        const from = cleaned.match(/(?:from|in)\s+(.+)$/i);
        return { type: 'select', value: target, selector: from ? `text="${from[1].trim()}"` : '', description: cleaned };
      }

      // assert / verify / check / expect / should
      if (lower.startsWith('assert') || lower.startsWith('verify') || lower.startsWith('check') || lower.startsWith('expect') || lower.startsWith('should')) {
        const target = cleaned.replace(/^(assert|verify|check|expect|should)\s+/i, '').trim();
        return { type: 'assert', selector: 'body', value: target, description: cleaned };
      }

      // wait / pause / delay / sleep
      if (lower.startsWith('wait') || lower.startsWith('pause') || lower.startsWith('delay') || lower.startsWith('sleep')) {
        const msMatch = cleaned.match(/(\d+)\s*(ms|sec|seconds?)/i);
        const ms = msMatch ? parseInt(msMatch[1]) * (msMatch[2].toLowerCase().startsWith('ms') ? 1 : 1000) : 2000;
        return { type: 'wait', ms, description: cleaned };
      }

      // screenshot / capture
      if (lower.startsWith('screenshot') || lower.startsWith('capture') || lower.startsWith('take screenshot') || lower.startsWith('snapshot')) {
        return { type: 'screenshot', description: cleaned };
      }

      // logout, close, quit etc → click
      if (lower.startsWith('logout') || lower.startsWith('log out') || lower.startsWith('sign out') || lower.startsWith('signout') || lower.startsWith('close') || lower.startsWith('quit')) {
        return { type: 'click', selector: `text="${cleaned}"`, description: cleaned };
      }

      // If description contains a URL → navigate
      const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        return { type: 'navigate', url: urlMatch[1], description: cleaned };
      }

      return { type: 'custom', description: cleaned };
    });
  };

  const parseFileToTestCases = (content: string | ArrayBuffer, fileName: string): ParsedTestCase[] => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    // --- Excel (.xlsx, .xls) ---
    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const data = typeof content === 'string' ? new Uint8Array(content.split('').map(c => c.charCodeAt(0))) : new Uint8Array(content as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
        if (rows.length === 0) return [];

        const headers = Object.keys(rows[0]).map(h => h.toLowerCase());
        const hasTestCaseName = headers.some(h => {
          const isNameLike = h.includes('test') || h.includes('name') || h.includes('case') || h.includes('scenario') || h.includes('title');
          const isStepLike = h.includes('step') || h.includes('action') || h.includes('command') || h.includes('keyword') || h.includes('type') || h.includes('data');
          return isNameLike && !isStepLike;
        });
        const hasAction = headers.some(h => h.includes('action') || h.includes('type') || h.includes('step') || h.includes('command') || h.includes('keyword'));

        if (hasAction && !hasTestCaseName) {
          // Each row is a step -> group them as one test case
          const steps: any[] = [];
          let firstUrl = '';
          const allRowData: Record<string, string> = {};
          for (const row of rows) {
            const cleanRow: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              cleanRow[k.toLowerCase()] = String(v ?? '');
            }
            // Merge all row data to capture full file content
            Object.assign(allRowData, cleanRow);
            const step = rowToStep(cleanRow);
            if (step) {
              if (step._multi) {
                for (const s of step._multi) { steps.push(s); if (s.url && !firstUrl) firstUrl = s.url; }
              } else {
                steps.push(step);
                if (step.url && !firstUrl) firstUrl = step.url;
              }
            }
          }
          const name = fileName.replace(/\.[^/.]+$/, '');
          return [{ name, steps, url: firstUrl, sourceRow: 0, sourceData: allRowData }];
        }

        // Each row is a separate test case
        const testCases: ParsedTestCase[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cleanRow: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            cleanRow[k.toLowerCase()] = String(v ?? '');
          }
          const step = rowToStep(cleanRow);
          const tcName = cleanRow.test_case || cleanRow.testcasename || cleanRow.test_name || cleanRow.testname || cleanRow.name || cleanRow.scenario || cleanRow.title || `Test Case ${i + 1}`;
          const tcUrl = cleanRow.url || cleanRow.baseurl || cleanRow.site || '';
          if (step) {
            testCases.push({ name: tcName, steps: step._multi || [step], url: tcUrl, sourceRow: i, sourceData: cleanRow });
          } else {
            // No action column found — check for multi-line steps column
            const stepsKey = Object.keys(cleanRow).find(k => k.includes('step') || k.includes('action') || k.includes('testcase') || k.includes('description'));
            const stepsText = stepsKey ? cleanRow[stepsKey] || '' : '';
            let parsedSteps = parseStepsText(stepsText);
            if (parsedSteps.length === 0) {
              // Try all non-name columns as step text
              const nonNameCols = Object.keys(cleanRow).filter(k =>
                !k.includes('test') && !k.includes('name') && !k.includes('case') && !k.includes('scenario') && !k.includes('title') && !k.includes('url') && !k.includes('baseurl') && !k.includes('site') && !k.includes('priority') && !k.includes('expected') && !k.includes('id')
              );
              const allText = nonNameCols.map(k => cleanRow[k]).filter(Boolean).join('\n');
              parsedSteps = parseStepsText(allText);
            }
            testCases.push({ name: tcName, steps: parsedSteps, url: tcUrl, sourceRow: i, sourceData: cleanRow });
          }
        }
        return testCases;
      } catch (e) {
        console.error('XLSX parse error:', e);
        return [];
      }
    }

    // --- JSON ---
    if (ext === 'json') {
      try {
        const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content as ArrayBuffer);
        const parsed = JSON.parse(contentStr);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return [];
          // Check if this is an array of steps or test cases
          const first = parsed[0];
          if (first.action || first.type || first.step) {
            // Array of steps - one test case
            const name = fileName.replace(/\.[^/.]+$/, '');
            const allData: Record<string, string> = {};
            for (const s of parsed) {
              Object.assign(allData, Object.fromEntries(Object.entries(s).map(([k, v]) => [k, String(v ?? '')])));
            }
            return [{ name, steps: parsed, url: parsed.find((s: any) => s.url)?.url || '', sourceRow: 0, sourceData: allData }];
          }
          // Array of test case objects
          return parsed.map((item: any, idx: number) => {
            const name = item.name || item.test_case || item.testCase || item.title || item.scenario || `Test Case ${idx + 1}`;
            let steps = item.steps || item.actions || (item.action ? [item] : []);
            if (!Array.isArray(steps)) steps = [];
            return {
              name,
              steps,
              url: item.url || item.baseUrl || '',
              sourceRow: idx,
              sourceData: Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v ?? '')])),
            };
          });
        }
        if (parsed.steps && Array.isArray(parsed.steps)) {
          const name = fileName.replace(/\.[^/.]+$/, '');
          return [{ name, steps: parsed.steps, url: parsed.url || '', sourceRow: 0, sourceData: {} }];
        }
        return [];
      } catch { return []; }
    }

    // --- CSV ---
    if (ext === 'csv') {
      const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content as ArrayBuffer);
      const lines = contentStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return [];
      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      const hasTestCaseName = headers.some(h => {
        const isNameLike = h.includes('test') || h.includes('name') || h.includes('case') || h.includes('scenario') || h.includes('title');
        const isStepLike = h.includes('step') || h.includes('action') || h.includes('command') || h.includes('keyword') || h.includes('type') || h.includes('data');
        return isNameLike && !isStepLike;
      });
      const hasAction = headers.some(h => h.includes('action') || h.includes('type') || h.includes('step') || h.includes('command') || h.includes('keyword'));

      if (hasAction && !hasTestCaseName) {
        // Each row is a step -> group as one test case
        const steps: any[] = [];
        let firstUrl = '';
        const allRowData: Record<string, string> = {};
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCsvLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
          Object.assign(allRowData, row);
          const step = rowToStep(row);
          if (step) {
            if (step._multi) {
              for (const s of step._multi) { steps.push(s); if (s.url && !firstUrl) firstUrl = s.url; }
            } else {
              steps.push(step);
              if (step.url && !firstUrl) firstUrl = step.url;
            }
          }
        }
        const name = fileName.replace(/\.[^/.]+$/, '');
        return [{ name, steps, url: firstUrl, sourceRow: 0, sourceData: allRowData }];
      }

      // Each row is a separate test case
      const testCases: ParsedTestCase[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        const step = rowToStep(row);
        const tcName = row.test_case || row.testcasename || row.test_name || row.testname || row.name || row.scenario || row.title || `Test Case ${i}`;
        const tcUrl = row.url || row.baseurl || row.site || '';
        if (step) {
          testCases.push({ name: tcName, steps: step._multi || [step], url: tcUrl, sourceRow: i, sourceData: row });
        } else {
          const stepsKey = Object.keys(row).find(k => k.includes('step') || k.includes('action') || k.includes('testcase') || k.includes('description'));
          const stepsText = stepsKey ? row[stepsKey] || '' : '';
          let parsedSteps = parseStepsText(stepsText);
          if (parsedSteps.length === 0) {
            const nonNameCols = Object.keys(row).filter(k =>
              !k.includes('test') && !k.includes('name') && !k.includes('case') && !k.includes('scenario') && !k.includes('title') && !k.includes('url') && !k.includes('baseurl') && !k.includes('site') && !k.includes('priority') && !k.includes('expected') && !k.includes('id')
            );
            const allText = nonNameCols.map(k => row[k]).filter(Boolean).join('\n');
            parsedSteps = parseStepsText(allText);
          }
          testCases.push({ name: tcName, steps: parsedSteps, url: tcUrl, sourceRow: i, sourceData: row });
        }
      }
      return testCases;
    }

    // --- JS/TS code files ---
    if (ext === 'js' || ext === 'ts' || ext === 'mjs') {
      const name = fileName.replace(/\.[^/.]+$/, '');
      return [{ name, steps: [], url: targetUrl, sourceRow: 0, sourceData: {} }];
    }

    return [];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFileContent(null);
      setParsedTestCases(null);
      setSelectedCaseIndices([]);
      enqueueSnackbar(`Reading ${file.name}...`, { variant: 'info' });

      const ext = file.name.split('.').pop()?.toLowerCase();
      const isBinary = ext === 'xlsx' || ext === 'xls';

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (content) {
          setFileContent(content);
          const testCases = parseFileToTestCases(content, file.name);
          setParsedTestCases(testCases);
          setSelectedCaseIndices(testCases.map((_, idx) => idx));
          if (testCases.length === 0) {
            enqueueSnackbar(`No test cases found in ${file.name}. Check file format.`, { variant: 'warning' });
          } else {
            enqueueSnackbar(`Parsed ${testCases.length} test case(s) from ${file.name}`, { variant: 'success' });
          }
        }
      };
      reader.onerror = () => {
        enqueueSnackbar('Failed to read file', { variant: 'error' });
      };
      if (isBinary) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleExecute = async (suiteType: string, testIds?: string[]) => {
    try {
      setLoading(true);
      const idsToRun = testIds || selectedTestIds;
      if (idsToRun.length === 0) {
        enqueueSnackbar('Please select at least one test case to run', { variant: 'warning' });
        return;
      }
      // Expand group tests into their child test IDs
      const expandedIds: string[] = [];
      for (const id of idsToRun) {
        const tc = testCases.find(t => t.id === id);
        const childIds = tc?.config?._childTestIds;
        if (Array.isArray(childIds) && childIds.length > 0) {
          expandedIds.push(...childIds);
        } else {
          expandedIds.push(id);
        }
      }
      const selectedTestCases = testCases.filter(tc => expandedIds.includes(tc.id));
      const testProjectId = selectedTestCases[0]?.projectId;
      if (!testProjectId) {
        enqueueSnackbar('No project associated with selected test cases', { variant: 'error' });
        return;
      }
      const suiteName = `${suiteType}: ${new Date().toLocaleString('en-IN')}`;
      const execution = await executionsApi.create({
        name: suiteName,
        projectId: testProjectId,
        testIds: expandedIds,
      });
      await executionsApi.start(execution.id);
      enqueueSnackbar(`${suiteType} triggered with ${expandedIds.length} test(s)`, { variant: 'success' });
      setSelectedTestIds([]);
      router.push('/executions');
    } catch (error) {
      console.error('Failed to trigger execution:', error);
      enqueueSnackbar('Failed to trigger execution', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!selectedFileName) {
        alert('Please select a file first');
        return;
      }
      if (!fileContent) {
        alert('File content not loaded yet. Please wait or re-select the file.');
        return;
      }
      if (!parsedTestCases || parsedTestCases.length === 0) {
        alert('No test cases found in the file. Check file format.');
        return;
      }
      setIsMapping(true);

      try {
        const ext = selectedFileName.split('.').pop()?.toLowerCase();
        const isJsFile = ext === 'js' || ext === 'ts' || ext === 'mjs';

        const selectedCases = selectedCaseIndices.length > 0
          ? selectedCaseIndices.map(idx => parsedTestCases[idx])
          : parsedTestCases;

        if (!selectedCases || selectedCases.length === 0) {
          alert('No test cases selected.');
          setIsMapping(false);
          return;
        }

        const projectName = projectId || 'Default Project';

        // Create tests in batches to avoid overwhelming the backend
        const batchSize = 20;
        const allChildIds: string[] = [];
        for (let i = 0; i < selectedCases.length; i += batchSize) {
          const batch = selectedCases.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(tc =>
              testsApi.create({
                name: tc.name || `${selectedFileName} - Row ${tc.sourceRow}`,
                status: 'ACTIVE',
                tags: ['uploaded', `source:${selectedFileName}`],
                projectName,
                config: {
                  url: tc.url || targetUrl || '',
                  steps: tc.steps || [],
                  _sourceFileName: selectedFileName,
                  _sourceRow: tc.sourceRow,
                  _sourceFileData: tc.sourceData ? [tc.sourceData] : [],
                },
              })
            )
          );
          allChildIds.push(...batchResults.map(r => r.id));
        }

        // Create a parent group test (single card) that references all children
        const allSteps = selectedCases.flatMap(tc =>
          tc.steps.length > 0 ? tc.steps : [{ type: 'navigate', url: tc.url || targetUrl || 'https://example.com', description: 'Navigate to application' }]
        );
        const allSourceData = parsedTestCases.map(p => p.sourceData).filter(sd => sd && Object.keys(sd).length > 0);

        const allUrls = selectedCases.map(tc => tc.url).filter(Boolean);
        const uniqueUrls = [...new Set(allUrls)];
        const groupUrl = uniqueUrls.length === 1 ? uniqueUrls[0] : (targetUrl || '');

        const parentPayload: any = {
          name: selectedFileName.replace(/\.[^/.]+$/, ''),
          status: 'ACTIVE',
          tags: ['uploaded', 'file-group', `source:${selectedFileName}`],
          config: {
            url: groupUrl,
            steps: allSteps,
            _sourceFileName: selectedFileName,
            _sourceFileData: allSourceData,
            _isGroup: true,
            _childTestIds: allChildIds,
            _childUrls: allUrls.length > 0 ? allUrls : undefined,
          },
        };
        parentPayload.projectName = projectName;
        if (isJsFile && typeof fileContent === 'string') {
          parentPayload.code = fileContent;
        }
        const parentTest = await testsApi.create(parentPayload);
        // Cache source data locally for parent group
        sourceDataCache.current.set(parentTest.id, allSourceData);

        enqueueSnackbar(`File "${selectedFileName}" uploaded — ${allChildIds.length} test case(s) created`, { variant: 'success' });

        projectsApi.list().then((projectsList: any[]) => {
          setProjects(projectsList);
          if (projectsList.length > 0) setProjectId(projectsList[0].id);
        }).catch(() => {});
        setIsMapping(false);
        setActiveStep(1);

        // Refresh test list to show parent card
        fetchTestCases();
      } catch (err) {
        console.error('Failed to create test cases:', err);
        enqueueSnackbar('Failed to create test cases from file', { variant: 'error' });
        setIsMapping(false);
      }
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleMapAI = async (tc: any) => {
    enqueueSnackbar(`AI Mapping started for ${tc.name}...`, { variant: 'info' });

    try {
      const configUrl = tc.config?.url || '';
      let aiSteps: any[] = [];

      if (tc.code) {
        const result = parseFileToTestCases(tc.code, `${tc.name}.js`);
        if (result.length > 0) {
          aiSteps = result[0].steps;
        }
      }

      if (!aiSteps || aiSteps.length === 0) {
        aiSteps = [{ type: 'navigate', url: configUrl || 'https://example.com', description: 'Navigate to application' }];
      }

      await testsApi.update(tc.id, {
        config: { ...(tc.config || {}), steps: aiSteps },
        tags: [...(tc.tags || []).filter((t: string) => t !== 'ready'), 'ready'],
        status: 'ACTIVE',
      });
      fetchTestCases();
      enqueueSnackbar(`AI Mapping completed for ${tc.name}`, { variant: 'success' });
    } catch (err) {
      console.error('AI Mapping failed:', err);
      enqueueSnackbar('AI Mapping failed', { variant: 'error' });
    }
  };

  const handleRunTestCase = async (tc: any) => {
    const config = typeof tc.config === 'string' ? JSON.parse(tc.config) : (tc.config || {});

    // If this is a group test, run all child test cases individually
    const isGroup = config._isGroup === true;
    const testIdsToRun = isGroup ? (config._childTestIds || []) : [tc.id];

    if (!isGroup) {
      if (!config.url) {
        enqueueSnackbar('Please set a target URL before running', { variant: 'warning' });
        return;
      }
      if (!tc.code && (!config.steps || !Array.isArray(config.steps) || config.steps.length === 0)) {
        enqueueSnackbar('No test steps found. Upload a test file with steps or add steps in test configuration.', { variant: 'warning' });
        return;
      }
    }

    if (isGroup && testIdsToRun.length === 0) {
      enqueueSnackbar('No child test cases found in this group', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const execution = await executionsApi.create({
        name: isGroup ? `Group Run: ${tc.name} (${testIdsToRun.length} tests)` : `Single Run: ${tc.name}`,
        projectId: tc.projectId,
        testIds: testIdsToRun,
      });
      await executionsApi.start(execution.id);
      enqueueSnackbar(isGroup
        ? `Execution started for ${testIdsToRun.length} test(s) from "${tc.name}"`
        : `Execution started for ${tc.name}`, { variant: 'success' });
      setSelectedTestIds([]);
      router.push('/executions');
    } catch (error) {
      console.error('Failed to run test case:', error);
      enqueueSnackbar('Failed to trigger execution', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const handleViewTestCase = (tc: any) => {
    setViewTc(tc);
  };
  const handleEditTestCase = (tc: any) => {
    setEditTc(tc);
    setEditName(tc.name || '');
    setEditUrl(tc.config?.url || '');
    setEditCode(tc.code || '');
    setEditSteps(tc.config?.steps ? JSON.stringify(tc.config.steps, null, 2) : '');
    setEditSourceData(tc.config?._sourceData ? { ...tc.config._sourceData } : {});
  };
  const handleSaveEdit = async () => {
    if (!editTc) return;
    try {
      setLoading(true);
      let parsedSteps;
      try { parsedSteps = editSteps ? JSON.parse(editSteps) : []; } catch { parsedSteps = []; }
      const config: any = { url: editUrl, steps: parsedSteps };
      if (Object.keys(editSourceData).length > 0) {
        config._sourceData = editSourceData;
      }
      await testsApi.update(editTc.id, {
        name: editName,
        config,
        ...(editCode ? { code: editCode } : {}),
      });
      enqueueSnackbar('Test case updated successfully', { variant: 'success' });
      setEditTc(null);
      await fetchTestCases();
    } catch (error) {
      console.error('Failed to update test case:', error);
      enqueueSnackbar('Failed to update test case', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTestCase = async (id: string) => {
    try {
      setLoading(true);
      // If test has children, delete them first
      const tc = testCases.find(t => t.id === id);
      const childIds = tc?.config?._childTestIds;
      if (Array.isArray(childIds) && childIds.length > 0) {
        await Promise.all(childIds.map((cid: string) =>
          testsApi.delete(cid).catch(() => {})
        ));
      }
      await testsApi.delete(id).catch(() => {});
      enqueueSnackbar('Test case deleted successfully', { variant: 'success' });
      await fetchTestCases();
    } catch (error) {
      console.error('Failed to delete test case:', error);
      enqueueSnackbar('Failed to delete test case', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const handleBulkDelete = async () => {
    if (selectedTestIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedTestIds.length} selected test case(s)? This action cannot be undone.`)) return;
    try {
      setLoading(true);
      // For each selected test that has children, delete children too
      const allIdsToDelete: string[] = [];
      for (const id of selectedTestIds) {
        const tc = testCases.find(t => t.id === id);
        const childIds = tc?.config?._childTestIds;
        if (Array.isArray(childIds) && childIds.length > 0) {
          allIdsToDelete.push(id, ...childIds);
        } else {
          allIdsToDelete.push(id);
        }
      }
      await Promise.all(allIdsToDelete.map(id => testsApi.delete(id).catch(() => {})));
      enqueueSnackbar(`Deleted ${selectedTestIds.length} test case(s)`, { variant: 'success' });
      setSelectedTestIds([]);
      await fetchTestCases();
    } catch (error) {
      console.error('Failed to delete test cases:', error);
      enqueueSnackbar('Failed to delete some test cases', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Box>
      <PageHeader
        title="Test Cases"
        subtitle="Manage, upload and AI-map your test cases"
        actions={
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setOpen(true)}>
            Upload Center
          </Button>
        }
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx,.xls,.csv,.json,.js,.ts,.mjs"
        onChange={handleFileSelect}
      />

      {!loading && displayedTestCases.length > 0 && (
        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Checkbox
            checked={displayedTestCases.length > 0 && selectedTestIds.length === displayedTestCases.length}
            indeterminate={selectedTestIds.length > 0 && selectedTestIds.length < displayedTestCases.length}
            onChange={selectAll}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {selectedTestIds.length} of {displayedTestCases.length} selected
          </Typography>
          <ButtonGroup size="small" variant="contained" disabled={selectedTestIds.length === 0}>
            <Button
              startIcon={<SmokeIcon />}
              onClick={() => handleExecute('Smoke Suite', selectedTestIds)}
            >
              Run Smoke
            </Button>
            <Button
              startIcon={<RegressionIcon />}
              color="secondary"
              onClick={() => handleExecute('Regression Suite', selectedTestIds)}
            >
              Run Regression
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              onClick={handleBulkDelete}
            >
              Delete ({selectedTestIds.length})
            </Button>
          </ButtonGroup>
        </Box>
      )}

      <Grid container spacing={2.5}>
        {displayedTestCases.map((tc) => (
          <Grid item xs={12} md={4} key={tc.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2.5,
                border: selectedTestIds.includes(tc.id) ? '2px solid' : '1px solid',
                borderColor: selectedTestIds.includes(tc.id) ? 'primary.main' : 'divider',
                transition: 'box-shadow 0.2s, transform 0.15s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Checkbox
                      checked={selectedTestIds.includes(tc.id)}
                      onChange={() => toggleSelect(tc.id)}
                      size="small"
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>{tc.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{tc.id?.slice(0, 8) || ''}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                    <Chip
                      label={tc.status === 'ACTIVE' ? 'Ready' : tc.status === 'DRAFT' ? 'Draft' : tc.status}
                      size="small"
                      color={tc.status === 'ACTIVE' ? 'success' : 'warning'}
                    />
                    <IconButton size="small" color="error" onClick={() => handleDeleteTestCase(tc.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                  {tc.config?._isGroup ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} color="primary.main">{tc.config._childTestIds?.length || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">test cases</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tc.config?.steps?.length > 0 ? 'success.main' : 'grey.300' }} />
                        <Typography variant="body2" color="text.secondary">{tc.config?.steps?.length || 0} total steps</Typography>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tc.config?.steps?.length > 0 ? 'success.main' : 'grey.300' }} />
                      <Typography variant="body2" color="text.secondary">{tc.config?.steps?.length || 0} steps</Typography>
                    </Box>
                  )}
                  {tc.project?.name && (
                    <Chip label={tc.project.name} size="small" variant="outlined" color="primary" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem', px: 0.5 } }} />
                  )}
                </Box>
                {tc.config?._isGroup ? (
                  tc.config?._childUrls && tc.config._childUrls.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      {tc.config._childUrls.slice(0, 2).map((u: string, i: number) => (
                        <Typography key={i} variant="caption" color="info.main" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', bgcolor: 'rgba(2, 136, 209, 0.08)', px: 0.8, py: 0.3, borderRadius: 0.5, display: 'inline-block', mr: 0.5, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u}
                        </Typography>
                      ))}
                      {tc.config._childUrls.length > 2 && (
                        <Typography variant="caption" color="text.secondary">+{tc.config._childUrls.length - 2} more</Typography>
                      )}
                    </Box>
                  )
                ) : tc.config?.url && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="info.main" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', bgcolor: 'rgba(2, 136, 209, 0.08)', px: 0.8, py: 0.3, borderRadius: 0.5, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tc.config.url}
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 'auto', pt: 1 }}>
                  Added: {tc.createdAt ? new Date(tc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, alignItems: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                  <Tooltip title="View details">
                    <IconButton size="small" color="default" onClick={() => handleViewTestCase(tc)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit test case">
                    <IconButton size="small" color="default" onClick={() => handleEditTestCase(tc)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  {!tc.config?._isGroup && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AIIcon />}
                      onClick={() => handleMapAI(tc)}
                      disabled={tc.status === 'ACTIVE'}
                      sx={{ minWidth: 0, px: 1.2, fontSize: '0.7rem' }}
                    >
                      AI Map
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<RunIcon />}
                    onClick={() => handleRunTestCase(tc)}
                    sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem' }}
                  >
                    {tc.config?._isGroup ? `Run All (${tc.config._childTestIds?.length || 0})` : 'Run'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => { setOpen(false); setActiveStep(0); setSelectedFileName(null); setFileContent(null); setParsedTestCases(null); setSelectedCaseIndices([]); setSelectedEnvId(''); setTargetUrl(''); setIsMapping(false); }} fullWidth maxWidth="md">
        <DialogTitle>Test Case Upload Center</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} sx={{ py: 3 }}>
            {wizardSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  options={projects.map((p: any) => p.name)}
                  value={projectId}
                  onInputChange={(_, newValue) => setProjectId(newValue)}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Project Name" placeholder="Select or type a project name" />
                  )}
                  sx={{ mb: 1.5 }}
                />
                {environments.length > 0 ? (
                  <TextField
                    select
                    fullWidth
                    label="Environment"
                    value={selectedEnvId}
                    onChange={(e) => {
                      const envId = e.target.value;
                      setSelectedEnvId(envId);
                      const env = environments.find((en: any) => en.id === envId);
                      if (env) setTargetUrl(env.baseUrl);
                    }}
                    size="small"
                    SelectProps={{ native: true }}
                  >
                    {environments.map((env: any) => (
                      <option key={env.id} value={env.id}>{env.name} ({env.baseUrl})</option>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    fullWidth
                    label="Target URL"
                    placeholder="https://example.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    size="small"
                    helperText="No environments found. Enter URL manually or create an environment."
                  />
                )}
                {targetUrl && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Target URL: <code>{targetUrl}</code>
                  </Typography>
                )}
              </Box>
              <Box sx={{ py: 4, textAlign: 'center', border: '2px dashed', borderColor: selectedFileName ? 'success.main' : 'divider', borderRadius: 2, bgcolor: selectedFileName ? 'rgba(76, 175, 80, 0.08)' : 'transparent' }}>
                <UploadIcon sx={{ fontSize: 48, color: selectedFileName ? 'success.main' : 'text.secondary', mb: 2 }} />
                <Typography variant="h6">
                  {selectedFileName ? `Selected: ${selectedFileName}` : 'Select an Excel/CSV/JSON file'}
                </Typography>
                <Typography variant="body2" color="text.secondary">Supported formats: .xlsx, .csv, .json</Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={triggerFileInput}>
                  {selectedFileName ? 'Change File' : 'Select File'}
                </Button>
              </Box>

              {parsedTestCases && parsedTestCases.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" icon={<TestCasesIcon />} sx={{ mb: 1 }}>
                    Found {parsedTestCases.length} test case(s) in this file. Select which ones to create:
                  </Alert>
                  <Box sx={{ maxHeight: 250, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <FormLabel sx={{ display: 'flex', alignItems: 'center', mb: 0.5, px: 1 }}>
                      <Checkbox
                        size="small"
                        checked={selectedCaseIndices.length === parsedTestCases.length}
                        indeterminate={selectedCaseIndices.length > 0 && selectedCaseIndices.length < parsedTestCases.length}
                        onChange={() => {
                          if (selectedCaseIndices.length === parsedTestCases.length) {
                            setSelectedCaseIndices([]);
                          } else {
                            setSelectedCaseIndices(parsedTestCases.map((_, idx) => idx));
                          }
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>
                        {selectedCaseIndices.length === 0 ? 'None selected' : `${selectedCaseIndices.length} of ${parsedTestCases.length} selected`}
                      </Typography>
                    </FormLabel>
                    {parsedTestCases.map((tc, idx) => (
                      <Box key={idx}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 1, py: 0.5, bgcolor: selectedCaseIndices.includes(idx) ? 'action.selected' : 'transparent', borderRadius: 0.5 }}>
                          <Checkbox
                            size="small"
                            sx={{ mt: 0.3 }}
                            checked={selectedCaseIndices.includes(idx)}
                            onChange={() => {
                              setSelectedCaseIndices(prev =>
                                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                              );
                            }}
                          />
                          <Box sx={{ ml: 0.5, flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600}>{tc.name}</Typography>
                            {tc.sourceData && Object.keys(tc.sourceData).length > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mt: 0.2, wordBreak: 'break-word' }}>
                                {Object.entries(tc.sourceData).map(([key, val]) => {
                                  const displayVal = val.length > 40 ? val.substring(0, 40) + '...' : val;
                                  return `${key}: ${displayVal}`;
                                }).join(' | ')}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                              {tc.steps.length} step(s){tc.url ? ` | URL: ${tc.url.substring(0, 50)}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {isMapping && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>Creating Test Cases...</Typography>
              <LinearProgress sx={{ mt: 2 }} />
              <Typography variant="body2" sx={{ mt: 2 }}>Parsing test cases and creating them in the system...</Typography>
            </Box>
          )}

          {activeStep === 1 && !isMapping && (
            <Box>
              <Alert icon={<SuccessIcon />} severity="success" sx={{ mb: 2 }}>
                Uploaded "{selectedFileName}" — {parsedTestCases?.length || 0} test case(s) combined into one test
              </Alert>
              {parsedTestCases && parsedTestCases.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Test Case Name</TableCell>
                        <TableCell>File Data</TableCell>
                        <TableCell>Steps</TableCell>
                        <TableCell>URL</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedTestCases.map((tc, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell><strong>{tc.name}</strong></TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            {tc.sourceData && Object.keys(tc.sourceData).length > 0 ? (
                              <Typography variant="caption" sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                                {Object.entries(tc.sourceData).map(([key, val]) => {
                                  const displayVal = val.length > 50 ? val.substring(0, 50) + '...' : val;
                                  return `${key}: ${displayVal}`;
                                }).join(' | ')}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>{tc.steps.length} step(s)</TableCell>
                          <TableCell><code>{tc.url || targetUrl || '-'}</code></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  All test cases are combined into a single test record. Use View/Edit on the card to see the full file content. Run the test to execute all steps.
                </Typography>
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>Ready for Execution!</Typography>
              <Typography variant="body1" color="text.secondary">
                Your uploaded test case is mapped. Select existing tests or run just the uploaded one.
              </Typography>
              {displayedTestCases.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'left', maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Also include existing tests:</Typography>
                  {displayedTestCases.map((tc) => (
                    <Box key={tc.id} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={selectedTestIds.includes(tc.id)}
                        onChange={() => toggleSelect(tc.id)}
                      />
                      <Typography variant="body2">{tc.name}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SmokeIcon />}
                  onClick={() => handleExecute('Smoke Suite')}
                >
                  Smoke Suite
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<RegressionIcon />}
                  onClick={() => handleExecute('Regression Suite')}
                >
                  Regression Suite
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext} disabled={isMapping}>
              {activeStep === 0 ? 'Upload & Map' : 'Confirm Mapping'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Test Case Dialog */}
      <Dialog open={!!viewTc} onClose={() => setViewTc(null)} fullWidth maxWidth="md">
        <DialogTitle>Test Case Details</DialogTitle>
        <DialogContent dividers>
          {viewTc && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">ID</Typography>
                <Typography variant="body2">{viewTc.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                <Typography variant="body1" fontWeight={600}>{viewTc.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip label={viewTc.status} size="small" color={viewTc.status === 'ACTIVE' ? 'success' : 'warning'} />
              </Box>
              {(() => {
                const srcData = sourceDataCache.current.has(viewTc.id)
                  ? sourceDataCache.current.get(viewTc.id)
                  : (Array.isArray(viewTc.config?._sourceFileData) ? viewTc.config._sourceFileData : null);
                return srcData && srcData.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Source File: {viewTc.config?._sourceFileName || 'uploaded file'} ({srcData.length} rows)
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5, maxHeight: 350 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', width: 40 }}>#</TableCell>
                            {Object.keys(srcData[0]).map(col => (
                              <TableCell key={col} sx={{ fontWeight: 600, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{col}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {srcData.map((row: Record<string, string>, idx: number) => (
                            <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                              <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{idx + 1}</TableCell>
                              {Object.keys(srcData[0]).map(col => (
                                <TableCell key={col} sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {row[col] || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : null;
              })()}
              {viewTc.config?.url && (
                <Box>
                  <Typography variant="caption" color="text.secondary">URL</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{viewTc.config.url}</Typography>
                </Box>
              )}
              {viewTc.config?.steps && viewTc.config.steps.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Steps ({viewTc.config.steps.length})</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Selector / URL</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {viewTc.config.steps.map((step: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell><Chip label={step.type} size="small" variant="outlined" /></TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{step.selector || step.url || '-'}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{step.value || '-'}</TableCell>
                            <TableCell>{step.description || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              {viewTc.code && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Code</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: '#f5f5f5', maxHeight: 300, overflow: 'auto' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{viewTc.code}</Typography>
                  </Paper>
                </Box>
              )}
              {viewTc.tags && viewTc.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Tags</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {viewTc.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              {viewTc.project && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2">{viewTc.project.name}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2">{viewTc.createdAt ? new Date(viewTc.createdAt).toLocaleString('en-IN') : 'N/A'}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewTc(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Test Case Dialog */}
      <Dialog open={!!editTc} onClose={() => setEditTc(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Test Case</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Name" value={editName} onChange={e => setEditName(e.target.value)} fullWidth size="small" />
            <TextField label="URL" value={editUrl} onChange={e => setEditUrl(e.target.value)} fullWidth size="small" placeholder="https://example.com" />
            {editTc && (() => {
              const srcData = sourceDataCache.current.has(editTc.id)
                ? sourceDataCache.current.get(editTc.id)
                : (Array.isArray(editTc.config?._sourceFileData) ? editTc.config._sourceFileData : null);
              return srcData && srcData.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Source File: {editTc.config?._sourceFileName || 'uploaded'} ({srcData.length} rows)
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', width: 36 }}>#</TableCell>
                          {Object.keys(srcData[0]).map(col => (
                            <TableCell key={col} sx={{ fontWeight: 600, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>{col}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {srcData.map((row: Record<string, string>, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{idx + 1}</TableCell>
                            {Object.keys(srcData[0]).map(col => (
                              <TableCell key={col} sx={{ fontSize: '0.7rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[col] || '-'}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : null;
            })()}
            <TextField
              label="Steps (JSON array)"
              value={editSteps}
              onChange={e => setEditSteps(e.target.value)}
              fullWidth
              multiline
              rows={6}
              size="small"
              placeholder='[{"type":"navigate","url":"https://..."},{"type":"click","selector":"..."}]'
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              helperText="Edit steps as JSON array. Each step: type, selector/url, value, description."
            />
            <TextField
              label="Code (optional)"
              value={editCode}
              onChange={e => setEditCode(e.target.value)}
              fullWidth
              multiline
              rows={4}
              size="small"
              placeholder="// JavaScript code for this test case"
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTc(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={!editName.trim() || loading}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
