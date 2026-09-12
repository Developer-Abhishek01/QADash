import * as fs from 'fs';
import * as path from 'path';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';

import { ParseDocumentDto, GenerateTestsDto, RequirementsListDto } from './dto/requirements.dto';
import { PrismaService } from '../../common/prisma.service';
import { TestsService } from '../tests/tests.service';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:3002';
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.AI2_API_KEY || '';
const LLM_BASE_URL = process.env.AI_BASE_URL || process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
const LLM_MODEL = process.env.AI_MODEL || process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

interface ParsedData {
  summary?: Record<string, unknown>;
  sections?: { title: string; content: string; level: number; role: string | null }[];
  functional_requirements?: Record<string, unknown>[];
  business_rules?: Record<string, unknown>[];
  validation_rules?: Record<string, unknown>[];
  api_endpoints?: Record<string, unknown>[];
  permissions?: Record<string, unknown>[];
  workflows?: Record<string, unknown>[];
  document_type?: string;
  parsed_at?: string;
  [key: string]: unknown;
}

interface TestCase {
  test_case_id: string;
  module: string;
  role: string;
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
  status: string;
  [key: string]: unknown;
}

type LocalRequirement = GenerateTestsDto['requirements'][number] & {
  business_rules?: Record<string, unknown>[];
  validation_rules?: Record<string, unknown>[];
  api_endpoints?: Record<string, unknown>[];
  permissions?: Record<string, unknown>[];
  workflows?: Record<string, unknown>[];
};

