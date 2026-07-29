import logging
import hashlib
import json
import re
import tempfile
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class FRDBRDParser:
    """FRD/BRD document parser - extracts structured requirements from business documents"""

    def __init__(self, redis_client=None, llm_service=None):
        self.redis = redis_client
        self.cache_ttl = 7200
        self.llm = llm_service

    async def parse_frd(self, document: str, metadata: Optional[Dict] = None) -> Dict:
        """Parse Functional Requirements Document into structured requirements"""
        cache_key = f"frd:{hashlib.md5(document.encode()).hexdigest()}"
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)

        # Try LLM-powered parsing first
        if self.llm and self.llm.is_available:
            logger.info("Using LLM for FRD parsing")
            llm_result = await self.llm.analyze_document(document, 'FRD', metadata)
            if llm_result:
                if self.redis:
                    await self.redis.setex(cache_key, self.cache_ttl, json.dumps(llm_result))
                return llm_result

        # Fallback to regex-based parsing
        logger.info("LLM unavailable for FRD, using regex fallback")
        sections = self._split_document_sections(document)
        functional_reqs = self._extract_functional_requirements(sections)
        use_cases = self._extract_use_cases(sections)
        flows = self._extract_flows(sections)
        constraints = self._extract_constraints(sections)

        result = {
            'document_type': 'FRD',
            'metadata': metadata or {},
            'parsed_at': datetime.now(timezone.utc).isoformat(),
            'summary': {
                'total_sections': len(sections),
                'total_functional_requirements': len(functional_reqs),
                'total_use_cases': len(use_cases),
                'total_flows': len(flows),
                'total_constraints': len(constraints),
            },
            'sections': sections,
            'functional_requirements': functional_reqs,
            'use_cases': use_cases,
            'flows': flows,
            'constraints': constraints,
        }

        if self.redis:
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(result))
        return result

    async def parse_brd(self, document: str, metadata: Optional[Dict] = None) -> Dict:
        """Parse Business Requirements Document into structured requirements"""
        cache_key = f"brd:{hashlib.md5(document.encode()).hexdigest()}"
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)

        # Try LLM-powered parsing first
        if self.llm and self.llm.is_available:
            logger.info("Using LLM for BRD parsing")
            llm_result = await self.llm.analyze_document(document, 'BRD', metadata)
            if llm_result:
                if self.redis:
                    await self.redis.setex(cache_key, self.cache_ttl, json.dumps(llm_result))
                return llm_result

        # Fallback to regex-based parsing
        logger.info("LLM unavailable for BRD, using regex fallback")
        sections = self._split_document_sections(document)
        business_objectives = self._extract_business_objectives(sections)
        stakeholders = self._extract_stakeholders(sections)
        functional_reqs = self._extract_functional_requirements(sections)
        non_functional_reqs = self._extract_non_functional_requirements(sections)
        assumptions = self._extract_assumptions(sections)
        scope = self._extract_scope(sections)

        result = {
            'document_type': 'BRD',
            'metadata': metadata or {},
            'parsed_at': datetime.now(timezone.utc).isoformat(),
            'summary': {
                'total_sections': len(sections),
                'total_business_objectives': len(business_objectives),
                'total_stakeholders': len(stakeholders),
                'total_functional_requirements': len(functional_reqs),
                'total_non_functional_requirements': len(non_functional_reqs),
                'total_assumptions': len(assumptions),
            },
            'sections': sections,
            'business_objectives': business_objectives,
            'stakeholders': stakeholders,
            'functional_requirements': functional_reqs,
            'non_functional_requirements': non_functional_reqs,
            'assumptions': assumptions,
            'scope': scope,
        }

        if self.redis:
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(result))
        return result

    async def generate_test_cases_from_requirements(
        self, requirements: List[Dict], framework: str = 'playwright'
    ) -> Dict:
        """Generate multiple test cases per requirement (positive, negative, edge)"""
        # Try LLM-powered generation first
        if self.llm and self.llm.is_available:
            logger.info("Using LLM for test case generation")
            llm_result = await self.llm.generate_test_cases(requirements, framework)
            if llm_result:
                return llm_result

        # Fallback to template-based generation
        logger.info("LLM unavailable for test generation, using template fallback")
        test_cases = []

        for req in requirements:
            variants = self._generate_test_case_variants(req, framework)
            test_cases.extend(variants)

        return {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'total_requirements': len(requirements),
            'total_test_cases': len(test_cases),
            'framework': framework,
            'test_cases': test_cases,
        }

    def _split_document_sections(self, document: str) -> List[Dict]:
        """Split document into logical sections based on headings"""
        lines = document.split('\n')
        sections = []
        current_section = {'title': 'preamble', 'content': '', 'level': 0}

        heading_pattern = re.compile(r'^(#{1,4})\s+(.+)|^([A-Z][A-Z\s]+):|^(\d+\.\s*)(.+)')

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            match = heading_pattern.match(stripped)
            if match:
                if current_section['content'].strip():
                    sections.append(current_section)
                title = match.group(2) or match.group(5) or match.group(3) or ''
                current_section = {
                    'title': title.strip().rstrip(':'),
                    'content': '',
                    'level': len(match.group(1)) if match.group(1) else 1,
                }
            else:
                current_section['content'] += line + '\n'

        if current_section['content'].strip():
            sections.append(current_section)

        return sections

    @staticmethod
    def _detect_role(title: str) -> str:
        role_map = [
            (r'\b(super\s*admin|superadmin)\b', 'Superadmin'),
            (r'\b(tenant\s*admin|tenantadmin)\b', 'Tenant Admin'),
            (r'\badmin\b', 'Admin'),
            (r'\btrainer\b', 'Trainer'),
            (r'\bclient\b', 'Client'),
            (r'\bmanager\b', 'Manager'),
            (r'\buser\b', 'User'),
            (r'\b(developer|engineer)\b', 'Developer'),
            (r'\b(owner|supervisor)\b', 'Owner'),
        ]
        for pattern, name in role_map:
            if re.search(pattern, title, re.IGNORECASE):
                return name
        return 'General'

    def _extract_functional_requirements(self, sections: List[Dict]) -> List[Dict]:
        """Extract functional requirements from document sections"""
        requirements = []
        seen = set()
        req_patterns = [
            re.compile(r'(?:FR|FRQ|FUNC)[-_]?(\d+)[:\s]+(.+)', re.IGNORECASE),
            re.compile(r'(?:The\s+)?(?:system|user|application|platform)\s+(?:should|shall|must|will|can|ensures?|supports?|allows?|provides?|requires?|manages?)\s+(.+?)[.;]', re.IGNORECASE),
            re.compile(r'^[-–—●•*▶]\s*(?:FR|Functional Requirement)?\s*[:\-]?\s*(.+)', re.IGNORECASE),
            re.compile(r'^[-–—●•*▶]\s*(.+)', re.IGNORECASE),
        ]
        action_verbs = re.compile(r'(?:create|manage|view|configure|assign(?:ment)?s?|track(?:ing)?|access|edit(?:ing)?|delet(?:e|ing)|add(?:ing)?|updat(?:e|ing)|remov(?:e|ing)|defin(?:e|ing)|set(?:ting)?|generat(?:e|ing|ion)?|export|import|approv(?:e|al)?|review|submit|cancel(?:lation)?|schedul(?:e|ing)|monitor(?:ing)?|log(?:ging)?|perform(?:ance|ing)?|conduct|chat|complet(?:e|ing)|check(?:ing)?)\b', re.IGNORECASE)
        skip_lines = re.compile(r'^(?:overview|introduction|table\s+of\s+contents|sequence|participant|end$|note:?|note\b)', re.IGNORECASE)
        prio_pattern = re.compile(r'priority[:\s]+(high|medium|low|critical)', re.IGNORECASE)
        req_patterns = [
            re.compile(r'(?:FR|FRQ|FUNC)[-_]?(\d+)[:\s]+(.+)', re.IGNORECASE),
            re.compile(r'(?:The\s+)?(?:system|user|application|platform)\s+(?:should|shall|must|will|can|ensures?|supports?|allows?|provides?|requires?|manages?)\s+(.+?)[.;]', re.IGNORECASE),
            re.compile(r'^[-–—●•*▶]\s*(?:FR|Functional Requirement)?\s*[:\-]?\s*(.+)', re.IGNORECASE),
            re.compile(r'^[-–—●•*▶]\s*(?:✅|❌|⚠️)?\s*(.+)', re.IGNORECASE),
        ]

        for section in sections:
            content = section['content'] + section['title']
            section_title_lower = section['title'].lower()
            is_role_section = bool(re.search(r'(?:permissions?|responsibilities?|features?|capabilities?|access|roles?|allowed)', section_title_lower))

            module_name = self._detect_role(section['title'])

            for line in content.split('\n'):
                line = line.strip()
                if not line or len(line) < 10 or skip_lines.search(line):
                    continue
                if line in seen:
                    continue
                seen.add(line)

                # Role/permission sections: every action-verb line is a requirement
                if is_role_section and action_verbs.search(line):
                    priority = 'medium'
                    prio_match = prio_pattern.search(line)
                    if prio_match:
                        priority = prio_match.group(1).lower()
                    requirements.append({
                        'id': f"FR-{len(requirements)+1:03d}",
                        'title': line[:100],
                        'description': line,
                        'module': module_name,
                        'priority': priority,
                        'source_section': section['title'],
                    })
                    continue

                # Any line with an action verb is likely a requirement
                if action_verbs.search(line):
                    priority = 'medium'
                    prio_match = prio_pattern.search(line)
                    if prio_match:
                        priority = prio_match.group(1).lower()
                    requirements.append({
                        'id': f"FR-{len(requirements)+1:03d}",
                        'title': line[:100],
                        'description': line,
                        'module': module_name,
                        'priority': priority,
                        'source_section': section['title'],
                    })
                    continue

                for pattern in req_patterns:
                    match = pattern.search(line)
                    if match:
                        desc = match.group(2) if match.lastindex and match.lastindex >= 2 else match.group(1)
                        if not desc or len(desc) < 10:
                            continue
                        priority = 'medium'
                        prio_match = prio_pattern.search(line)
                        if prio_match:
                            priority = prio_match.group(1).lower()
                        requirements.append({
                            'id': f"FR-{len(requirements)+1:03d}",
                            'title': desc.strip()[:100],
                            'description': desc.strip(),
                            'module': module_name,
                            'priority': priority,
                            'source_section': section['title'],
                        })
                        break

        return requirements

    def _extract_use_cases(self, sections: List[Dict]) -> List[Dict]:
        """Extract use cases from document"""
        use_cases = []
        uc_pattern = re.compile(r'(?:UC|Use\sCase)[-_]?(\d+)?[:\s]+(.+)', re.IGNORECASE)
        step_pattern = re.compile(r'(?:^\d+[.)]\s*)(.+)', re.MULTILINE)

        for section in sections:
            content = section['content']
            uc_match = uc_pattern.search(content + section['title'])
            if not uc_match:
                if 'use case' in section['title'].lower():
                    uc_match = re.search(r'(.+)', section['title'])

            if uc_match:
                title = uc_match.group(2) or uc_match.group(1) or section['title']
                steps = step_pattern.findall(content)
                use_cases.append({
                    'id': f"UC-{len(use_cases)+1:03d}",
                    'title': title.strip(),
                    'steps': [s.strip() for s in steps[:10]] if steps else [],
                    'source_section': section['title'],
                })

        return use_cases

    def _extract_flows(self, sections: List[Dict]) -> List[Dict]:
        """Extract workflow/process flows"""
        flows = []
        flow_pattern = re.compile(r'(?:flow|process|workflow)[:\s]+(.+)', re.IGNORECASE)

        for section in sections:
            content = section['content'] + section['title']
            flow_match = flow_pattern.search(content)
            if flow_match or 'flow' in section['title'].lower():
                lines = [l.strip() for l in content.split('\n') if l.strip() and not l.strip().startswith('#')]
                steps = [l for l in lines if re.match(r'^\d+[.)\s]', l) or l.startswith('- ') or l.startswith('* ')]
                flows.append({
                    'id': f"FLOW-{len(flows)+1:03d}",
                    'title': flow_match.group(1).strip() if flow_match else section['title'],
                    'steps': [s.strip().lstrip('0123456789.).-* ') for s in steps[:15]] if steps else lines[:10],
                    'source_section': section['title'],
                })

        return flows

    def _extract_constraints(self, sections: List[Dict]) -> List[Dict]:
        """Extract constraints and assumptions"""
        constraints = []
        constraint_keywords = ['must not', 'cannot', 'should not', 'shall not', 'only if', 'constraint', 'limit']

        for section in sections:
            content = section['content']
            for line in content.split('\n'):
                line_lower = line.lower()
                for kw in constraint_keywords:
                    if kw in line_lower and len(line.strip()) > 20:
                        constraints.append({
                            'id': f"CON-{len(constraints)+1:03d}",
                            'description': line.strip(),
                            'type': 'constraint' if 'constraint' not in kw else 'limitation',
                            'source_section': section['title'],
                        })
                        break

        return constraints

    def _extract_business_objectives(self, sections: List[Dict]) -> List[Dict]:
        """Extract business objectives from BRD"""
        objectives = []
        obj_patterns = [
            re.compile(r'(?:objective|goal|business goal)[:\s]+(.+)', re.IGNORECASE),
            re.compile(r'(?:increase|reduce|improve|automate|optimize)\s+(.+?)[.;]', re.IGNORECASE),
        ]

        for section in sections:
            content = section['content'] + section['title']
            for pattern in obj_patterns:
                matches = pattern.findall(content)
                for m in matches:
                    objectives.append({
                        'id': f"OBJ-{len(objectives)+1:03d}",
                        'description': m.strip(),
                        'source_section': section['title'],
                    })

        return objectives

    def _extract_stakeholders(self, sections: List[Dict]) -> List[Dict]:
        """Extract stakeholders from BRD"""
        stakeholders = []
        sh_pattern = re.compile(r'(?:stakeholder|actor|user\s*role)[:\s]+(.+)', re.IGNORECASE)

        for section in sections:
            content = section['content'] + section['title']
            matches = sh_pattern.findall(content)
            for m in matches:
                stakeholders.append({
                    'id': f"SH-{len(stakeholders)+1:03d}",
                    'name': m.strip(),
                    'source_section': section['title'],
                })

        return stakeholders

    def _extract_non_functional_requirements(self, sections: List[Dict]) -> List[Dict]:
        """Extract non-functional requirements"""
        nf_reqs = []
        nf_patterns = [
            re.compile(r'(?:NFR|NFQ|Non.?Functional)[-_]?(\d+)?[:\s]+(.+)', re.IGNORECASE),
            re.compile(r'(?:performance|security|scalability|availability|reliability|usability)[:\s]+(.+)', re.IGNORECASE),
        ]
        nf_types = ['performance', 'security', 'scalability', 'availability', 'reliability', 'usability']

        for section in sections:
            content = section['content'] + section['title']
            for line in content.split('\n'):
                for pattern in nf_patterns:
                    match = pattern.search(line)
                    if match:
                        desc = match.group(2) or match.group(1) or ''
                        nf_type = 'general'
                        for t in nf_types:
                            if t in line.lower():
                                nf_type = t
                                break
                        nf_reqs.append({
                            'id': f"NFR-{len(nf_reqs)+1:03d}",
                            'type': nf_type,
                            'description': desc.strip(),
                            'source_section': section['title'],
                        })
                        break

        return nf_reqs

    def _extract_assumptions(self, sections: List[Dict]) -> List[Dict]:
        """Extract assumptions from BRD"""
        assumptions = []
        as_pattern = re.compile(r'(?:assumption|assume|assuming)[:\s]+(.+)', re.IGNORECASE)

        for section in sections:
            content = section['content']
            matches = as_pattern.findall(content)
            for m in matches:
                assumptions.append({
                    'id': f"ASM-{len(assumptions)+1:03d}",
                    'description': m.strip(),
                    'source_section': section['title'],
                })

        return assumptions

    def _extract_scope(self, sections: List[Dict]) -> Dict:
        """Extract project scope"""
        in_scope = []
        out_scope = []
        scope_section = None

        for section in sections:
            if 'scope' in section['title'].lower():
                scope_section = section
                break

        if scope_section:
            content = scope_section['content']
            in_match = re.search(r'(?:in[-\s]scope|includes?)[:\s]*(.+?)(?=out[-\s]scope|excludes?)', content, re.IGNORECASE | re.DOTALL)
            out_match = re.search(r'(?:out[-\s]of[-\s]scope|excludes?)[:\s]*(.+)', content, re.IGNORECASE | re.DOTALL)

            if in_match:
                in_scope = [l.strip().lstrip('-* ') for l in in_match.group(1).split('\n') if l.strip()]
            if out_match:
                out_scope = [l.strip().lstrip('-* ') for l in out_match.group(1).split('\n') if l.strip()]

        return {'in_scope': in_scope, 'out_of_scope': out_scope}

    async def extract_text_from_file(self, filename: str, content: bytes) -> str:
        """Extract text from uploaded PDF/DOCX/XLSX files"""
        ext = os.path.splitext(filename)[1].lower()

        if ext == '.pdf':
            return await self._extract_pdf_text(content)
        elif ext in ('.docx', '.doc'):
            return await self._extract_docx_text(content)
        elif ext in ('.xlsx', '.xls'):
            return await self._extract_xlsx_text(content)
        elif ext == '.txt':
            return content.decode('utf-8', errors='replace')
        else:
            raise ValueError(f"Unsupported file type: {ext}. Supported: .pdf, .docx, .xlsx, .txt")

    async def _extract_pdf_text(self, content: bytes) -> str:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(content)
            text = '\n'.join(page.extract_text() for page in reader.pages)
            text = '\n'.join(self._sanitize_text(line) for line in text.split('\n'))
            return text or 'No text could be extracted from PDF'
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Failed to parse PDF: {e}")

    async def _extract_docx_text(self, content: bytes) -> str:
        try:
            import docx
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            try:
                doc = docx.Document(tmp_path)
                text = '\n'.join(p.text for p in doc.paragraphs)
                text = '\n'.join(self._sanitize_text(line) for line in text.split('\n'))
                return text or 'No text could be extracted from DOCX'
            finally:
                os.unlink(tmp_path)
        except Exception as e:
            logger.error(f"DOCX extraction failed: {e}")
            raise ValueError(f"Failed to parse DOCX: {e}")

    def _sanitize_text(self, text: str) -> str:
        """Strip control chars, replace pipe separators, and collapse whitespace"""
        import unicodedata
        cleaned = ''.join(c for c in text if unicodedata.category(c) not in ('Cc', 'Cf'))
        cleaned = cleaned.replace('|', ' - ')
        cleaned = ' '.join(cleaned.split())
        return cleaned.strip()

    async def _extract_xlsx_text(self, content: bytes) -> str:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(content, read_only=True, data_only=True)
            lines = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                lines.append(f"--- Sheet: {sheet_name} ---")
                for row in ws.iter_rows(values_only=True):
                    cell_texts = []
                    for c in row:
                        val = str(c) if c is not None else ''
                        val = self._sanitize_text(val)
                        if val:
                            cell_texts.append(val)
                    if cell_texts:
                        lines.append(' '.join(cell_texts))
            return '\n'.join(lines) or 'No text could be extracted from XLSX'
        except Exception as e:
            logger.error(f"XLSX extraction failed: {e}")
            raise ValueError(f"Failed to parse XLSX: {e}")

    def _base_test_case(self, req: Dict, framework: str) -> Optional[Dict]:
        """Build base test case fields from a requirement"""
        title = self._sanitize_text(req.get('title', '') or req.get('description', '')[:100])
        desc = self._sanitize_text(req.get('description', title))
        req_id = self._sanitize_text(req.get('id', 'REQ-000'))
        priority = self._sanitize_text(req.get('priority', 'medium'))
        module = self._sanitize_text(req.get('module', 'general'))
        if not title and not desc:
            return None
        return {
            'req_id': req_id, 'title': title, 'desc': desc,
            'priority': priority, 'module': module, 'framework': framework,
        }

    def _generate_test_case_variants(self, req: Dict, framework: str) -> List[Dict]:
        """Generate positive, negative, and edge-case test cases per requirement"""
        base = self._base_test_case(req, framework)
        if not base:
            return []

        sev_map = {'critical': 'CRITICAL', 'high': 'HIGH', 'medium': 'MEDIUM', 'low': 'LOW'}
        prio_map = {'critical': 'CRITICAL', 'high': 'HIGH', 'medium': 'MEDIUM', 'low': 'LOW'}
        p = prio_map.get(base['priority'], 'MEDIUM')
        s = sev_map.get(base['priority'], 'MEDIUM')
        t = base['title']
        d = base['desc']
        m = base['module']

        variants = []

        # Read enhanced data fields (passed by backend when documentId is provided)
        br = req.get('business_rules', []) or []
        vr = req.get('validation_rules', []) or []
        ae = req.get('api_endpoints', []) or []
        pm = req.get('permissions', []) or []
        wf = req.get('workflows', []) or []

        # Enhanced: Business rule verification
        for rule in br[:2]:
            rule_desc = rule.get('description', '') or ''
            rule_id = rule.get('id', 'BR')
            rule_type = rule.get('type', 'logic')
            rule_prio = rule.get('priority', 'medium')
            variants.append({
                'id': f"TC-{base['req_id']}-BR-{len(variants) + 1}",
                'requirement_id': base['req_id'],
                'title': f"[Business Rule] {rule_desc[:80]}",
                'description': f"Verify business rule {rule_id}: {rule_desc[:120]}",
                'module': m, 'priority': prio_map.get(rule_prio, p), 'severity': 'HIGH' if rule_prio in ('critical', 'high') else s, 'type': 'Functional',
                'preconditions': f"System is configured for {m} module with rule {rule_id}",
                'test_data': f"Input data matching '{rule_type}' rule: {rule_desc[:80]}",
                'steps': [
                    f"Navigate to {m} module",
                    f"Apply conditions triggering rule: {rule_desc[:80]}",
                    f"Verify {rule_type} rule {rule_id} is enforced",
                ],
                'expected': f"Business rule {rule_id} is enforced correctly: {rule_desc[:120]}",
                'automation_candidate': True, 'framework': framework,
            })

        # Enhanced: Validation rule verification
        for rule in vr[:2]:
            field = rule.get('field', 'unknown')
            rule_name = rule.get('rule', 'validation')
            rule_val = rule.get('value', '')
            err_msg = rule.get('errorMessage', f'Invalid {field}')
            variants.append({
                'id': f"TC-{base['req_id']}-VR-{len(variants) + 1}",
                'requirement_id': base['req_id'],
                'title': f"[Validation] {field} - {rule_name}",
                'description': f"Verify field '{field}' validation: {rule_name} with value '{rule_val}'",
                'module': m, 'priority': 'HIGH', 'severity': 'HIGH', 'type': 'Validation',
                'preconditions': f"Access {m} module with input field '{field}'",
                'test_data': f"Invalid value for '{field}' breaking rule '{rule_name}' (expected {rule_val})",
                'steps': [
                    f"Navigate to {m} module",
                    f"Locate field '{field}'",
                    f"Enter value violating {rule_name} rule (expected: {rule_val})",
                    f"Submit and verify error message",
                ],
                'expected': f"System shows error message: '{err_msg}' for field '{field}'",
                'automation_candidate': True, 'framework': framework,
            })

        # Enhanced: API endpoint test
        for ep in ae[:2]:
            ep_method = (ep.get('method', '') or 'GET').upper()
            ep_path = ep.get('path', '/api/endpoint')
            ep_auth = ep.get('auth', False)
            ep_roles = ep.get('roles', [])
            variants.append({
                'id': f"TC-{base['req_id']}-API-{len(variants) + 1}",
                'requirement_id': base['req_id'],
                'title': f"[API] {ep_method} {ep_path}",
                'description': f"Verify {ep_method} {ep_path} API endpoint",
                'module': m, 'priority': p, 'severity': s, 'type': 'API',
                'preconditions': 'User is authenticated with valid token' if ep_auth else 'System is operational',
                'test_data': f"Endpoint: {ep_path}, Method: {ep_method}" + (f", Roles: {', '.join(ep_roles)}" if ep_roles else ''),
                'steps': [
                    f"Send {ep_method} request to {ep_path}",
                ] + (['Include valid auth token in request headers'] if ep_auth else []) + [
                    f"Verify HTTP 2xx response for {ep_method} {ep_path}",
                ],
                'expected': f"API {ep_method} {ep_path} responds successfully" + (' with valid authentication' if ep_auth else ''),
                'automation_candidate': True, 'framework': framework,
            })

        # Enhanced: Permission-based test
        for perm in pm[:2]:
            perm_role = perm.get('role', 'User')
            perm_module = perm.get('module', m)
            perm_list = perm.get('permissions', ['access'])
            perms_str = ', '.join(perm_list)
            variants.append({
                'id': f"TC-{base['req_id']}-PERM-{len(variants) + 1}",
                'requirement_id': base['req_id'],
                'title': f"[Security] Role '{perm_role}' - {perms_str} on '{perm_module}'",
                'description': f"Verify role '{perm_role}' has {perms_str} access to '{perm_module}'",
                'module': m, 'priority': 'CRITICAL', 'severity': 'CRITICAL', 'type': 'Security',
                'preconditions': f"User is logged in with role '{perm_role}'",
                'test_data': f"Role: {perm_role}, Module: {perm_module}, Permissions: [{perms_str}]",
                'steps': [
                    f"Login as user with role '{perm_role}'",
                    f"Navigate to '{perm_module}' module",
                    f"Attempt to perform: {perms_str}",
                    f"Verify access is granted as expected",
                ],
                'expected': f"User with role '{perm_role}' can {perms_str} resources in '{perm_module}'",
                'automation_candidate': True, 'framework': framework,
            })

        # Enhanced: Workflow test
        for flow in wf[:2]:
            flow_name = flow.get('name', 'Unnamed Workflow')
            flow_trigger = flow.get('trigger', 'User initiates action')
            flow_steps = flow.get('steps', [])
            variants.append({
                'id': f"TC-{base['req_id']}-WF-{len(variants) + 1}",
                'requirement_id': base['req_id'],
                'title': f"[Workflow] {flow_name[:80]}",
                'description': f"Execute workflow '{flow_name}' with {len(flow_steps)} steps",
                'module': m, 'priority': p, 'severity': s, 'type': 'Functional',
                'preconditions': f"Trigger: {flow_trigger[:100]}",
                'test_data': f"Workflow: {flow_name}, Steps: {len(flow_steps)}",
                'steps': [f"Step {idx+1}: {step.get('description', '')[:120] or step.get('action', 'execute')} (actor: {step.get('actor', 'System')})" for idx, step in enumerate(flow_steps)],
                'expected': f"Workflow '{flow_name}' completes all {len(flow_steps)} steps successfully",
                'automation_candidate': True, 'framework': framework,
            })

        # 1. Positive / Happy path
        variants.append({
            'id': f"TC-{base['req_id']}-POS",
            'requirement_id': base['req_id'],
            'title': f"[Positive] {t}",
            'description': f"Verify that {d} works correctly with valid inputs",
            'module': m, 'priority': p, 'severity': s, 'type': 'Functional',
            'preconditions': 'User is logged in and has appropriate permissions',
            'test_data': f"Use valid test data for {m}",
            'steps': [
                f"Navigate to {m} module",
                f"Enter valid input for: {t}",
                "Submit/execute the action",
                "Verify success indicator is displayed",
            ],
            'expected': f"System should successfully handle: {t}",
            'automation_candidate': True, 'framework': framework,
        })

        # 2. Negative / Invalid input
        variants.append({
            'id': f"TC-{base['req_id']}-NEG",
            'requirement_id': base['req_id'],
            'title': f"[Negative] {t} - invalid input",
            'description': f"Verify that {d} rejects invalid inputs gracefully",
            'module': m, 'priority': p, 'severity': s, 'type': 'Negative',
            'preconditions': 'User is logged in and has appropriate permissions',
            'test_data': f"Use invalid/malformed data for {m}",
            'steps': [
                f"Navigate to {m} module",
                f"Enter invalid/malformed input for: {t}",
                "Submit/execute the action",
                "Verify appropriate error message is displayed",
                "Verify system does not crash or hang",
            ],
            'expected': f"System should reject invalid input and show clear error message for: {t}",
            'automation_candidate': True, 'framework': framework,
        })

        # 3. Edge / Boundary case
        variants.append({
            'id': f"TC-{base['req_id']}-EDG",
            'requirement_id': base['req_id'],
            'title': f"[Edge] {t} - boundary conditions",
            'description': f"Verify that {d} handles edge cases (empty, maximum length, special chars)",
            'module': m, 'priority': p, 'severity': s, 'type': 'Boundary',
            'preconditions': 'User is logged in and has appropriate permissions',
            'test_data': f"Use boundary test data (empty, max length, special characters) for {m}",
            'steps': [
                f"Navigate to {m} module",
                "Test with empty/null values",
                "Test with maximum allowed input length",
                "Test with special characters and unicode",
                "Verify system handles all cases gracefully",
            ],
            'expected': f"System should handle boundary conditions without errors for: {t}",
            'automation_candidate': True, 'framework': framework,
        })

        # 4. Keyword-specific variant
        tl = t.lower()
        if 'login' in tl or 'authenticate' in tl or 'sign in' in tl:
            variants.append({
                'id': f"TC-{base['req_id']}-AUTH",
                'requirement_id': base['req_id'],
                'title': f"[Security] {t} - brute force / session",
                'description': f"Verify login/authentication security for: {d}",
                'module': m, 'priority': 'CRITICAL', 'severity': 'CRITICAL', 'type': 'Security',
                'preconditions': 'System is running and accessible',
                'test_data': 'Use multiple invalid passwords, verify session timeout and lockout',
                'steps': [
                    "Attempt login with multiple invalid passwords (>5 attempts)",
                    "Verify account lockout after threshold",
                    "Verify session timeout after inactivity",
                    "Verify no sensitive data in URL or response",
                ],
                'expected': f"System should enforce account lockout, session timeout, and secure authentication for: {t}",
                'automation_candidate': True, 'framework': framework,
            })
        elif 'form' in tl or 'input' in tl or 'field' in tl:
            variants.append({
                'id': f"TC-{base['req_id']}-VAL",
                'requirement_id': base['req_id'],
                'title': f"[Validation] {t} - field validation",
                'description': f"Verify input validation rules for: {d}",
                'module': m, 'priority': p, 'severity': s, 'type': 'Validation',
                'preconditions': 'User is on the form/page with input fields',
                'test_data': 'Use various invalid formats: email without @, phone with letters, negative numbers',
                'steps': [
                    f"Navigate to the form containing: {t}",
                    "Test each field with invalid format",
                    "Verify inline validation errors appear",
                    "Submit with empty required fields",
                    "Verify form is not submitted with validation errors",
                ],
                'expected': f"System should validate all fields and prevent submission with invalid data for: {t}",
                'automation_candidate': True, 'framework': framework,
            })
        elif 'api' in tl or 'endpoint' in tl or 'rest' in tl:
            variants.append({
                'id': f"TC-{base['req_id']}-API",
                'requirement_id': base['req_id'],
                'title': f"[API] {t} - error handling & performance",
                'description': f"Verify API robustness for: {d}",
                'module': m, 'priority': p, 'severity': s, 'type': 'API',
                'preconditions': 'API server is running',
                'test_data': 'Use invalid auth tokens, oversized payloads, concurrent requests',
                'steps': [
                    f"Send request to: {t} without auth token (401)",
                    f"Send request to: {t} with oversized payload (413)",
                    f"Send request to: {t} with invalid HTTP method (405)",
                    "Send 100 concurrent requests to verify rate limiting",
                ],
                'expected': f"System should return appropriate HTTP status codes and handle errors gracefully for: {t}",
                'automation_candidate': True, 'framework': framework,
            })
        elif 'search' in tl or 'filter' in tl or 'query' in tl:
            variants.append({
                'id': f"TC-{base['req_id']}-PERF",
                'requirement_id': base['req_id'],
                'title': f"[Performance] {t} - search/filter performance",
                'description': f"Verify search/filter functionality performs within acceptable limits for: {d}",
                'module': m, 'priority': p, 'severity': s, 'type': 'Performance',
                'preconditions': 'Database has sufficient test data',
                'test_data': 'Use wildcard characters, long strings, special regex patterns',
                'steps': [
                    f"Navigate to {m} search/filter functionality",
                    "Search with partial text (wildcard)",
                    "Search with very long query string",
                    "Search with special regex characters",
                    "Verify results load within 3 seconds",
                ],
                'expected': f"Search/filter should return results quickly (<3s) without errors for: {t}",
                'automation_candidate': True, 'framework': framework,
            })
        elif 'export' in tl or 'download' in tl or 'report' in tl:
            variants.append({
                'id': f"TC-{base['req_id']}-EXPT",
                'requirement_id': base['req_id'],
                'title': f"[Export] {t} - file export integrity",
                'description': f"Verify export/download functionality for: {d}",
                'module': m, 'priority': p, 'severity': s, 'type': 'Export',
                'preconditions': 'Data is available for export',
                'test_data': 'Export with zero records, large dataset, concurrent export requests',
                'steps': [
                    f"Navigate to export functionality for: {t}",
                    "Export with zero records - verify empty file with headers",
                    "Export with large dataset - verify all records are included",
                    "Verify exported file format is correct (CSV/XLSX/PDF)",
                    "Open exported file and verify data integrity",
                ],
                'expected': f"System should export data correctly in the expected format for: {t}",
                'automation_candidate': True, 'framework': framework,
            })

        return variants
