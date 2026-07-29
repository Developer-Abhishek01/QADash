'use client';

import {
  Box, Card, CardContent, Typography, Button, TextField, Chip, Paper, Alert,
  Grid, Table, TableBody, TableCell, TableHead, TableRow,
  TablePagination,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  FileText, Upload, Download, FileCode, Loader2,
  Sparkles, BookOpen, ListChecks, Beaker, Eye,
  ChevronDown, ChevronRight, Copy,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { useParseDocument, useUploadDocument, useGenerateTests } from '@/lib/requirements/hooks';

interface Requirement {
  id: string;
  title: string;
  module: string;
  priority: string;
}

interface TestCase {
  test_case_id: string;
  module: string;
  requirement_ref: string;
  test_scenario: string;
  test_type: string;
  positive_negative: string;
  preconditions: string;
  test_steps: string[];
  action: string;
  test_data: string;
  expected_result: string;
  priority: string;
  severity: string;
  role: string;
  status?: string;
}

interface TestGroup {
  display_name?: string;
  count: number;
  test_cases: TestCase[];
}

interface ParsedResult {
  id?: string;
  file_url?: string;
  document_type?: string;
  functional_requirements?: Requirement[];
  summary?: {
    total_sections: number;
    total_functional_requirements: number;
    total_use_cases: number;
    total_constraints: number;
  };
  business_objectives?: { description: string }[];
  error?: boolean;
  message?: string;
}

interface GeneratedTests {
  test_cases: TestCase[];
  groups?: Record<string, TestGroup>;
  empty_reqs?: boolean;
  message?: string;
}

const NO_REQS_ERROR = 'No functional requirements found in parsed document. Try re-parsing with a different format or ensure the document contains requirement statements (e.g., "The system shall...").';



export default function RequirementsPage() {
  const [documentText, setDocumentText] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [generatedTests, setGeneratedTests] = useState<GeneratedTests | null>(null);
  const [selectedFramework, setSelectedFramework] = useState('playwright');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const expandAll = () => {
    if (!groups) return;
    const all: Record<string, boolean> = {};
    for (const key of Object.keys(groups)) all[key] = true;
    setExpandedGroups(all);
  };
  const collapseAll = () => setExpandedGroups({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = useParseDocument();
  const uploadMutation = useUploadDocument();
  const generateMutation = useGenerateTests();

  const handleParse = async () => {
    if (!documentText.trim()) return;
    setParsedResult(null);
    setGeneratedTests(null);
    const result = await parseMutation.mutateAsync({ document: documentText }) as ParsedResult;
    setParsedResult(result);
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;
    setParsedResult(null);
    setGeneratedTests(null);
    const docType = /\.brd/i.test(uploadedFile.name) ? 'BRD' : 'FRD';
    try {
      const res = await uploadMutation.mutateAsync({ file: uploadedFile, documentType: docType }) as ParsedResult;
      setParsedResult(res);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'File upload failed';
      setParsedResult({ error: true, message: msg });
      console.error('upload error:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
      setDocumentText('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setDocumentText('');
    }
  };

  const handleGenerateTests = async () => {
    if (!parsedResult) return;
    const reqs = parsedResult.functional_requirements || [];
    if (!reqs.length) {
      setGeneratedTests({ empty_reqs: true, message: NO_REQS_ERROR, test_cases: [] });
      return;
    }
    setGeneratedTests(null);
    try {
      const res = await generateMutation.mutateAsync({
        requirements: reqs,
        framework: selectedFramework,
        documentId: parsedResult.id,
      }) as GeneratedTests;
      console.log('generateTests response:', res);
      if (!res || !res.test_cases) {
        console.error('generateTests: missing test_cases in response', res);
        setGeneratedTests({ empty_reqs: true, message: 'Server returned empty test cases', test_cases: [] });
        return;
      }
      setGeneratedTests(res);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Test generation failed';
      setGeneratedTests({ empty_reqs: true, message: msg, test_cases: [] });
      console.error('generateTests error:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const downloadExcel = async (tests: TestCase[], groupName?: string) => {
    const XLSX = await import('xlsx');
    const rows = tests.map((tc: TestCase) => ({
      'Test Case ID': tc.test_case_id || '',
      'Module': tc.module || '',
      'Requirement/User Story Ref': tc.requirement_ref || '',
      'Test Scenario': tc.test_scenario || '',
      'Test Type': tc.test_type || '',
      'Positive/Negative': tc.positive_negative || '',
      'Preconditions': tc.preconditions || '',
      'Test Steps': (tc.test_steps || []).join('\n'),
      'Action': tc.action || '',
      'Test Data': tc.test_data || '',
      'Expected Result': tc.expected_result || '',
      'Priority': tc.priority || '',
      'Severity': tc.severity || '',
      'Role': tc.role || '',
      'Status': tc.status || 'Draft',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 40 },
      { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 50 },
      { wch: 30 }, { wch: 30 }, { wch: 40 }, { wch: 10 },
      { wch: 10 }, { wch: 16 }, { wch: 10 },
    ];
    ws['!cols'] = colWidths;
    const sheetName = groupName ? groupName.slice(0, 31) : 'Test Cases';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const date = new Date().toISOString().slice(0, 10);
    const suffix = groupName ? `_${groupName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}` : '';
    XLSX.writeFile(wb, `test_cases${suffix}_${date}.xlsx`);
  };

  const requirementsList = parsedResult?.functional_requirements || [];
  const testCases = generatedTests?.test_cases || [];
  const groups = generatedTests?.groups || null;
  const groupEntries = groups ? Object.entries(groups) : [];
  const isParsing = parseMutation.isPending || uploadMutation.isPending;
  const isGenerating = generateMutation.isPending;

  useEffect(() => {
    if (groups) expandAll();
  }, [generatedTests]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 6 }}>
      <Card sx={{ borderRadius: 2.5, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)', height: 160, position: 'relative', overflow: 'hidden', mb: 3, boxShadow: '0 8px 32px rgba(79,70,229,0.25)' }}>
        <CardContent sx={{ p: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
            <FileText size={24} color="#FCD34D" />
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '2rem', letterSpacing: '-0.025em', lineHeight: 1.15 }}>FRD / BRD to Test Cases</Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 400, fontSize: '0.95rem', maxWidth: 500 }}>
            Upload or paste Functional/Business Requirements Documents and generate AI-powered test cases
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2.5, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
            <CardContent sx={{ p: '24px', '&:last-child': { pb: '24px' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', '& svg': { width: 20, height: 20 } }}><FileText /></Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>FRD / BRD Document</Typography>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.78rem', mt: 0.15 }}>Paste or upload your requirements document</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                <Chip label="Paste Text" icon={<FileText size={14} />} clickable size="small"
                  onClick={() => { setInputMode('paste'); setUploadedFile(null); }}
                  sx={{ borderRadius: 1.5, height: 30, fontSize: '0.72rem', fontWeight: 600, bgcolor: inputMode === 'paste' ? alpha('#4F46E5', 0.1) : alpha('#E2E8F0', 0.3), color: inputMode === 'paste' ? '#4F46E5' : '#64748B', border: '1px solid', borderColor: inputMode === 'paste' ? alpha('#4F46E5', 0.3) : 'transparent' }} />
                <Chip label="Upload File" icon={<Upload size={14} />} clickable size="small"
                  onClick={() => { setInputMode('upload'); setDocumentText(''); }}
                  sx={{ borderRadius: 1.5, height: 30, fontSize: '0.72rem', fontWeight: 600, bgcolor: inputMode === 'upload' ? alpha('#4F46E5', 0.1) : alpha('#E2E8F0', 0.3), color: inputMode === 'upload' ? '#4F46E5' : '#64748B', border: '1px solid', borderColor: inputMode === 'upload' ? alpha('#4F46E5', 0.3) : 'transparent' }} />
              </Box>

              {inputMode === 'paste' ? (
                <>
                  <TextField fullWidth multiline rows={16} placeholder={`Paste your FRD or BRD document here...\n\nExample:\nFR-001: The system shall allow users to register\nFR-002: The system shall allow users to login`}
                    value={documentText} onChange={(e) => setDocumentText(e.target.value)}
                    sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: alpha('#F8FAFC', 0.6), fontSize: '0.82rem', fontFamily: '"Cascadia Code", "Fira Code", monospace', lineHeight: 1.7, '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#E2E8F0', 0.8) }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#4F46E5', 0.3) }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5', borderWidth: '1.5px' } } }} />
                  <Button variant="contained" disableElevation fullWidth endIcon={isParsing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                    onClick={handleParse} disabled={isParsing || !documentText.trim()}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', height: 46, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(79,70,229,0.25)', '&:hover': { boxShadow: '0 6px 24px rgba(79,70,229,0.35)', transform: 'translateY(-1.5px)' }, '&:disabled': { background: alpha('#E2E8F0', 0.6), color: alpha('#94A3B8', 0.5), boxShadow: 'none' } }}>
                    {isParsing ? 'Parsing...' : 'Parse Document'}
                  </Button>
                </>
              ) : (
                <>
                  <Box onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                    sx={{ border: '2px dashed', borderColor: uploadedFile ? alpha('#4F46E5', 0.4) : alpha('#CBD5E1', 0.6), borderRadius: 2, p: 4, mb: 2.5, textAlign: 'center', cursor: 'pointer', bgcolor: alpha('#F8FAFC', 0.4), transition: 'all 0.2s', '&:hover': { borderColor: alpha('#4F46E5', 0.4), bgcolor: alpha('#4F46E5', 0.03) } }}>
                    <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.txt" onChange={handleFileSelect} />
                    {uploadedFile ? (
                      <Box>
                        <FileCode size={36} color="#4F46E5" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                        <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.88rem' }}>{uploadedFile.name}</Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.72rem', mt: 0.25 }}>{(uploadedFile.size / 1024).toFixed(1)} KB</Typography>
                        <Chip label="Change file" size="small" onClick={() => fileInputRef.current?.click()}
                          sx={{ mt: 1, borderRadius: 1, height: 24, fontSize: '0.66rem', bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5' }} />
                      </Box>
                    ) : (
                      <Box>
                        <Upload size={36} color="#94A3B8" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                        <Typography sx={{ fontWeight: 500, color: '#64748B', fontSize: '0.88rem' }}>Drop file here or click to browse</Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.72rem', mt: 0.5 }}>Supports PDF, DOCX, XLSX, TXT</Typography>
                      </Box>
                    )}
                  </Box>
                  <Button variant="contained" disableElevation fullWidth endIcon={isParsing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                    onClick={handleFileUpload} disabled={isParsing || !uploadedFile}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', height: 46, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(79,70,229,0.25)', '&:hover': { boxShadow: '0 6px 24px rgba(79,70,229,0.35)', transform: 'translateY(-1.5px)' }, '&:disabled': { background: alpha('#E2E8F0', 0.6), color: alpha('#94A3B8', 0.5), boxShadow: 'none' } }}>
                    {isParsing ? 'Uploading & Parsing...' : 'Upload & Parse Document'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2.5, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
            <CardContent sx={{ p: '24px', '&:last-child': { pb: '24px' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', '& svg': { width: 20, height: 20 } }}><BookOpen /></Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>Parsed Requirements</Typography>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.78rem', mt: 0.15 }}>Extracted functional requirements from your document</Typography>
                </Box>
                {parsedResult && (
                  <>
                    {parsedResult.file_url && (
                      <Button component="a" href={parsedResult.file_url} target="_blank" size="small" disableElevation startIcon={<Eye size={14} />}
                        sx={{ ml: 'auto', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', height: 26, px: 1.5, color: '#4F46E5', bgcolor: alpha('#4F46E5', 0.08), '&:hover': { bgcolor: alpha('#4F46E5', 0.15) } }}>
                        View File
                      </Button>
                    )}
                    <Chip label={parsedResult.document_type} size="small" sx={{ height: 24, fontSize: '0.65rem', fontWeight: 700, bgcolor: parsedResult.document_type === 'BRD' ? alpha('#8B5CF6', 0.1) : alpha('#7C3AED', 0.1), color: parsedResult.document_type === 'BRD' ? '#8B5CF6' : '#7C3AED', border: '1px solid', borderColor: parsedResult.document_type === 'BRD' ? alpha('#8B5CF6', 0.2) : alpha('#7C3AED', 0.2) }} />
                  </>
                )}
              </Box>

              {!parsedResult && !isParsing && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: '#CBD5E1' }}>
                  <FileText size={48} strokeWidth={1.5} />
                  <Typography sx={{ mt: 2, color: '#94A3B8', fontWeight: 500, fontSize: '0.85rem' }}>No document parsed yet</Typography>
                  <Typography sx={{ color: '#CBD5E1', fontSize: '0.75rem' }}>Paste a document on the left and click Parse</Typography>
                </Box>
              )}

              {isParsing && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 8 }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#4F46E5" />
                  <Typography sx={{ color: '#64748B', fontWeight: 500, fontSize: '0.85rem' }}>Parsing document...</Typography>
                </Box>
              )}

              {parsedResult && !isParsing && (
                <>
                  {parsedResult.summary && (
                    <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                      {[
                        { label: 'Sections', value: parsedResult.summary.total_sections },
                        { label: 'Functional Reqs', value: parsedResult.summary.total_functional_requirements },
                        { label: 'Use Cases', value: parsedResult.summary.total_use_cases },
                        { label: 'Constraints', value: parsedResult.summary.total_constraints },
                      ].map((stat) => (
                        <Grid item xs={3} key={stat.label}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: alpha('#4F46E5', 0.04), borderRadius: 1.5 }}>
                            <Typography sx={{ fontWeight: 700, color: '#4F46E5', fontSize: '1.1rem' }}>{stat.value || '-'}</Typography>
                            <Typography sx={{ color: '#94A3B8', fontSize: '0.62rem', fontWeight: 500, mt: 0.25 }}>{stat.label}</Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}

                  {parsedResult.business_objectives && parsedResult.business_objectives.length > 0 && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem', mb: 1 }}>Business Objectives</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {parsedResult.business_objectives.map((obj: { description: string }, i: number) => (
                          <Chip key={i} label={obj.description} size="small" sx={{ borderRadius: 1, height: 24, fontSize: '0.68rem', bgcolor: alpha('#8B5CF6', 0.06), color: '#6D28D9', border: '1px solid', borderColor: alpha('#8B5CF6', 0.1) }} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#64748B', bgcolor: alpha('#F8FAFC', 0.8) }}>ID</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#64748B', bgcolor: alpha('#F8FAFC', 0.8) }}>Requirement</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#64748B', bgcolor: alpha('#F8FAFC', 0.8) }}>Module</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#64748B', bgcolor: alpha('#F8FAFC', 0.8) }}>Priority</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {requirementsList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((req: Requirement, i: number) => (
                          <TableRow key={req.id || i} sx={{ '&:hover': { bgcolor: alpha('#F8FAFC', 0.5) } }}>
                            <TableCell><Chip label={req.id} size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600, bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5' }} /></TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</TableCell>
                            <TableCell><Chip label={req.module} size="small" sx={{ height: 20, fontSize: '0.62rem', bgcolor: alpha('#6366F1', 0.06), color: '#4F46E5' }} /></TableCell>
                            <TableCell><Chip label={req.priority} size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600, bgcolor: req.priority === 'high' || req.priority === 'critical' ? alpha('#EF4444', 0.08) : alpha('#F59E0B', 0.08), color: req.priority === 'high' || req.priority === 'critical' ? '#DC2626' : '#D97706' }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {requirementsList.length > rowsPerPage && (
                      <TablePagination component="div" count={requirementsList.length} page={page} onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
                    )}
                  </Box>

                  {requirementsList.length > 0 && (
                    <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Chip label="Framework" size="small" sx={{ height: 24, fontSize: '0.68rem', color: '#64748B' }} />
                      {['playwright', 'cypress', 'pytest'].map((fw) => (
                        <Chip key={fw} label={fw} size="small" clickable onClick={() => setSelectedFramework(fw)}
                          sx={{ borderRadius: 1.5, height: 28, fontSize: '0.7rem', fontWeight: 600, bgcolor: selectedFramework === fw ? alpha('#4F46E5', 0.1) : alpha('#E2E8F0', 0.3), color: selectedFramework === fw ? '#4F46E5' : '#64748B', border: '1px solid', borderColor: selectedFramework === fw ? alpha('#4F46E5', 0.3) : alpha('#E2E8F0', 0.5), '&:hover': { bgcolor: alpha('#4F46E5', 0.08) } }} />
                      ))}
                      <Button variant="contained" disableElevation size="small" endIcon={isGenerating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Beaker size={14} />}
                        onClick={handleGenerateTests} disabled={isGenerating}
                        sx={{ ml: 'auto', borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', height: 32, px: 2.5, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(79,70,229,0.2)', '&:disabled': { background: alpha('#E2E8F0', 0.6), color: alpha('#94A3B8', 0.5), boxShadow: 'none' } }}>
                        {isGenerating ? 'Generating...' : 'Generate Test Cases'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {generatedTests && generatedTests.empty_reqs && (
        <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
          {generatedTests.message}
        </Alert>
      )}

      {generatedTests && !generatedTests.empty_reqs && (
        <Card sx={{ borderRadius: 2.5, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)', mt: 3 }}>
          <CardContent sx={{ p: '24px', '&:last-child': { pb: '24px' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha('#4F46E5', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', '& svg': { width: 20, height: 20 } }}><ListChecks /></Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>Generated Test Cases ({testCases.length})</Typography>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.78rem', mt: 0.15 }}>AI-generated test cases from your requirements using {selectedFramework}</Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                  {groupEntries.length > 1 && (
                    <>
                      <Button size="small" disableElevation startIcon={<ChevronDown size={14} />} onClick={expandAll}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.68rem', height: 28, px: 1.5, color: '#4F46E5', bgcolor: alpha('#4F46E5', 0.06), '&:hover': { bgcolor: alpha('#4F46E5', 0.12) } }}>
                        Expand All
                      </Button>
                      <Button size="small" disableElevation startIcon={<ChevronRight size={14} />} onClick={collapseAll}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.68rem', height: 28, px: 1.5, color: '#64748B', bgcolor: alpha('#94A3B8', 0.06), '&:hover': { bgcolor: alpha('#94A3B8', 0.12) } }}>
                        Collapse All
                      </Button>
                    </>
                  )}
                  <Button size="small" disableElevation startIcon={<Download size={14} />} onClick={() => downloadExcel(testCases)}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', height: 32, px: 2, color: '#059669', bgcolor: alpha('#059669', 0.08), '&:hover': { bgcolor: alpha('#059669', 0.15) } }}>
                    Export Excel
                  </Button>
                  <Button size="small" disableElevation startIcon={<Copy size={14} />} onClick={() => handleCopy(JSON.stringify(generatedTests, null, 2))}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', height: 32, px: 2, color: '#64748B', bgcolor: alpha('#94A3B8', 0.08) }}>
                    Export JSON
                  </Button>
                </Box>
              </Box>

            <Box sx={{ border: '1px solid', borderColor: alpha('#E2E8F0', 0.6), borderRadius: 1.5, overflow: 'hidden' }}>
              {groupEntries.length > 0 ? (
                groupEntries.map(([key, group]: [string, TestGroup]) => {
                  const isExpanded = expandedGroups[key];
                  const rawName = group.display_name || key || 'General';
                  const displayName = rawName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                  return (
                    <Box key={key} sx={{ '&:not(:last-child)': { borderBottom: '2px solid', borderColor: alpha('#E2E8F0', 0.7) } }}>
                      <Box onClick={() => toggleGroup(key)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, cursor: 'pointer', bgcolor: isExpanded ? alpha('#EEF2FF', 0.3) : '#fff', '&:hover': { bgcolor: alpha('#EEF2FF', 0.5) }, userSelect: 'none', transition: 'all 0.15s' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                          <ChevronRight size={18} color="#4F46E5" />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem', lineHeight: 1.3 }}>{displayName}</Typography>
                          <Typography sx={{ color: '#94A3B8', fontSize: '0.68rem', mt: 0.2 }}>
                            <Box component="span" sx={{ fontWeight: 600, color: '#4F46E5' }}>{group.count}</Box> test case{group.count !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                          <Button size="small" disableElevation startIcon={<Download size={12} />} onClick={(e) => { e.stopPropagation(); downloadExcel(group.test_cases, displayName); }}
                            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.63rem', height: 26, px: 1, color: '#059669', bgcolor: alpha('#059669', 0.08), '&:hover': { bgcolor: alpha('#059669', 0.15) }, minWidth: 0 }}>
                            Export
                          </Button>
                          <Chip label={isExpanded ? 'Hide' : 'View'} size="small" icon={<Eye size={12} />} onClick={(e) => { e.stopPropagation(); toggleGroup(key); }}
                            sx={{ height: 26, fontSize: '0.65rem', fontWeight: 600, borderRadius: 1, bgcolor: isExpanded ? alpha('#4F46E5', 0.1) : alpha('#E2E8F0', 0.5), color: isExpanded ? '#4F46E5' : '#64748B' }} />
                        </Box>
                      </Box>
                      {isExpanded && (
                        <Box sx={{ borderTop: '1px solid', borderColor: alpha('#E2E8F0', 0.4), bgcolor: '#fff' }}>
                          <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
                            <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: alpha('#E2E8F0', 0.3), fontSize: '0.65rem', py: 0.6, px: 1.2, whiteSpace: 'normal', wordBreak: 'break-word' } }}>
                              <TableHead>
                                <TableRow>
                                  {[
                                    { label: 'Test Case ID', minW: 110 },
                                    { label: 'Module', minW: 100 },
                                    { label: 'Req Ref', minW: 80 },
                                    { label: 'Test Scenario', minW: 200 },
                                    { label: 'Test Type', minW: 80 },
                                    { label: 'Pos/Neg', minW: 70 },
                                    { label: 'Preconditions', minW: 160 },
                                    { label: 'Test Steps', minW: 220 },
                                    { label: 'Action', minW: 140 },
                                    { label: 'Test Data', minW: 150 },
                                    { label: 'Expected Result', minW: 200 },
                                    { label: 'Priority', minW: 70 },
                                    { label: 'Severity', minW: 70 },
                                    { label: 'Role', minW: 90 },
                                    { label: 'Status', minW: 70 },
                                  ].map(h => (
                                    <TableCell key={h.label} sx={{ fontWeight: 700, color: '#475569', bgcolor: '#F1F5F9', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: h.minW, whiteSpace: 'nowrap' }}>{h.label}</TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {group.test_cases.map((tc: TestCase, i: number) => (
                                  <TableRow key={tc.test_case_id || i} sx={{ '&:hover': { bgcolor: alpha('#F8FAFC', 0.8) }, '&:nth-of-type(even)': { bgcolor: alpha('#FAFAFA', 0.4) } }}>
                                    <TableCell sx={{ fontWeight: 600, color: '#4F46E5', fontSize: '0.6rem', fontFamily: 'monospace' }}>{tc.test_case_id}</TableCell>
                                    <TableCell sx={{ color: '#0F172A', fontSize: '0.63rem' }}>{tc.module}</TableCell>
                                    <TableCell sx={{ color: '#64748B', fontSize: '0.6rem' }}>{tc.requirement_ref}</TableCell>
                                    <TableCell sx={{ color: '#0F172A', fontSize: '0.63rem', fontWeight: 500, maxWidth: 200 }}>{tc.test_scenario}</TableCell>
                                    <TableCell><Chip label={tc.test_type} size="small" sx={{ height: 18, fontSize: '0.55rem', bgcolor: alpha('#6366F1', 0.06), color: '#4F46E5', fontWeight: 600 }} /></TableCell>
                                    <TableCell><Chip label={tc.positive_negative} size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, bgcolor: tc.positive_negative === 'Positive' ? alpha('#059669', 0.08) : tc.positive_negative === 'Negative' ? alpha('#DC2626', 0.08) : alpha('#F59E0B', 0.08), color: tc.positive_negative === 'Positive' ? '#059669' : tc.positive_negative === 'Negative' ? '#DC2626' : '#D97706' }} /></TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.6rem', maxWidth: 160 }}>{tc.preconditions}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.6rem', lineHeight: 1.3 }}>{(tc.test_steps || []).map((s: string, si: number) => <div key={si}>{si+1}. {s}</div>)}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.6rem', maxWidth: 140 }}>{tc.action}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.6rem', maxWidth: 150 }}>{tc.test_data}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.6rem', maxWidth: 200 }}>{tc.expected_result}</TableCell>
                                    <TableCell><Chip label={tc.priority} size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: (tc.priority||'').match(/CRITICAL|HIGH/) ? alpha('#EF4444', 0.1) : alpha('#F59E0B', 0.1), color: (tc.priority||'').match(/CRITICAL|HIGH/) ? '#DC2626' : '#D97706' }} /></TableCell>
                                    <TableCell><Chip label={tc.severity} size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: (tc.severity||'').match(/CRITICAL|HIGH/) ? alpha('#EF4444', 0.1) : alpha('#F59E0B', 0.1), color: (tc.severity||'').match(/CRITICAL|HIGH/) ? '#DC2626' : '#D97706' }} /></TableCell>
                                    <TableCell sx={{ color: '#0F172A', fontSize: '0.63rem', fontWeight: 500 }}>{tc.role}</TableCell>
                                    <TableCell><Chip label={tc.status || 'Draft'} size="small" sx={{ height: 18, fontSize: '0.55rem', bgcolor: alpha('#6366F1', 0.06), color: '#4F46E5' }} /></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ p: 5, textAlign: 'center', color: '#94A3B8' }}>
                  <ListChecks size={40} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>No test cases generated</Typography>
                  <Typography sx={{ fontSize: '0.72rem', mt: 0.5 }}>Parse a document first, then click &quot;Generate Test Cases&quot;</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {(parseMutation.isError || uploadMutation.isError || parsedResult?.error) && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }} onClose={() => { parseMutation.reset(); uploadMutation.reset(); setParsedResult(null); }}>
          {parsedResult?.error ? parsedResult.message : (parseMutation.error?.message || uploadMutation.error?.message)?.includes('500') ? 'Server error parsing document. Make sure AI Engine is running on port 3002.' : (parseMutation.error?.message || uploadMutation.error?.message)}
        </Alert>
      )}

      {generateMutation.isError && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }} onClose={() => generateMutation.reset()}>
          Failed to generate test cases: {generateMutation.error?.message}
        </Alert>
      )}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </Box>
  );
}