interface TestResult {
  test_cases?: TestCase[];
  groups?: Record<string, unknown>;
  generated_at?: string;
  total_requirements?: number;
  total_test_cases?: number;
  framework?: string;
  fallback?: boolean;
  used_fallback?: boolean;
  persisted_doc_id?: string;
  [key: string]: unknown;
}

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  private normalizeModule(module: string): string {
    const m = module.trim().replace(/\s+/g, ' ').toLowerCase();
    const aliases: [RegExp, string][] = [
      [/\b(registration|login|signup|signin|auth|authentication|login\s*page|register)\b/, 'authentication'],
      [/\b(user|users|profile|user\s*profile|user\s*management)\b/, 'user management'],
      [/\b(admin|administrator)\b/, 'admin'],
      [/\b(client|customer|member)\b/, 'client'],
      [/\b(trainer|coach)\b/, 'trainer'],
      [/\b(general|misc|common|other)\b/, 'general'],
    ];
    for (const [pattern, canonical] of aliases) {
      if (pattern.test(m)) return canonical;
    }
    return m;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly testsService: TestsService,
  ) {}

  async uploadDocument(file: Express.Multer.File, documentType: string) {
    this.logger.log(`Uploading ${documentType} file: ${file.originalname}`);

    const allowedMimes = [
      'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/plain', 'application/msword',
      'application/vnd.ms-word', 'text/csv',
    ];
    const allowedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.csv'];
    const ext = file.originalname?.toLowerCase().slice(file.originalname.lastIndexOf('.')) || '';
    if (!allowedMimes.includes(file.mimetype) && !allowedExts.includes(ext)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Supported: PDF, DOCX, DOC, XLSX, XLS, TXT, CSV`);
    }

    // Save file to disk for viewing
    const uploadsDir = path.join(process.cwd(), 'uploads', 'requirements');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${Date.now()}-${safeName}`;
    fs.writeFileSync(path.join(uploadsDir, storedFilename), file.buffer);
    const fileUrl = `/uploads/requirements/${storedFilename}`;

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
      formData.append('file_type', documentType);

      const apiKey = process.env.AI_ENGINE_API_KEY;
      const { data } = await axios.post(
        `${AI_ENGINE_URL}/api/ai/requirements/upload-file`,
        formData,
        { headers: { ...formData.getHeaders(), 'X-API-Key': apiKey }, timeout: 120000, maxBodyLength: Infinity },
      );

      let parsedData: Record<string, unknown> = data as Record<string, unknown>;
      try {
        const text = await this.extractTextLocally(file);
        const sections = this._parseSections(text);
        parsedData = this.enhanceParsedData({ ...(data as Record<string, unknown>) }, text, sections, documentType);
      } catch {
        this.logger.warn('Could not extract text for enhancement; saving raw AI Engine response');
      }

      const saved = await this.prisma.requirementDocument.create({
        data: {
          documentType,
          rawContent: data.extracted_from || file.originalname,
          parsedData: parsedData as unknown as Prisma.InputJsonValue,
          summary: (data.summary || {}) as unknown as Prisma.InputJsonValue,
          status: 'PARSED',
        },
      });

      return { id: saved.id, ...data, file_url: fileUrl };
    } catch (error) {
      this.logger.warn(`AI Engine unavailable, parsing locally: ${error.message}`);
      const text = await this.extractTextLocally(file);

      // Try LLM direct call
      if (LLM_API_KEY) {
        this.logger.log('Trying direct LLM parsing...');
        try {
          const llmResult = await this._parseWithLLM(text, documentType);
          if (llmResult) {
            const sections = this._parseSections(text);
            const enhancedData = this.enhanceParsedData({ ...(llmResult as Record<string, unknown>) }, text, sections, documentType);

            const saved = await this.prisma.requirementDocument.create({
              data: {
                documentType,
                rawContent: text.slice(0, 50000),
                parsedData: enhancedData as unknown as Prisma.InputJsonValue,
                summary: (llmResult.summary || {}) as unknown as Prisma.InputJsonValue,
                status: 'PARSED',
              },
            });
            return { id: saved.id, ...llmResult, file_url: fileUrl, extracted_from: file.originalname, llm_enhanced: true };
          }
        } catch (llmErr) {
          this.logger.warn(`Direct LLM parsing failed: ${llmErr.message}`);
        }
      }

      const result = this.parseDocumentLocally(text, documentType);
      const saved = await this.prisma.requirementDocument.create({
        data: {
          documentType,
          rawContent: text.slice(0, 50000),
          parsedData: result as unknown as Prisma.InputJsonValue,
          summary: (result.summary || {}) as unknown as Prisma.InputJsonValue,
          status: 'PARSED',
        },
      });
      return { id: saved.id, ...result, file_url: fileUrl, extracted_from: file.originalname, fallback: true };
    }
  }

  async parseDocument(dto: ParseDocumentDto) {
    const docType = this.detectDocumentType(dto.document);
    this.logger.log(`Parsing ${docType} document`);

    const endpoint = docType === 'BRD' ? 'parse-brd' : 'parse-frd';

    try {
      const apiKey = process.env.AI_ENGINE_API_KEY;
      const { data } = await firstValueFrom(
        this.httpService.post(`${AI_ENGINE_URL}/api/ai/requirements/${endpoint}`, {
          document: dto.document,
          metadata: dto.metadata || {},
        }, { timeout: 60000, headers: { 'X-API-Key': apiKey } }),
      );

      const sections = this._parseSections(dto.document);
      const enhancedData = this.enhanceParsedData({ ...(data as Record<string, unknown>) }, dto.document, sections, docType);

      const saved = await this.prisma.requirementDocument.create({
        data: {
          documentType: docType,
          rawContent: dto.document.slice(0, 50000),
          parsedData: enhancedData as unknown as Prisma.InputJsonValue,
          summary: (data.summary || {}) as unknown as Prisma.InputJsonValue,
          status: 'PARSED',
        },
      });

      if (dto.enhance) return { id: saved.id, ...enhancedData };
      return { id: saved.id, ...(data as Record<string, unknown>) };
    } catch (error) {
      this.logger.warn(`AI Engine ${docType} parsing failed: ${error.message}`);

      // Try direct LLM
      if (LLM_API_KEY) {
        this.logger.log('Trying direct LLM parsing for parseDocument...');
        try {
          const llmResult = await this._parseWithLLM(dto.document, docType);
          if (llmResult) {
            const sections = this._parseSections(dto.document);
            const enhancedData = this.enhanceParsedData({ ...(llmResult as Record<string, unknown>) }, dto.document, sections, docType);

            const saved = await this.prisma.requirementDocument.create({
              data: {
                documentType: docType,
                rawContent: dto.document.slice(0, 50000),
                parsedData: enhancedData as unknown as Prisma.InputJsonValue,
                summary: (llmResult.summary || {}) as unknown as Prisma.InputJsonValue,
                status: 'PARSED',
              },
            });
            if (dto.enhance) return { id: saved.id, ...enhancedData, llm_enhanced: true };
            return { id: saved.id, ...(llmResult as Record<string, unknown>), llm_enhanced: true };
          }
        } catch (llmErr) {
          this.logger.warn(`Direct LLM parsing failed: ${llmErr.message}`);
        }
      }

      const result = this.parseDocumentLocally(dto.document, docType);
      const saved = await this.prisma.requirementDocument.create({
        data: {
          documentType: docType,
          rawContent: dto.document.slice(0, 50000),
          parsedData: result as unknown as Prisma.InputJsonValue,
          summary: (result.summary || {}) as unknown as Prisma.InputJsonValue,
          status: 'PARSED',
        },
      });
      return { id: saved.id, ...result, fallback: true };
    }
  }

  private _enhanceIfRequested(
    result: Record<string, unknown>,
    document: string,
    docType: string,
    enhance: boolean | undefined,
    sections?: { title: string; content: string; level: number; role: string | null }[],
  ): Record<string, unknown> {
    if (!enhance) return result;
    if (result['business_rules'] || result['validation_rules'] || result['permissions'] || result['api_endpoints'] || result['workflows']) {
      return result;
    }
    if (!sections) sections = this._parseSections(document);
    return this.enhanceParsedData(result, document, sections, docType);
  }

  async getDocumentAnalysis(id: string) {
    const doc = await this.prisma.requirementDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Requirement document not found');

    const parsed = (doc.parsedData as Record<string, unknown>) || {};
    let data = { ...parsed };

    // If stored parsedData lacks the new M1 keys, enhance on-the-fly
    if (!data['business_rules'] && doc.rawContent) {
      const sections = this._parseSections(doc.rawContent);
      data = this.enhanceParsedData(data, doc.rawContent, sections, doc.documentType);
    }

    const roles = this._extractRolesFromData(data);
    const modules = this._extractModulesFromData(data);

    return {
      documentId: doc.id,
      summary: data.summary || doc.summary || {},
      roles,
      modules,
      functional_requirements: (data.functional_reqs || data.functional_requirements || []) as Record<string, unknown>[],
      business_rules: (data.business_rules || []) as Record<string, unknown>[],
      validation_rules: (data.validation_rules || []) as Record<string, unknown>[],
      api_endpoints: (data.api_endpoints || []) as Record<string, unknown>[],
      permissions: (data.permissions || []) as Record<string, unknown>[],
      workflows: (data.workflows || []) as Record<string, unknown>[],
    };
  }

  private _extractRolesFromData(data: Record<string, unknown>): string[] {
    const roleSet = new Set<string>();
    const funcReqs = (data.functional_reqs || data.functional_requirements || []) as Record<string, unknown>[];
    for (const fr of funcReqs) {
      if (fr.module && typeof fr.module === 'string') roleSet.add(fr.module);
    }
    const perms = (data.permissions || []) as Record<string, unknown>[];
    for (const p of perms) {
      if (p.role && typeof p.role === 'string') roleSet.add(p.role);
    }
    return Array.from(roleSet).sort();
  }

  private _extractModulesFromData(data: Record<string, unknown>): string[] {
    const modSet = new Set<string>();
    const funcReqs = (data.functional_reqs || data.functional_requirements || []) as Record<string, unknown>[];
    for (const fr of funcReqs) {
      if (fr.module && typeof fr.module === 'string') modSet.add(fr.module);
    }
    const rules = (data.business_rules || []) as Record<string, unknown>[];
    for (const r of rules) {
      if (r.module && typeof r.module === 'string') modSet.add(r.module);
    }
    return Array.from(modSet).sort();
  }

  async generateTests(dto: GenerateTestsDto) {
    this.logger.log(`Generating test cases for ${dto.requirements.length} requirements`);

    const framework = dto.framework || 'playwright';
    let cleanReqs = dto.requirements.map(r => this._sanitizeRequirement(r)) as unknown as GenerateTestsDto['requirements'];

    // Enrich requirements with enhanced parsed data from stored document
    if (dto.documentId) {
      try {
        const doc = await this.prisma.requirementDocument.findUnique({ where: { id: dto.documentId } });
        if (doc?.parsedData) {
          const pd = doc.parsedData as Record<string, unknown>;
          const br = (pd.business_rules || []) as Record<string, unknown>[];
          const vr = (pd.validation_rules || []) as Record<string, unknown>[];
          const ae = (pd.api_endpoints || []) as Record<string, unknown>[];
          const pm = (pd.permissions || []) as Record<string, unknown>[];
          const wf = (pd.workflows || []) as Record<string, unknown>[];
          cleanReqs = cleanReqs.map(req => ({
            ...req,
            business_rules: br.filter((r: Record<string, unknown>) => this.normalizeModule(r.module as string) === this.normalizeModule(String(req.module))),
            validation_rules: vr.filter((r: Record<string, unknown>) => this.normalizeModule(r.module as string) === this.normalizeModule(String(req.module))),
            api_endpoints: ae.filter((r: Record<string, unknown>) => this.normalizeModule(r.module as string) === this.normalizeModule(String(req.module))),
            permissions: pm.filter((p: Record<string, unknown>) => this.normalizeModule(p.role as string) === this.normalizeModule(String(req.module)) || this.normalizeModule(p.module as string) === this.normalizeModule(String(req.module))),
            workflows: wf.filter((w: Record<string, unknown>) => this.normalizeModule(w.module as string) === this.normalizeModule(String(req.module))),
          })) as unknown as GenerateTestsDto['requirements'];
          this.logger.log(`Enriched ${cleanReqs.length} requirements with enhanced data from document ${dto.documentId}`);
        } else {
          this.logger.warn(`Document ${dto.documentId} found but has no parsedData`);
        }
      } catch (err) {
        this.logger.warn(`Failed to load document ${dto.documentId} for enrichment: ${err.message}`);
      }
    }

    const apiKey = process.env.AI_ENGINE_API_KEY;
    let result: TestResult | undefined;
    let usedFallback = false;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${AI_ENGINE_URL}/api/ai/requirements/generate-tests`, {
          requirements: cleanReqs,
          framework,
        }, { timeout: 120000, headers: { 'X-API-Key': apiKey } }),
      );

      result = this._sanitizeTestResults(data);
    } catch (error) {
      this.logger.error(`AI Engine test generation failed: ${error.message}`);

      // Try direct LLM call
      if (LLM_API_KEY) {
        this.logger.log('Trying direct LLM test generation...');
        try {
          const llmResult = await this._generateTestsWithLLM(cleanReqs, framework);
          if (llmResult) {
            result = this._sanitizeTestResults(llmResult);
            usedFallback = true;
          }
        } catch (llmErr) {
          this.logger.warn(`Direct LLM test generation failed: ${llmErr.message}`);
        }
      }

      if (!result) {
        this.logger.log('Falling back to local template-based test generation');
        result = this._sanitizeTestResults(this._generateTestsLocally(cleanReqs, framework));
        usedFallback = true;
      }
    }

    // Persist generated test cases to database as RequirementDocument
    if (result && result.test_cases && result.test_cases.length > 0) {
      try {
        const saved = await this.prisma.requirementDocument.create({
          data: {
            documentType: 'GENERATED_TESTS',
            rawContent: JSON.stringify(dto.requirements.slice(0, 10)),
            parsedData: { test_cases: result.test_cases.slice(0, 100), groups: result.groups } as unknown as Prisma.InputJsonValue,
            summary: { total_test_cases: result.test_cases.length } as unknown as Prisma.InputJsonValue,
            status: 'PARSED',
          },
        });
        this.logger.log(`Saved ${result.test_cases.length} test cases as requirement document ${saved.id}`);
        result.persisted_doc_id = saved.id;
      } catch (dbErr) {
        this.logger.warn(`Failed to persist test cases to DB: ${dbErr.message}`);
      }
    }

    // Persist generated test cases to the tests table so they appear in Test Cases and are runnable
    if (result && result.test_cases && result.test_cases.length > 0 && dto.userId) {
      try {
        let created = 0;
        for (const tc of result.test_cases as Record<string, unknown>[]) {
          const steps = ((tc.test_steps || []) as string[]).filter(Boolean);
          await this.testsService.create({
            name: String(tc.test_scenario || tc.test_case_id || 'Generated Test Case'),
            description: String(tc.expected_result || ''),
            projectId: dto.projectId,
            projectName: dto.projectId ? undefined : 'Requirements Generated Tests',
            userId: dto.userId,
            config: {
              module: tc.module,
              test_type: tc.test_type,
              positive_negative: tc.positive_negative,
              priority: tc.priority,
              severity: tc.severity,
              preconditions: tc.preconditions,
              steps,
              test_data: tc.test_data,
              expected_result: tc.expected_result,
              source: 'requirements-generation',
            },
            tags: ['requirements-generated', String(tc.module || 'general').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')],
            status: 'ACTIVE',
          });
          created++;
        }
        result.persisted_tests = created;
        this.logger.log(`Persisted ${created} generated test cases to tests table`);
      } catch (dbErr) {
        this.logger.warn(`Failed to persist test cases to tests table: ${dbErr.message}`);
      }
    }

    result.used_fallback = usedFallback;
    return result;
  }

  private _sanitizeRequirement(req: Record<string, unknown>): Record<string, unknown> {
    const clean = (s: string) =>
      (s || '').replace(CONTROL_CHARS_REGEX, '')
              .replace(/\|/g, ' - ')
              .replace(/\s+/g, ' ')
              .trim();
    return {
      ...req,
      id: clean(String(req.id ?? '')),
      title: clean(String(req.title ?? '')),
      description: clean(String(req.description ?? '')),
      module: clean(String(req.module ?? '')),
      priority: clean(String(req.priority ?? '')),
    };
  }

  private _sanitizeTestResults(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || !data.test_cases) return data;
    const testCases = data.test_cases as Record<string, unknown>[];
    const clean = (s: unknown) => String(s || '').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
    const cleanTcs = testCases.map((tc: Record<string, unknown>) => {
      const rawModule = String(tc.module || tc.role || tc.requirement_ref || tc.requirement_id || '');
      const roleName = this._detectRoleFromSection(rawModule) || 'General';
      const pn = tc.positive_negative || (tc.type === 'Positive' || tc.type === 'Functional' ? 'Positive' : tc.type === 'Negative' ? 'Negative' : 'N/A');
      return {
        ...tc,
        test_case_id: clean(tc.test_case_id || tc.id || ''),
        module: roleName,
        role: roleName,
        test_scenario: clean(tc.test_scenario || tc.title || tc.description || ''),
        test_type: clean(tc.test_type || tc.type || ''),
        positive_negative: clean(pn),
        requirement_ref: clean(tc.requirement_ref || tc.requirement_id || ''),
        preconditions: clean(tc.preconditions),
        test_steps: ((tc.test_steps || tc.steps || []) as unknown as string[]).map((s: string) => clean(s)),
        action: clean(tc.action || ''),
        test_data: clean(tc.test_data),
        expected_result: clean(tc.expected_result || tc.expected || ''),
        priority: tc.priority || 'MEDIUM',
        severity: tc.severity || 'MEDIUM',
        status: tc.status || 'Draft',
      };
    });
    return {
      ...data,
      test_cases: cleanTcs,
      groups: this._groupTestCasesByModule(cleanTcs),
    };
  }

  private _groupTestCasesByModule(testCases: Record<string, unknown>[]): Record<string, { display_name: string; count: number; test_cases: Record<string, unknown>[] }> {
    const groups: Record<string, Record<string, unknown>[]> = {};
    const nameMap: Record<string, string> = {};
    for (const tc of testCases) {
      const mod = tc.module || 'General';
      const modKey = String(mod).toLowerCase().replace(/[^a-z0-9_ ]/g, '').trim().replace(/\s+/g, '_') || 'general';
      if (!groups[modKey]) {
        groups[modKey] = [];
        nameMap[modKey] = String(mod);
      }
      groups[modKey].push(tc);
    }

    // General ko Admin mein merge karo sirf agar koi aur group ho
    if (groups['general']) {
      const generalTcs = groups['general'];
      delete groups['general'];
      delete nameMap['general'];
      if (Object.keys(groups).length > 0) {
        if (groups['admin']) {
          groups['admin'].push(...generalTcs);
        } else {
          groups['admin'] = generalTcs;
          nameMap['admin'] = 'Admin';
        }
      } else {
        // Sirf General hai to use "General Requirements" ke naam se dikhao
        groups['general_requirements'] = generalTcs;
        nameMap['general_requirements'] = 'General Requirements';
      }
    }

    const roleOrder = ['Superadmin', 'Admin', 'Tenant Admin', 'Project Manager', 'Product Owner', 'Business Analyst', 'QA Engineer', 'Scrum Master', 'DevOps', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer', 'Designer', 'Data Scientist', 'Manager', 'Trainer', 'Developer', 'User', 'Client', 'Owner', 'Support', 'Compliance', 'Vendor'];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const aName = nameMap[a];
      const bName = nameMap[b];
      const aIdx = roleOrder.indexOf(aName);
      const bIdx = roleOrder.indexOf(bName);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return aName.localeCompare(bName);
    });
    const result: Record<string, { display_name: string; count: number; test_cases: Record<string, unknown>[] }> = {};
    for (const key of sortedKeys) {
      result[key] = { display_name: nameMap[key], count: groups[key].length, test_cases: groups[key] };
    }
    return result;
  }

  async findAll(query: RequirementsListDto) {
    const where: Record<string, unknown> = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;

    const [documents, total] = await Promise.all([
      this.prisma.requirementDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset || 0,
        take: query.limit || 20,
      }),
      this.prisma.requirementDocument.count({ where }),
    ]);

    return { documents, total };
  }

  async findOne(id: string) {
    const doc = await this.prisma.requirementDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Requirement document not found');
    return doc;
  }

  async remove(id: string) {
    try {
      await this.prisma.requirementDocument.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Requirement document not found');
    }
    return { message: 'Requirement document deleted' };
  }

  private async extractTextLocally(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';

    if (ext === 'txt' || file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const lines: string[] = [];
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
          lines.push(`--- Sheet: ${sheetName} ---`);
          for (const row of rows) {
            const cleanRow = row
              .filter(c => c !== undefined && c !== null)
              .map(c => String(c).replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim())
              .filter(c => c);
            if (cleanRow.length) lines.push(cleanRow.join(' - '));
          }
        }
        return lines.join('\n');
      } catch (e) {
        this.logger.error(`XLSX parse error: ${e.message}`);
        throw new BadRequestException('Failed to read XLSX file. Make sure it is a valid spreadsheet.');
      }
    }

    if (ext === 'docx' || ext === 'doc') {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        const text = (result.value || '').replace(CONTROL_CHARS_REGEX, '');
        if (!text.trim()) throw new Error('No text extracted');
        return text;
      } catch (e) {
        this.logger.error(`DOCX parse error: ${e.message}`);
        throw new BadRequestException(
          `Failed to read DOCX file: ${e.message}. Try converting to TXT or XLSX format.`
        );
      }
    }

    if (ext === 'pdf') {
      try {
        const data = await pdfParse(file.buffer);
        const text = (data.text || '').replace(CONTROL_CHARS_REGEX, '');
        if (!text.trim()) throw new Error('No text extracted');
        return text;
      } catch (e) {
        this.logger.error(`PDF parse error: ${e.message}`);
        throw new BadRequestException(
          `Failed to read PDF file: ${e.message}. Try converting to TXT or XLSX format.`
        );
      }
    }

    const supported = ['TXT', 'XLSX', 'DOCX', 'PDF'];
    throw new BadRequestException(
      `Unsupported file format: ${ext.toUpperCase()}. Supported formats: ${supported.join(', ')}`
    );
  }

  private _detectRoleFromSection(title: string): string | null {
    const t = title.trim().replace(/[:\-#*]/g, '').trim();
    // Prioritize specific multi-word roles BEFORE generic ones
    const rolePatterns: { regex: RegExp; name: string }[] = [
      { regex: /\b(super\s*admin|superadmin|सुपर\s*एडमिन)\b/i, name: 'Superadmin' },
      { regex: /\b(tenant\s*admin|tenantadmin|किरायेदार\s*एडमिन)\b/i, name: 'Tenant Admin' },
      { regex: /\b(quality\s*analyst|qa\s*engineer|test\s*engineer|test\s*lead|test\s*manager)\b/i, name: 'QA Engineer' },
      { regex: /\b(business\s*analyst|ba)\b/i, name: 'Business Analyst' },
      { regex: /\b(product\s*owner|product\s*manager|po)\b/i, name: 'Product Owner' },
      { regex: /\b(scrum\s*master|project\s*manager|project\s*lead|delivery\s*manager)\b/i, name: 'Project Manager' },
      { regex: /\b(devops\s*engineer|devops|platform\s*engineer|infrastructure|system\s*admin)\b/i, name: 'DevOps' },
      { regex: /\b(frontend|front-end|front\s*end|ui|ux|web)\s*(dev|engineer)?\b/i, name: 'Frontend Developer' },
      { regex: /\b(backend|back-end|back\s*end|api|server)\s*(dev|engineer)?\b/i, name: 'Backend Developer' },
      { regex: /\b(full\s*stack|fullstack)\s*(dev|engineer)?\b/i, name: 'Full Stack Developer' },
      { regex: /\b(mobile|android|ios|react\s*native|flutter)\s*(dev|engineer)?\b/i, name: 'Mobile Developer' },
      { regex: /\b(designer|ui\s*designer|ux\s*designer|graphic\s*designer)\b/i, name: 'Designer' },
      { regex: /\b(data\s*scientist|data\s*analyst|data\s*engineer|ml\s*engineer|ai\s*engineer)\b/i, name: 'Data Scientist' },
      { regex: /\b(support\s*engineer|customer\s*support|helpdesk|technical\s*support)\b/i, name: 'Support' },
      { regex: /\b(compliance|auditor|audit|legal|risk)\b/i, name: 'Compliance' },
      { regex: /\b(vendor|partner|third.party|external)\b/i, name: 'Vendor' },
      { regex: /\b(admin|administrator|प्रशासक)\b/i, name: 'Admin' },
      { regex: /\b(trainer|प्रशिक्षक|coach|instructor|educator)\b/i, name: 'Trainer' },
      { regex: /\b(client|ग्राहक|customer|member)\b/i, name: 'Client' },
      { regex: /\b(manager|प्रबंधक|supervisor|पर्यवेक्षक|lead|head|director|coordinator)\b/i, name: 'Manager' },
      { regex: /\b(developer|engineer|डेवलपर|अभियंता|programmer|coder|software)\b/i, name: 'Developer' },
      { regex: /\b(owner|मालिक|founder|ceo|cto|director|vp|प्रमुख)\b/i, name: 'Owner' },
      { regex: /\b(user|उपयोगकर्ता|employee|कर्मचारी|staff|team\s*member)\b/i, name: 'User' },
    ];
    for (const p of rolePatterns) {
      if (p.regex.test(t)) return p.name;
    }
    return null;
  }

  private _parseSections(text: string): { title: string; content: string; level: number; role: string | null }[] {
    const lines = text.split('\n').filter(l => l.trim());
    const sections: { title: string; content: string; level: number; role: string | null }[] = [];
    let currentSection = { title: 'preamble', content: '', level: 0, role: null };
    const roleStack: { level: number; role: string }[] = [];
    const roleHeadingPattern = /^(?:(?:super\s*admin|tenant\s*admin|admin|administrator|trainer|coach|instructor|client|customer|member|manager|supervisor|lead|head|director|user|employee|staff|developer|engineer|programmer|coder|owner|founder|ceo|cto|vp|president|qa|quality|analyst|ba|business|product|scrum|devops|devop|frontend|front-end|backend|back-end|fullstack|full.stack|mobile|android|ios|designer|ui|ux|data|ml|ai|support|helpdesk|compliance|auditor|legal|risk|vendor|partner|third.party|external|management|login|session|dashboard|permission|role|feature|module|setting|configuration|profile|notification|report|analytics|workout|exercise|challenge|achievement|payment|subscription|billing|content|moderation|search|filter|sort|import|export|backup|restore|integration|api|webhook|sync|onboarding|offboarding|training|learning|course|challenge|leaderboard|gamification|social|feed|message|chat|notification|alert|payment|wallet|subscription|plan|tier|billing|invoice|refund|reporting|dashboard|analytics|insight)\b)/i;

    for (const line of lines) {
      let headingMatch = line.match(/^(#{1,4})\s+(.+)|^([A-Z][A-Z\s]{2,}):|^(\d+\.\d*\s*)(.+)/);
      if (!headingMatch) {
        const clean = line.replace(/[:\-#*]/g, '').trim();
        if (clean.length < 80 && /^[A-Z]/.test(clean)) {
          const isRoleHeading = roleHeadingPattern.test(clean) || this._detectRoleFromSection(clean);
          if (isRoleHeading) {
            headingMatch = line.match(/^(.+)$/);
          }
        }
      }
      if (headingMatch) {
        if (currentSection.content.trim()) sections.push(currentSection);
        const level = headingMatch[1]?.length || (headingMatch[3] ? 2 : 1);
        const cleanTitle = line.replace(/[:\-#*]/g, '').trim();
        let title = (headingMatch[2] || headingMatch[5] || headingMatch[4] || headingMatch[1] || cleanTitle).trim().replace(/:$/, '').trim();
        title = title || cleanTitle;
        while (roleStack.length && roleStack[roleStack.length - 1].level >= level) roleStack.pop();
        const directRole = this._detectRoleFromSection(title);
        if (directRole) { roleStack.push({ level, role: directRole }); }
        const inheritedRole = roleStack.length ? roleStack[roleStack.length - 1].role : null;
        currentSection = { title, content: '', level, role: inheritedRole };
      } else {
        currentSection.content += line + '\n';
      }
    }
    if (currentSection.content.trim()) sections.push(currentSection);
    return sections;
  }

  private parseDocumentLocally(text: string, docType: string): Record<string, unknown> {
    const asciiChars = text.split('').filter(c => c >= ' ' && c <= '~').length;
    const totalChars = text.length || 1;
    if (asciiChars / totalChars < 0.5) {
      throw new BadRequestException(
        'Extracted text appears to be binary/garbage. Start the AI Engine (port 3002) to parse this file type, or use TXT/XLSX files for offline mode.'
      );
    }
    const sections = this._parseSections(text);

    const seenReqs = new Set<string>();
    const actionVerbs = /(?:create|manage|view|configure|assign(?:ment)?s?|track(?:ing)?|access|edit(?:ing)?|delet(?:e|ing)|add(?:ing)?|updat(?:e|ing)|remov(?:e|ing)|defin(?:e|ing)|set(?:ting)?|generat(?:e|ing|ion)?|export|import|approv(?:e|al)?|review|submit|cancel(?:lation)?|schedul(?:e|ing)|monitor(?:ing)?|log(?:ging)?|perform(?:ance|ing)?|conduct|chat|complet(?:e|ing)|check(?:ing)?)\b/i;

    const functionalReqs: { id: string; title: string; description: string; module: string; priority: string }[] = [];
    const reqPatterns = [
      /(?:FR|FRQ|FUNC)[-_]?(\d+)[:\s]+(.+)/i,
      /(?:The\s+)?(?:system|user|application|platform)\s+(?:should|shall|must|will|can|ensures?|supports?|allows?|provides?|requires?|manages?)\s+(.+?)[.;]/i,
      /^[-–—●•*▶]\s*(?:FR|Functional Requirement)?\s*[-:]?\s*(.+)/i,
      /^[-–—●•*▶]\s*(.+)/i,
      /^[-–—●•*▶]\s*✅\s*(.+)/i,
      /^[-–—●•*▶]\s*❌\s*(.+)/i,
      /^[-–—●•*▶]\s*⚠️\s*(.+)/i,
    ];
    const prioPattern = /priority[:\s]+(high|medium|low|critical)/i;
    const skipLines = /^(?:overview|introduction|table\s+of\s+contents|sequence|participant|end$|note:|note\b)/i;

    for (const section of sections) {
      const moduleName = section.role || this._detectRoleFromSection(section.title) || 'General';
      for (const rawLine of (section.content + section.title).split('\n')) {
        const line = rawLine.trim();
        if (!line || line.length < 10 || skipLines.test(line)) continue;

        if (seenReqs.has(line)) continue;
        seenReqs.add(line);

        if (section.title.match(/(?:permissions?|responsibilities?|features?|capabilities?|access|roles?|allowed)/i) && actionVerbs.test(line)) {
          const priority = line.match(prioPattern)?.[1]?.toLowerCase() || 'medium';
          functionalReqs.push({
            id: `FR-${String(functionalReqs.length + 1).padStart(3, '0')}`,
            title: line.slice(0, 100),
            description: line,
            module: moduleName,
            priority,
          });
          continue;
        }

        if (actionVerbs.test(line)) {
          const priority = line.match(prioPattern)?.[1]?.toLowerCase() || 'medium';
          functionalReqs.push({
            id: `FR-${String(functionalReqs.length + 1).padStart(3, '0')}`,
            title: line.slice(0, 100),
            description: line,
            module: moduleName,
            priority,
          });
          continue;
        }

        for (const pattern of reqPatterns) {
          const match = line.match(pattern);
          if (match) {
            const desc = match[2] || match[1] || '';
            if (desc.length < 10) continue;
            const priority = line.match(prioPattern)?.[1]?.toLowerCase() || 'medium';
            functionalReqs.push({
              id: `FR-${String(functionalReqs.length + 1).padStart(3, '0')}`,
              title: desc.trim().slice(0, 100),
              description: desc.trim(),
              module: moduleName,
              priority,
            });
            break;
          }
        }
      }
    }

    const summary: Record<string, number> = {
      total_sections: sections.length,
      total_functional_requirements: functionalReqs.length,
    };
    if (docType === 'BRD') {
      summary['total_business_objectives'] = 0;
      summary['total_stakeholders'] = 0;
      summary['total_non_functional_requirements'] = 0;
      summary['total_assumptions'] = 0;
    } else {
      summary['total_use_cases'] = 0;
      summary['total_flows'] = 0;
      summary['total_constraints'] = 0;
    }

    const result: Record<string, unknown> = {
      document_type: docType,
      parsed_at: new Date().toISOString(),
      summary,
      sections,
      functional_requirements: functionalReqs,
    };

    if (docType === 'BRD') {
      result['business_objectives'] = [];
      result['stakeholders'] = [];
      result['non_functional_requirements'] = [];
      result['assumptions'] = [];
      result['scope'] = { in_scope: [], out_of_scope: [] };
    } else {
      result['use_cases'] = [];
      result['flows'] = [];
      result['constraints'] = [];
    }

    return this.enhanceParsedData(result, text, sections, docType);
  }

  private enhanceParsedData(
    result: Record<string, unknown>,
    text: string,
    sections: { title: string; content: string; level: number; role: string | null }[],
    docType: string,
  ): Record<string, unknown> {
    if (!(result['business_rules'] as Record<string, unknown>[])?.length) result['business_rules'] = this._extractBusinessRules(text, sections);
    if (!(result['validation_rules'] as Record<string, unknown>[])?.length) result['validation_rules'] = this._extractValidationRules(text, sections);
    if (!(result['api_endpoints'] as Record<string, unknown>[])?.length) result['api_endpoints'] = this._extractApiEndpoints(text, sections);
    if (!(result['permissions'] as Record<string, unknown>[])?.length) result['permissions'] = this._extractPermissions(text, sections);
    if (!(result['workflows'] as Record<string, unknown>[])?.length) result['workflows'] = this._extractWorkflows(text, sections);
    return result;
  }

  private _extractBusinessRules(
    text: string,
    sections: { title: string; content: string; role: string | null }[],
  ): { id: string; description: string; module: string; type: string; priority: string }[] {
    const rules: { id: string; description: string; module: string; type: string; priority: string }[] = [];
    const seen = new Set<string>();
    const ruleSectionTitles = /business\s*rule|rule|business\s*logic|constraint|condition/i;
    const rulePrefix = /(?:BR|RULE|BUSINESS\s*RULE|BL)[-_]?(\d+)?[:\s]+(.+)/i;
    const conditional = /\b(?:if|when|whenever|unless)\b.*\b(?:then|must|should|shall|will)\b/i;
    const constraint = /\b(?:must\s+not|cannot|should\s+not|shall\s+not|only\s+if|prohibited|restricted)\b/i;
    const logicRule = /(?:system|platform|application)\s+(?:must|should|shall|will|can|cannot|must\s+not)\s+(.+?)[.;]/i;
    const priorityHint = /priority[:\s]+(critical|high|medium|low)/i;

    for (const section of sections) {
      const moduleName = section.role || 'General';
      const isRuleSection = ruleSectionTitles.test(section.title);
      const content = (isRuleSection ? section.content : section.title + '\n' + section.content);

      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.length < 10) continue;
        const normal = line.replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
        if (seen.has(normal)) continue;
        seen.add(normal);

        let match: RegExpMatchArray | null;
        let desc = '';

        // Prefixed rule: BR-001: ...
        match = line.match(rulePrefix);
        if (match) { desc = match[2] || match[1] || line; }
        // Conditional: If X then Y
        else if (conditional.test(line)) { desc = line; }
        // Constraint: must not / cannot
        else if (constraint.test(line)) { desc = line; }
        // System must/should...
        else if ((match = line.match(logicRule))) { desc = match[1]; }
        // In a rule section, every action-verb line is a rule
        else if (isRuleSection && /(?:must|should|shall|will|can|requires?|ensures?|allows?|prevents?|manages?|tracks?|generates?)/i.test(line)) { desc = line; }

        if (desc && desc.length >= 10) {
          const priority = line.match(priorityHint)?.[1]?.toLowerCase() || 'medium';
          const type = constraint.test(line) ? 'constraint' : conditional.test(line) ? 'conditional' : 'logic';
          rules.push({
            id: `BR-${String(rules.length + 1).padStart(3, '0')}`,
            description: desc.slice(0, 500),
            module: moduleName,
            type,
            priority,
          });
        }
      }
    }
    return rules;
  }

  private _extractValidationRules(
    text: string,
    sections: { title: string; content: string; role: string | null }[],
  ): { id: string; field: string; rule: string; value: string; errorMessage: string; module: string }[] {
    const rules: { id: string; field: string; rule: string; value: string; errorMessage: string; module: string }[] = [];
    const seen = new Set<string>();
    const valSectionTitles = /valid|input|constraint|field\s*rule|schema/i;
    const fieldPatterns = [
      { re: /(.+?)\s+(?:is\s+)?required/i, rule: 'required' },
      { re: /(.+?)\s+(?:must|should|shall)\s+be\s+(?:at\s+least|minimum|min[.])?\s*(\d+)/i, rule: 'minLength' },
      { re: /(.+?)\s+(?:must|should|shall)\s+be\s+(?:at\s+most|maximum|max[.])?\s*(\d+)/i, rule: 'maxLength' },
      { re: /(.+?)\s+(?:must|should|shall)\s+be\s+between\s+(\d+)\s+and\s+(\d+)/i, rule: 'range' },
      { re: /(.+?)\s+(?:must|should|shall)\s+match\s+(.+)/i, rule: 'pattern' },
      { re: /(.+?)\s+(?:must|should|shall)\s+be\s+(?:a\s+|an\s+)?(valid\s+)?(email|url|phone|number|date|boolean|alphanumeric)/i, rule: 'format' },
      { re: /(.+?)\s+(?:must|should|shall)\s+be\s+unique/i, rule: 'unique' },
      { re: /(.+?)\s+length\s+(?:must|should|shall)\s+be\s+(?:at\s+least|minimum|min[.])?\s*(\d+)/i, rule: 'minLength' },
      { re: /(.+?)\s+length\s+(?:must|should|shall)\s+(?:not\s+)?exceed\s+(\d+)/i, rule: 'maxLength' },
    ];
    const errMsgPattern = /(?:error|message|alert|toast)[:\s]+[""']?([^""'\n]+)[""']?/i;

    for (const section of sections) {
      const moduleName = section.role || 'General';
      const isValSection = valSectionTitles.test(section.title);
      const content = (isValSection ? section.content : section.title + '\n' + section.content);

      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.length < 8) continue;
        const normal = line.replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
        const dedupKey = normal.slice(0, 80);
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        for (const fp of fieldPatterns) {
          const match = line.match(fp.re);
          if (match) {
            const field = match[1].replace(/^(?:the\s+)?(?:user['"]?s\s+)?/i, '').replace(/[":]+/g, '').trim().slice(0, 60);
            const value = (match[2] || match[3] || '').trim();
            const errMatch = line.match(errMsgPattern);
            const errorMessage = errMatch ? errMatch[1].trim() : `Invalid ${field}`;
            if (field && field.length >= 2) {
              rules.push({
                id: `VR-${String(rules.length + 1).padStart(3, '0')}`,
                field,
                rule: fp.rule,
                value: value || 'true',
                errorMessage: errorMessage.slice(0, 200),
                module: moduleName,
              });
            }
            break;
          }
        }
      }
    }
    return rules;
  }

  private _extractApiEndpoints(
    text: string,
    sections: { title: string; content: string; role: string | null }[],
  ): { id: string; method: string; path: string; description: string; auth: boolean; roles: string[] }[] {
    const apis: { id: string; method: string; path: string; description: string; auth: boolean; roles: string[] }[] = [];
    const seen = new Set<string>();
    const methodRe = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s,;)]+)/i;
    const endpointRe = /(?:endpoint|api|route|url)[:\s]+(\/[^\s,;)]+)/i;
    const authHint = /(?:auth|token|jwt|bearer|x-api-key)/i;
    const roleHint = /(?:role|permission|access)[:\s]+(.+?)(?:[,;]|$)/i;

    for (const section of sections) {
      const content = section.title + '\n' + section.content;
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const normal = line.replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
        if (seen.has(normal.slice(0, 100))) continue;
        seen.add(normal.slice(0, 100));

        let match = line.match(methodRe);
        if (match) {
          const method = match[1].toUpperCase();
          let path = match[2];
          const desc = line.replace(methodRe, '').replace(/[-–—>→:]/g, '').trim();
          if (!path.startsWith('/')) path = '/' + path;
          const roles: string[] = [];
          const roleMatch = line.match(roleHint);
          if (roleMatch) { roles.push(...roleMatch[1].split(/[,;/\s]+/).map(r => r.trim()).filter(Boolean)); }
          apis.push({
            id: `API-${String(apis.length + 1).padStart(3, '0')}`,
            method,
            path: path.slice(0, 200),
            description: desc.slice(0, 300),
            auth: authHint.test(line),
            roles,
          });
        } else if ((match = line.match(endpointRe))) {
          let path = match[1];
          if (!path.startsWith('/')) path = '/' + path;
          const desc = line.replace(endpointRe, '').replace(/[-–—>→:]/g, '').trim();
          apis.push({
            id: `API-${String(apis.length + 1).padStart(3, '0')}`,
            method: '',
            path: path.slice(0, 200),
            description: desc.slice(0, 300),
            auth: authHint.test(line),
            roles: [],
          });
        }
      }
    }
    return apis;
  }

  private _extractPermissions(
    text: string,
    sections: { title: string; content: string; role: string | null }[],
  ): { role: string; module: string; permissions: string[] }[] {
    const perms: { role: string; module: string; permissions: string[] }[] = [];
    const seen = new Set<string>();
    const permSectionTitles = /permission|role\s*(?:matrix|management|based)|access\s*control|authorization|rbac|user\s*role/i;
    const crudVerbs = /\b(create|add|write|insert|read|view|see|list|update|edit|modify|delete|remove|destroy|manage|full|all|grant|approve|reject)\b/i;
    const crudMap: Record<string, string> = {
      create: 'create', add: 'create', write: 'create', insert: 'create',
      read: 'read', view: 'read', see: 'read', list: 'read',
      update: 'update', edit: 'update', modify: 'update',
      delete: 'delete', remove: 'delete', destroy: 'delete',
      manage: 'manage', full: 'manage', all: 'manage',
      grant: 'approve', approve: 'approve', reject: 'reject',
    };

    const canPattern = /(\w+(?:\s+\w+)?)\s+(?:can|has\s+access\s+to|has?\s+permission\s+to|is\s+allowed\s+to)\s+(create|read|update|delete|manage|view|edit|add|remove)(?:\s+(.+?))?(?:[,;.]|$)/i;
    const moduleAccess = /(\w+(?:\s+\w+)?)\s+(?:can|has\s+access\s+to|manages?|views?|edits?)\s+(.+?(?:module|section|page|screen|feature|management))/i;

    for (const section of sections) {
      const isPermSection = permSectionTitles.test(section.title);
      if (!isPermSection) continue;
      const content = section.content;

      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.length < 8) continue;
        const normal = line.replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
        const dedupKey = normal.slice(0, 80).toLowerCase();
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        // "Admin can create gym"
        let match = line.match(canPattern);
        if (match) {
          const role = match[1].replace(/[":]/g, '').trim();
          const action = crudMap[match[2].toLowerCase()] || match[2].toLowerCase();
          const target = (match[3] || section.title).replace(/[":]/g, '').trim().slice(0, 50);
          const key = `${role}|${target}|${action}`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            perms.push({ role, module: target, permissions: [action] });
          }
          continue;
        }

        // "Admin manages gym module"
        match = line.match(moduleAccess);
        if (match) {
          const role = match[1].replace(/[":]/g, '').trim();
          const target = match[2].replace(/[":]/g, '').trim().slice(0, 50);
          const key = `${role}|${target}|access`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            perms.push({ role, module: target, permissions: ['read'] });
          }
        }
      }
    }

    // Merge duplicate role+module entries
    const merged: Record<string, { role: string; module: string; permissions: Set<string> }> = {};
    for (const p of perms) {
      const key = `${p.role}|${p.module}`;
      if (!merged[key]) merged[key] = { ...p, permissions: new Set(p.permissions) };
      else p.permissions.forEach(perm => merged[key].permissions.add(perm));
    }

    return Object.values(merged).map(m => ({
      role: m.role,
      module: m.module,
      permissions: Array.from(m.permissions),
    }));
  }

  private _extractWorkflows(
    text: string,
    sections: { title: string; content: string; role: string | null }[],
  ): { id: string; name: string; trigger: string; steps: { order: number; action: string; description: string; actor: string }[]; module: string }[] {
    const workflows: { id: string; name: string; trigger: string; steps: { order: number; action: string; description: string; actor: string }[]; module: string }[] = [];
    const seen = new Set<string>();
    const workflowSectionTitles = /workflow|process|flow|sequence|scenario|e2e|end.to.end|pipeline/i;

    for (const section of sections) {
      if (!workflowSectionTitles.test(section.title)) continue;
      const moduleName = section.role || 'General';
      const content = section.content;
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      const steps: { order: number; action: string; description: string; actor: string }[] = [];
      const stepPattern = /^(?:step\s*)?(\d+)[.)\s]+(.+)/i;
      const actorHint = /\b(?:by|actor|user|admin|system|trainer|client|manager)\b/i;
      const actionHint = /\b(?:click|enter|select|upload|submit|navigate|verify|send|create|update|delete|approve|reject)\b/i;

      for (const line of lines) {
        const match = line.match(stepPattern);
        if (match) {
          const order = parseInt(match[1], 10);
          const desc = match[2].trim();
          let actor = 'System';
          const actorMatch = desc.match(new RegExp(`\\b(?:by|actor|performed\\s+by)\\s+(\\w+(?:\\s+\\w+)?)`, 'i'));
          if (actorMatch) actor = actorMatch[1];
          const action = desc.match(actionHint)?.[0] || 'execute';
          steps.push({ order, action, description: desc.slice(0, 300), actor });
        } else if (steps.length === 0 && line.length < 100 && !line.endsWith(':')) {
          // First non-step line might be the workflow name/trigger
          if (line.length < 80 && !workflows.length) continue;
        }
      }

      if (steps.length >= 2) {
        const dedupKey = `${section.title}|${steps.length}`.toLowerCase();
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          const trigger = lines.find(l => /(?:trigger|when|on\s+|initiated|started)\b/i.test(l)) || 'User initiates action';
          workflows.push({
            id: `WF-${String(workflows.length + 1).padStart(3, '0')}`,
            name: section.title,
            trigger: trigger.slice(0, 200),
            steps,
            module: moduleName,
          });
        }
      }
    }
    return workflows;
  }

  private detectDocumentType(content: string): string {
    const upper = content.toUpperCase();
    const brdScore = ['BUSINESS REQUIREMENT', 'BUSINESS OBJECTIVE', 'STAKEHOLDER', 'PROJECT SCOPE', 'ASSUMPTION', 'BUSINESS NEED']
      .filter(kw => upper.includes(kw)).length;
    const frdScore = ['FUNCTIONAL REQUIREMENT', 'USE CASE', 'SYSTEM SHOULD', 'USER SHOULD', 'INTERFACE', 'PERMISSION', 'ROLE', 'AUTHENTICATION', 'DASHBOARD', 'MODULE', 'WORKOUT', 'EXERCISE', 'FEATURE']
      .filter(kw => upper.includes(kw)).length;
    if (brdScore === 0 && frdScore === 0) {
      if (/\b(?:should|shall|must|will|can|create|manage|view|access|edit|delete|assign|track)\b/i.test(content.slice(0, 500))) return 'FRD';
      return 'FRD';
    }
    return frdScore >= brdScore ? 'FRD' : 'BRD';
  }

  private async _callOpenAI(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    };
    if (!LLM_BASE_URL.includes('groq.com')) {
      body.response_format = { type: 'json_object' };
    }
    const response = await axios.post(
      `${LLM_BASE_URL}/chat/completions`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 180000,
      },
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response');
    const cleaned = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`LLM returned invalid JSON: ${cleaned.slice(0, 200)}`);
    }
  }

  private async _parseWithLLM(text: string, docType: string): Promise<Record<string, unknown>> {
    const docLabel = docType === 'FRD' ? 'Functional Requirements Document (FRD)' : 'Business Requirements Document (BRD)';

    const systemPrompt = `You are a world-class business analyst and requirements engineer.
Analyze the given document with extreme precision and extract ALL structured information.

Return a JSON object with the following structure based on document type:

For FRD:
{
  "document_type": "FRD",
  "summary": {
    "total_sections": <int>,
    "total_functional_requirements": <int>,
    "total_use_cases": <int>,
    "total_flows": <int>,
    "total_constraints": <int>
  },
  "sections": [{"title": "...", "content": "...", "level": <int>}],
  "functional_requirements": [
    {"id": "FR-001", "title": "...", "description": "...", "module": "...", "priority": "high|medium|low", "source_section": "..."}
  ],
  "use_cases": [{"id": "UC-001", "title": "...", "steps": [...], "source_section": "..."}],
  "flows": [{"id": "FLOW-001", "title": "...", "steps": [...], "source_section": "..."}],
  "constraints": [{"id": "CON-001", "description": "...", "type": "constraint|limitation", "source_section": "..."}]
}

For BRD add:
  "business_objectives": [{"id": "OBJ-001", "description": "...", "source_section": "..."}],
  "stakeholders": [{"id": "SH-001", "name": "...", "role": "...", "source_section": "..."}],
  "non_functional_requirements": [{"id": "NFR-001", "type": "performance|security|...", "description": "...", "source_section": "..."}],
  "assumptions": [{"id": "ASM-001", "description": "...", "source_section": "..."}],
  "scope": {"in_scope": [...], "out_of_scope": [...]}

CRITICAL: Extract EVERY requirement. Preserve full detail. Do not truncate. Assign accurate priorities.`;

    const userPrompt = `Analyze this ${docLabel} and extract all structured information as JSON:

--- DOCUMENT START ---
${text.slice(0, 30000)}
--- DOCUMENT END ---

Provide complete, detailed extraction. Do not skip any requirement.`;

    return this._callOpenAI(systemPrompt, userPrompt);
  }

  private async _generateTestsWithLLM(requirements: GenerateTestsDto['requirements'], framework: string): Promise<Record<string, unknown>> {
    const systemPrompt = `You are a senior QA engineer and test automation expert.
Generate comprehensive, production-quality test cases from the given requirements.

For EACH requirement, generate multiple test cases covering:
1. Positive/Happy Path
2. Negative/Error Path
3. Edge/Boundary Cases
4. Security/Validation cases if applicable

Return JSON with:
{
  "generated_at": "<ISO timestamp>",
  "total_requirements": <int>,
  "total_test_cases": <int>,
  "framework": "<framework>",
  "test_cases": [
    {
      "test_case_id": "TC-<REQ_ID>-<TYPE>",
      "module": "<module derived from requirement>",
      "requirement_ref": "<requirement id>",
      "test_scenario": "<detailed test scenario description>",
      "test_type": "Functional|Negative|Boundary|Security|Validation",
      "positive_negative": "Positive|Negative|Boundary|N/A",
      "preconditions": "<preconditions>",
      "test_steps": ["<step 1>", "<step 2>", ...],
      "action": "<the main action being performed in this test>",
      "test_data": "<specific test data>",
      "expected_result": "<expected result>",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "role": "<role name from module>",
      "status": "Draft"
    }
  ]
}

CRITICAL: Test cases must be SPECIFIC to each requirement. Include concrete test data. Generate at least 3 per requirement (positive, negative, edge). For complex ones, generate 5-7.`;

    const userPrompt = `Generate comprehensive test cases for these ${requirements.length} requirements using ${framework} framework. Use the exact JSON format specified (test_case_id, module, requirement_ref, test_scenario, test_type, positive_negative, preconditions, test_steps, action, test_data, expected_result, priority, severity, role, status).

--- REQUIREMENTS ---
${JSON.stringify(requirements, null, 2)}
--- END REQUIREMENTS ---

Generate specific, actionable test cases with concrete test data and detailed steps.`;

    const result = await this._callOpenAI(systemPrompt, userPrompt);
    const rawTestCases = (result?.test_cases || []) as Record<string, unknown>[];
    const tcs = rawTestCases.map((tc: Record<string, unknown>) => {
      const rawModule = String(tc.module || tc.role || tc.requirement_ref || '');
      const roleName = this._detectRoleFromSection(rawModule) || 'General';
      return { ...tc, module: roleName, role: roleName };
    });
    return {
      ...result,
      generated_at: result.generated_at || new Date().toISOString(),
      test_cases: tcs,
      groups: this._groupTestCasesByModule(tcs),
    };
  }

  private _generateTestsLocally(requirements: GenerateTestsDto['requirements'], framework: string): Record<string, unknown> {
    const now = new Date().toISOString();
    const PRIORITY_WEIGHT: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2 };

    const s = (v: unknown): string => v == null ? '' : String(v);

    const testCases: Record<string, unknown>[] = [];
    for (const raw of requirements) {
      const req = raw as unknown as LocalRequirement;
      const baseWeight = PRIORITY_WEIGHT[String(req.priority).toLowerCase()] || 3;
      const count = Math.min(Math.max(baseWeight, 2), 5);

      const br = req.business_rules || [];
      const vr = req.validation_rules || [];
      const ae = req.api_endpoints || [];
      const pm = req.permissions || [];
      const wf = req.workflows || [];
      const hasEnhanced = br.length > 0 || vr.length > 0 || ae.length > 0 || pm.length > 0 || wf.length > 0;

      const role = req.module || 'General';

      // 1. Business rule verification (Positive)
      if (br.length > 0) {
        for (const rule of br.slice(0, 2)) {
          testCases.push({
            test_case_id: `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-BR-${String(testCases.length + 1).padStart(2, '0')}`,
            module: role,
            requirement_ref: req.id || '',
            test_scenario: `Verify business rule: ${s(rule['description']).slice(0, 100)}`,
            test_type: 'Functional',
            positive_negative: 'Positive',
            preconditions: `System is configured for ${s(rule['module'] || role)} module`,
            test_steps: [
              `Navigate to ${s(rule['module'] || role)} module`,
              `Apply conditions matching: ${s(rule['description']).slice(0, 80)}`,
              `Verify the ${s(rule['type'] || 'logic')} rule is enforced correctly`,
            ],
            action: `Execute business rule: ${s(rule['id'] || 'BR')}`,
            test_data: `Input matching rule conditions (${s(rule['type'] || 'logic')})`,
            expected_result: `Business rule ${s(rule['id'])} is enforced: ${s(rule['description']).slice(0, 120)}`,
            priority: s(rule['priority'] || req.priority || 'MEDIUM').toUpperCase(),
            severity: (s(rule['priority']) === 'critical' || s(rule['priority']) === 'high' ? 'HIGH' : 'MEDIUM'),
            role,
            status: 'Draft',
          });
        }
      }

      // 2. Validation rule verification (Negative/Validation)
      if (vr.length > 0) {
        for (const rule of vr.slice(0, 2)) {
          testCases.push({
            test_case_id: `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-VR-${String(testCases.length + 1).padStart(2, '0')}`,
            module: role,
            requirement_ref: req.id || '',
            test_scenario: `Validate field '${s(rule['field'])}' with rule: ${s(rule['rule'])}`,
            test_type: 'Validation',
            positive_negative: 'Negative',
            preconditions: `Access ${s(rule['module'] || role)} module with input form`,
            test_steps: [
              `Navigate to ${s(rule['module'] || role)} module`,
              `Locate field: ${s(rule['field'])}`,
              `Enter value that violates rule (${s(rule['rule'])}: ${s(rule['value'])})`,
              `Submit and verify error message: "${s(rule['errorMessage'])}"`,
            ],
            action: `Validate '${s(rule['field'])}' with invalid ${s(rule['rule'])}`,
            test_data: `Invalid ${s(rule['rule'])} value for '${s(rule['field'])}' (rule: ${s(rule['value'])})`,
            expected_result: `System shows: "${s(rule['errorMessage'])}" for field '${s(rule['field'])}'`,
            priority: 'HIGH',
            severity: 'HIGH',
            role,
            status: 'Draft',
          });
        }
      }

      // 3. API endpoint test cases
      if (ae.length > 0) {
        for (const ep of ae.slice(0, 2)) {
          testCases.push({
            test_case_id: `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-API-${String(testCases.length + 1).padStart(2, '0')}`,
            module: role,
            requirement_ref: req.id || '',
            test_scenario: `Test API ${s(ep['method'] || 'GET')} ${s(ep['path'])}`,
            test_type: 'Functional',
            positive_negative: ep['auth'] ? 'N/A' : 'Positive',
            preconditions: ep['auth'] ? 'User is authenticated with valid token' : 'System is operational',
            test_steps: [
              `Send ${s(ep['method'] || 'GET')} request to ${s(ep['path'] || '/api/endpoint')}`,
              ...(ep['auth'] ? ['Include valid auth token in request headers'] : []),
              `Verify HTTP status code is 2xx for success case`,
            ],
            action: `Call ${s(ep['method'] || 'GET')} ${s(ep['path'] || '/api/endpoint').slice(0, 80)}`,
            test_data: `Endpoint: ${s(ep['path'])}, Method: ${s(ep['method'] || 'GET')}${ep['auth'] ? ', Auth required' : ''}`,
            expected_result: `API ${s(ep['method'] || 'GET')} ${s(ep['path'])} responds successfully${ep['auth'] ? ' with valid authentication' : ''}`,
            priority: 'HIGH',
            severity: 'MEDIUM',
            role,
            status: 'Draft',
          });
        }
      }

      // 4. Permission-based test cases
      if (pm.length > 0) {
        for (const perm of pm.slice(0, 2)) {
          const permList = (perm['permissions'] || []) as string[];
          testCases.push({
            test_case_id: `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-PERM-${String(testCases.length + 1).padStart(2, '0')}`,
            module: role,
            requirement_ref: req.id || '',
            test_scenario: `Verify role '${s(perm['role'])}' has ${permList.join(', ')} access to '${s(perm['module'])}'`,
            test_type: 'Security',
            positive_negative: 'Positive',
            preconditions: `User is logged in with role '${s(perm['role'])}'`,
            test_steps: [
              `Login as user with role '${s(perm['role'])}'`,
              `Navigate to '${s(perm['module'])}' module`,
              `Attempt to ${permList.join('/')} resources in this module`,
              `Verify access is granted as expected`,
            ],
            action: `Verify ${s(perm['role'])} permissions on '${s(perm['module'])}'`,
            test_data: `Role: ${s(perm['role'])}, Module: ${s(perm['module'])}, Expected permissions: ${permList.join(', ')}`,
            expected_result: `User with role '${s(perm['role'])}' can ${permList.join('/')} resources in '${s(perm['module'])}'`,
            priority: 'CRITICAL',
            severity: 'CRITICAL',
            role,
            status: 'Draft',
          });
        }
      }

      // 5. Workflow-based test cases
      if (wf.length > 0) {
        for (const flow of wf.slice(0, 2)) {
          const flowSteps = (flow['steps'] || []) as Record<string, unknown>[];
          testCases.push({
            test_case_id: `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-WF-${String(testCases.length + 1).padStart(2, '0')}`,
            module: role,
            requirement_ref: req.id || '',
            test_scenario: `Execute workflow: ${s(flow['name']).slice(0, 100)}`,
            test_type: 'Functional',
            positive_negative: 'Positive',
            preconditions: `Workflow trigger condition met: ${s(flow['trigger'] || 'User initiates action').slice(0, 100)}`,
            test_steps: flowSteps.map((sItem: Record<string, unknown>, idx: number) =>
              `Step ${idx + 1}: ${s(sItem['description']).slice(0, 120) || s(sItem['action'])} (actor: ${s(sItem['actor'] || 'System')})`
            ),
            action: `Execute workflow '${s(flow['name'] || 'Unnamed')}'`,
            test_data: `Workflow: ${s(flow['name'])}, Steps: ${flowSteps.length}`,
            expected_result: `Workflow '${s(flow['name'])}' completes all ${flowSteps.length} steps successfully`,
            priority: s(req.priority || 'MEDIUM'),
            severity: 'MEDIUM',
            role,
            status: 'Draft',
          });
        }
      }

      // 6. Fallback: generic test cases if no enhanced data is available
      if (!hasEnhanced) {
        const types = ['Positive', 'Negative', 'Boundary'];
        if (count >= 4) types.push('Validation');
        if (count >= 5) types.push('Security');

        for (let i = 0; i < count; i++) {
          const tcType = types[i] || 'Functional';
          const tcId = `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-${tcType.toUpperCase()}`;

          testCases.push({
            test_case_id: tcId,
            module: role,
            requirement_ref: req.id || '',
            test_scenario: `${tcType === 'Positive' ? 'Verify' : tcType === 'Negative' ? 'Verify error handling for' : 'Test boundary conditions for'} ${s(req.title || 'requirement')}`,
            test_type: tcType === 'Positive' ? 'Functional' : tcType === 'Negative' ? 'Negative' : tcType === 'Boundary' ? 'Boundary' : tcType,
            positive_negative: tcType === 'Positive' ? 'Positive' : tcType === 'Negative' ? 'Negative' : tcType === 'Boundary' ? 'Boundary' : 'N/A',
            preconditions: tcType === 'Positive' ? 'System is operational and accessible' : 'System is operational',
            test_steps: [
              `Navigate to ${role} module`,
              `Execute ${tcType.toLowerCase()} test scenario for: ${s(req.title || req.id)}`,
              `Verify the expected behavior`,
            ],
            action: tcType === 'Positive' ? `Execute ${s(req.title || 'the functionality')}` : tcType === 'Negative' ? `Attempt invalid input for ${s(req.title || 'the functionality')}` : `Test edge cases for ${s(req.title || 'the functionality')}`,
            test_data: tcType === 'Positive' ? 'Valid input data as per requirement' : tcType === 'Negative' ? 'Invalid/malformed input data' : 'Boundary values, empty, max length, special chars',
            expected_result: tcType === 'Positive' ? `Operation completes successfully: ${s(req.title || 'requirement')}` : tcType === 'Negative' ? `System shows appropriate error message for: ${s(req.title || 'requirement')}` : `System handles boundary conditions gracefully for: ${s(req.title || 'requirement')}`,
            priority: tcType === 'Negative' || tcType === 'Security' ? 'HIGH' : s(req.priority || 'MEDIUM'),
            severity: tcType === 'Negative' ? 'HIGH' : 'MEDIUM',
            role,
            status: 'Draft',
          });
        }
      }
    }

    const finalTestCases = testCases.map((tc: Record<string, unknown>) => {
      const roleName = this._detectRoleFromSection(s(tc['module'] || tc['role'])) || 'General';
      return { ...tc, module: roleName, role: roleName };
    });
    return {
      generated_at: now,
      total_requirements: requirements.length,
      total_test_cases: finalTestCases.length,
      framework,
      test_cases: finalTestCases,
      groups: this._groupTestCasesByModule(finalTestCases),
      fallback: true,
    };
  }
}
