import logging
import json
import os
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class LLMService:
    """Service for actual AI/LLM-powered document parsing and test generation"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 7200
        self._client = None
        self._model = None
        self._available = False
        self._init_llm()

    def _init_llm(self):
        api_key = os.environ.get('LLM_API_KEY') or os.environ.get('OPENAI_API_KEY') or ''
        base_url = os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1')
        model = os.environ.get('LLM_MODEL', 'gpt-4o-mini')

        if not api_key:
            logger.warning("No LLM_API_KEY or OPENAI_API_KEY found. LLM features will be unavailable.")
            self._available = False
            return

        try:
            from openai import OpenAI
            self._client = OpenAI(api_key=api_key, base_url=base_url)
            self._model = model
            self._available = True
            logger.info(f"LLM service initialized with model: {model}")
        except ImportError:
            logger.error("openai package not installed. Install with: pip install openai")
            self._available = False
        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {e}")
            self._available = False

    @property
    def is_available(self) -> bool:
        return self._available and self._client is not None

    async def _call_llm(self, system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> Optional[str]:
        if not self.is_available:
            return None
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return None

    async def analyze_document(self, text: str, doc_type: str, metadata: Optional[Dict] = None) -> Optional[Dict]:
        if not self.is_available or not text.strip():
            return None

        doc_label = "Functional Requirements Document (FRD)" if doc_type == "FRD" else "Business Requirements Document (BRD)"

        system_prompt = """You are a world-class business analyst and requirements engineer. 
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
  "sections": [
    {"title": "<section title>", "content": "<full section content>", "level": <int>}
  ],
  "functional_requirements": [
    {
      "id": "FR-001",
      "title": "<short title (max 100 chars)>",
      "description": "<full description of what the system must do>",
      "module": "<module or area name>",
      "priority": "high|medium|low",
      "source_section": "<section where this was found>"
    }
  ],
  "use_cases": [{"id": "UC-001", "title": "...", "steps": [...], "source_section": "..."}],
  "flows": [{"id": "FLOW-001", "title": "...", "steps": [...], "source_section": "..."}],
  "constraints": [{"id": "CON-001", "description": "...", "type": "constraint|limitation", "source_section": "..."}]
}

For BRD add these fields to the same structure:
  "business_objectives": [{"id": "OBJ-001", "description": "...", "source_section": "..."}],
  "stakeholders": [{"id": "SH-001", "name": "...", "role": "...", "source_section": "..."}],
  "non_functional_requirements": [{"id": "NFR-001", "type": "performance|security|...", "description": "...", "source_section": "..."}],
  "assumptions": [{"id": "ASM-001", "description": "...", "source_section": "..."}],
  "scope": {"in_scope": [...], "out_of_scope": [...]}

CRITICAL RULES:
1. Extract EVERY requirement mentioned - do not miss any
2. Preserve the exact meaning and detail from the original text
3. Assign accurate priorities based on language used (must/shall = high, should = medium, could/may = low)
4. Module names should reflect actual system modules mentioned
5. If a requirement ID exists in the document (e.g., FR-001), use it; otherwise generate sequentially
6. Include ALL sections with their full content under 'sections'
7. Do not truncate or summarize requirements - keep the complete description"""

        user_prompt = f"""Analyze this {doc_label} and extract all structured information as JSON:

--- DOCUMENT START ---
{text}
--- DOCUMENT END ---

Provide complete, detailed extraction. Do not skip any requirement."""

        result_str = await self._call_llm(system_prompt, user_prompt, max_tokens=8192)
        if not result_str:
            return None

        try:
            result = json.loads(result_str)
            result['metadata'] = metadata or {}
            result['parsed_at'] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
            result['llm_enhanced'] = True
            return result
        except json.JSONDecodeError as e:
            logger.error(f"LLM returned invalid JSON: {e}")
            return None

    async def generate_test_cases(
        self, requirements: List[Dict], framework: str = 'playwright'
    ) -> Optional[Dict]:
        if not self.is_available or not requirements:
            return None

        system_prompt = """You are a senior QA engineer and test automation expert. 
Generate comprehensive, production-quality test cases from the given requirements.

For EACH requirement, generate multiple test cases covering:
1. Positive/Happy Path - verify normal operation works correctly
2. Negative/Error Path - verify invalid inputs and error conditions are handled
3. Edge/Boundary Cases - verify limits, empty states, special values
4. Security/Validation cases if applicable (auth, input validation, XSS, SQL injection)
5. Performance/Load considerations if applicable
6. Integration/Flow tests if the requirement interacts with other modules
7. UI/UX verification if the requirement has a user interface component

Return JSON with this structure:
{
  "generated_at": "<ISO timestamp>",
  "total_requirements": <int>,
  "total_test_cases": <int>,
  "framework": "<framework>",
  "test_cases": [
    {
      "id": "TC-<REQ_ID>-<TYPE>",
      "requirement_id": "<original req id>",
      "title": "[<Type>] <descriptive title>",
      "description": "<detailed description of what this test verifies>",
      "module": "<module name>",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "type": "Functional|Negative|Boundary|Security|Performance|Validation|Integration|UI",
      "preconditions": "<step-by-step preconditions>",
      "test_data": "<specific test data to use>",
      "steps": ["<step 1>", "<step 2>", ...],
      "expected": "<detailed expected result>",
      "automation_candidate": true|false,
      "framework": "<framework>"
    }
  ]
}

CRITICAL RULES:
1. Test cases must be SPECIFIC to the requirement - not generic templates
2. Include concrete test data values, not placeholders like "valid input"
3. Steps must be detailed and executable by a junior QA engineer
4. Expected results must be verifiable and specific
5. Assign priority based on requirement criticality (must/shall = HIGH, should = MEDIUM)
6. Generate at least 3 test cases per requirement (positive, negative, edge)
7. For complex requirements, generate 5-7 test cases covering different scenarios
8. Test case IDs should follow: TC-{original_req_id}-{POS|NEG|EDG|SEC|VAL|PERF|INT|UI}"""

        reqs_json = json.dumps(requirements, indent=2)
        user_prompt = f"""Generate comprehensive test cases for these {len(requirements)} requirements using {framework} framework:

--- REQUIREMENTS ---
{reqs_json}
--- END REQUIREMENTS ---

Generate specific, actionable test cases. Include concrete test data and detailed steps."""

        result_str = await self._call_llm(system_prompt, user_prompt, max_tokens=8192)
        if not result_str:
            return None

        try:
            result = json.loads(result_str)
            result['llm_enhanced'] = True
            return result
        except json.JSONDecodeError as e:
            logger.error(f"LLM test generation returned invalid JSON: {e}")
            return None
