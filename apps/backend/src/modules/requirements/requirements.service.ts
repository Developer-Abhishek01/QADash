import * as fs from 'fs';
import * as path from 'path';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';

import { ParseDocumentDto, GenerateTestsDto, RequirementsListDto } from './dto/requirements.dto';
import { PrismaService } from '../../common/prisma.service';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:3002';
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.AI2_API_KEY || '';
const LLM_BASE_URL = process.env.AI_BASE_URL || process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
const LLM_MODEL = process.env.AI_MODEL || process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
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

      const apiKey = process.env.AI_ENGINE_API_KEY || 'qadash-ai-dev-key';
      const { data } = await axios.post(
        `${AI_ENGINE_URL}/api/ai/requirements/upload-file`,
        formData,
        { headers: { ...formData.getHeaders(), 'X-API-Key': apiKey }, timeout: 120000, maxBodyLength: Infinity },
      );

      const saved = await this.prisma.requirementDocument.create({
        data: {
          documentType,
          rawContent: data.extracted_from || file.originalname,
          parsedData: data as any,
          summary: (data.summary || {}) as any,
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
            const saved = await this.prisma.requirementDocument.create({
              data: {
                documentType,
                rawContent: text.slice(0, 50000),
                parsedData: llmResult as any,
                summary: llmResult.summary as any,
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
          parsedData: result as any,
          summary: result.summary as any,
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
      const apiKey = process.env.AI_ENGINE_API_KEY || 'qadash-ai-dev-key';
      const { data } = await firstValueFrom(
        this.httpService.post(`${AI_ENGINE_URL}/api/ai/requirements/${endpoint}`, {
          document: dto.document,
          metadata: dto.metadata || {},
        }, { timeout: 60000, headers: { 'X-API-Key': apiKey } }),
      );

      const saved = await this.prisma.requirementDocument.create({
        data: {
          documentType: docType,
          rawContent: dto.document.slice(0, 50000),
          parsedData: data as any,
          summary: (data.summary || {}) as any,
          status: 'PARSED',
        },
      });

      return { id: saved.id, ...data };
    } catch (error) {
      this.logger.warn(`AI Engine ${docType} parsing failed: ${error.message}`);

      // Try direct LLM
      if (LLM_API_KEY) {
        this.logger.log('Trying direct LLM parsing for parseDocument...');
        try {
          const llmResult = await this._parseWithLLM(dto.document, docType);
          if (llmResult) {
            const saved = await this.prisma.requirementDocument.create({
              data: {
                documentType: docType,
                rawContent: dto.document.slice(0, 50000),
                parsedData: llmResult as any,
                summary: (llmResult.summary || {}) as any,
                status: 'PARSED',
              },
            });
            return { id: saved.id, ...llmResult, llm_enhanced: true };
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
          parsedData: result as any,
          summary: (result.summary || {}) as any,
          status: 'PARSED',
        },
      });
      return { id: saved.id, ...result, fallback: true };
    }
  }

  async generateTests(dto: GenerateTestsDto) {
    this.logger.log(`Generating test cases for ${dto.requirements.length} requirements`);

    const framework = dto.framework || 'playwright';
    const cleanReqs = dto.requirements.map(r => this._sanitizeRequirement(r));

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${AI_ENGINE_URL}/api/ai/requirements/generate-tests`, {
          requirements: cleanReqs,
          framework,
        }, { timeout: 120000 }),
      );

      return this._sanitizeTestResults(data);
    } catch (error) {
      this.logger.error(`AI Engine test generation failed: ${error.message}`);

      // Try direct LLM call
      if (LLM_API_KEY) {
        this.logger.log('Trying direct LLM test generation...');
        try {
          const llmResult = await this._generateTestsWithLLM(cleanReqs, framework);
          if (llmResult) return llmResult;
        } catch (llmErr) {
          this.logger.warn(`Direct LLM test generation failed: ${llmErr.message}`);
        }
      }

      this.logger.log('Falling back to local template-based test generation');
      return this._generateTestsLocally(cleanReqs, framework);
    }
  }

  private _sanitizeRequirement(req: any): any {
    const clean = (s: string) =>
      (s || '').replace(CONTROL_CHARS_REGEX, '')
              .replace(/\|/g, ' - ')
              .replace(/\s+/g, ' ')
              .trim();
    return {
      ...req,
      id: clean(req.id),
      title: clean(req.title),
      description: clean(req.description),
      module: clean(req.module),
      priority: clean(req.priority),
    };
  }

  private _sanitizeTestResults(data: any): any {
    if (!data || !data.test_cases) return data;
    const clean = (s: string) =>
      (s || '').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
    return {
      ...data,
      test_cases: data.test_cases.map((tc: any) => ({
        ...tc,
        title: clean(tc.title),
        description: clean(tc.description),
        module: clean(tc.module),
        preconditions: clean(tc.preconditions),
        test_data: clean(tc.test_data),
        expected: clean(tc.expected),
        steps: (tc.steps || []).map((s: string) => clean(s)),
      })),
    };
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
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
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

  private parseDocumentLocally(text: string, docType: string): Record<string, unknown> {
    const asciiChars = text.split('').filter(c => c >= ' ' && c <= '~').length;
    const totalChars = text.length || 1;
    if (asciiChars / totalChars < 0.5) {
      throw new BadRequestException(
        'Extracted text appears to be binary/garbage. Start the AI Engine (port 3002) to parse this file type, or use TXT/XLSX files for offline mode.'
      );
    }
    const lines = text.split('\n').filter(l => l.trim());
    const sections: { title: string; content: string; level: number }[] = [];
    let currentSection = { title: 'preamble', content: '', level: 0 };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,4})\s+(.+)|^([A-Z][A-Z\s]+):|^(\d+\.\s*)(.+)/);
      if (headingMatch) {
        if (currentSection.content.trim()) sections.push(currentSection);
        currentSection = {
          title: (headingMatch[2] || headingMatch[5] || headingMatch[3] || '').trim().replace(/:$/, ''),
          content: '',
          level: headingMatch[1]?.length || 1,
        };
      } else {
        currentSection.content += line + '\n';
      }
    }
    if (currentSection.content.trim()) sections.push(currentSection);

    const functionalReqs: { id: string; title: string; description: string; module: string; priority: string }[] = [];
    const reqPattern = /(?:FR|FRQ|FUNC)[-_]?(\d+)[:\s]+(.+)|(?:The\s+)?(?:system|user|application)\s+(?:should|shall|must|will)\s+(.+?)[.;]/i;
    const prioPattern = /priority[:\s]+(high|medium|low|critical)/i;

    for (const section of sections) {
      for (const line of (section.content + section.title).split('\n')) {
        const match = line.match(reqPattern);
        if (match) {
          const desc = match[2] || match[3] || '';
          if (desc.length < 10) continue;
          const priority = line.match(prioPattern)?.[1]?.toLowerCase() || 'medium';
          functionalReqs.push({
            id: `FR-${String(functionalReqs.length + 1).padStart(3, '0')}`,
            title: desc.trim().slice(0, 100),
            description: desc.trim(),
            module: section.title.toLowerCase().replace(/\s+/g, '_') || 'general',
            priority,
          });
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

    return result;
  }

  private detectDocumentType(content: string): string {
    const upper = content.toUpperCase();
    const brdScore = ['BUSINESS REQUIREMENT', 'BUSINESS OBJECTIVE', 'STAKEHOLDER', 'PROJECT SCOPE', 'ASSUMPTION']
      .filter(kw => upper.includes(kw)).length;
    const frdScore = ['FUNCTIONAL REQUIREMENT', 'USE CASE', 'SYSTEM SHOULD', 'USER SHOULD', 'INTERFACE']
      .filter(kw => upper.includes(kw)).length;
    return brdScore >= frdScore ? 'BRD' : 'FRD';
  }

  private async _callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
    const body: any = {
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

  private async _parseWithLLM(text: string, docType: string): Promise<any> {
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

  private async _generateTestsWithLLM(requirements: GenerateTestsDto['requirements'], framework: string): Promise<any> {
    const systemPrompt = `You are a senior QA engineer and test automation expert.
Generate comprehensive, production-quality test cases from the given requirements.

For EACH requirement, generate multiple test cases covering:
1. Positive/Happy Path
2. Negative/Error Path
3. Edge/Boundary Cases
4. Security/Validation cases if applicable
5. Performance/Load considerations if applicable
6. Integration/Flow tests if applicable

Return JSON with:
{
  "generated_at": "<ISO timestamp>",
  "total_requirements": <int>,
  "total_test_cases": <int>,
  "framework": "<framework>",
  "test_cases": [
    {
      "id": "TC-<REQ_ID>-<TYPE>",
      "requirement_id": "<req id>",
      "title": "[<Type>] <title>",
      "description": "<detailed description>",
      "module": "<module>",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "type": "Functional|Negative|Boundary|Security|Performance|Validation|Integration|UI",
      "preconditions": "<preconditions>",
      "test_data": "<specific test data>",
      "steps": ["<step 1>", ...],
      "expected": "<expected result>",
      "automation_candidate": true|false,
      "framework": "<framework>"
    }
  ]
}

CRITICAL: Test cases must be SPECIFIC to each requirement. Include concrete test data. Generate at least 3 per requirement (positive, negative, edge). For complex ones, generate 5-7.`;

    const userPrompt = `Generate comprehensive test cases for these ${requirements.length} requirements using ${framework} framework:

--- REQUIREMENTS ---
${JSON.stringify(requirements, null, 2)}
--- END REQUIREMENTS ---

Generate specific, actionable test cases with concrete test data and detailed steps.`;

    const result = await this._callOpenAI(systemPrompt, userPrompt);
    return {
      ...result,
      generated_at: result.generated_at || new Date().toISOString(),
    };
  }

  private _generateTestsLocally(requirements: GenerateTestsDto['requirements'], framework: string): any {
    const now = new Date().toISOString();
    const PRIORITY_WEIGHT: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2 };

    const testCases: any[] = [];
    for (const req of requirements) {
      const baseWeight = PRIORITY_WEIGHT[req.priority?.toLowerCase()] || 3;
      const count = Math.min(Math.max(baseWeight, 2), 5);

      const types = ['Positive', 'Negative', 'Boundary'];
      if (count >= 4) types.push('Validation');
      if (count >= 5) types.push('Security');

      for (let i = 0; i < count; i++) {
        const tcType = types[i] || 'Functional';
        const tcId = `TC-${(req.id || 'FR').replace(/[^A-Z0-9_-]/gi, '_')}-${tcType.toUpperCase()}`;

        testCases.push({
          id: tcId,
          requirement_id: req.id || '',
          title: `[${tcType}] ${req.title || 'Untitled'}`,
          description: `${tcType} test for: ${req.description || req.title || ''}`,
          module: req.module || 'general',
          priority: tcType === 'Negative' || tcType === 'Security' ? 'HIGH' : req.priority || 'MEDIUM',
          severity: tcType === 'Negative' ? 'HIGH' : 'MEDIUM',
          type: tcType,
          preconditions: tcType === 'Positive' ? 'System is operational and accessible' : 'System is operational',
          test_data: 'As per requirement specification',
          steps: [
            `Navigate to ${req.module || 'application'} module`,
            `Execute ${tcType.toLowerCase()} test scenario for: ${req.title || req.id}`,
            `Verify the expected behavior`,
          ],
          expected: tcType === 'Positive' ? 'Operation completes successfully' : 'Appropriate error/edge handling is triggered',
          automation_candidate: tcType !== 'Security',
          framework,
        });
      }
    }

    return {
      generated_at: now,
      total_requirements: requirements.length,
      total_test_cases: testCases.length,
      framework,
      test_cases: testCases,
      fallback: true,
    };
  }
}
