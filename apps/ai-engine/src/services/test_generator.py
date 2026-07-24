import json
import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TestGenerator:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self._llm_client = None
        self._model = None
        self._available = False
        self._init_llm()

    def _init_llm(self):
        api_key = os.environ.get('LLM_API_KEY') or os.environ.get('OPENAI_API_KEY') or ''
        base_url = os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1')
        model = os.environ.get('LLM_MODEL', 'gpt-4o-mini')

        if not api_key:
            logger.warning("No LLM_API_KEY or OPENAI_API_KEY found. Test generator will be unavailable.")
            return

        try:
            from openai import OpenAI
            self._llm_client = OpenAI(api_key=api_key, base_url=base_url)
            self._model = model
            self._available = True
            logger.info(f"TestGenerator initialized with LLM model: {model}")
        except ImportError:
            logger.error("openai package not installed. Install with: pip install openai")
        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {e}")

    async def _call_llm(self, system_prompt: str, user_prompt: str, max_tokens: int = 8192) -> Optional[str]:
        if not self._available or not self._llm_client:
            return None
        try:
            response = self._llm_client.chat.completions.create(
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

    async def generate_test(self, scenario: Dict, framework: str = 'playwright') -> Dict:
        if self._available:
            return await self._generate_with_llm(scenario, framework)

        return self._generate_fallback(scenario, framework)

    async def _generate_with_llm(self, scenario: Dict, framework: str = 'playwright') -> Dict:
        system_prompt = """You are a senior QA automation engineer. Generate production-ready Playwright TypeScript test code.

The test must use:
- Page Object Model pattern
- `await` for all async operations
- `expect()` for assertions
- Auto-waiting strategies (waitForSelector, waitForLoadState)
- data-testid locators as priority, with fallback strategies
- Built-in retry with page.waitForSelector with timeout
- Screenshot capture on failure
- Console and network capture
- Error handling with try/catch

Return JSON:
{
  "test_name": "descriptive test name",
  "framework": "playwright",
  "code": "full TypeScript code with imports",
  "locators": [{"name": "element-name", "strategy": "data-testid", "value": "[data-testid='...']"}],
  "assertions": [{"type": "visibility|text|value|url", "target": "...", "expected": "..."}],
  "page_object_model": "class name for POM",
  "confidence": 0.95,
  "explanation": "brief explanation of what this test does"
}"""

        user_prompt = f"""Generate a Playwright test for this scenario:

Name: {scenario.get('name', 'Test Scenario')}
Module: {scenario.get('module', 'General')}
Description: {scenario.get('description', '')}
Preconditions: {scenario.get('preconditions', '')}
URL: {scenario.get('url', '')}

Steps:
{json.dumps(scenario.get('steps', []), indent=2)}

Test Data: {json.dumps(scenario.get('test_data', {}), indent=2)}
Expected Result: {scenario.get('expected_result', '')}

Generate enterprise-grade Playwright TypeScript code with:
1. Proper imports from @playwright/test
2. Page Object Model class
3. Auto-waiting before each interaction
4. Multiple locator fallback strategies (data-testid -> role -> label -> text -> css -> xpath)
5. Screenshot on failure
6. Console log capture
7. Network request/response logging
8. Proper error handling"""

        result_str = await self._call_llm(system_prompt, user_prompt, max_tokens=8192)
        if result_str:
            try:
                result = json.loads(result_str)
                result['timestamp'] = datetime.now(timezone.utc).isoformat()
                result['llm_generated'] = True
                return result
            except json.JSONDecodeError as e:
                logger.error(f"LLM returned invalid JSON: {e}")

        return self._generate_fallback(scenario, framework)

    def _generate_fallback(self, scenario: Dict, framework: str = 'playwright') -> Dict:
        test_name = scenario.get('name', 'test_scenario').replace(' ', '_')
        steps = scenario.get('steps', [])
        url = scenario.get('url', '')

        code_lines = [
            'import { test, expect, Page } from "@playwright/test";',
            '',
            'test.describe(() => {',
            f'  test("{test_name}", async ({{ page }}) => {{',
        ]

        if url:
            code_lines.append(f'    await page.goto("{url}", {{ waitUntil: "networkidle" }});')

        locators = []
        assertions = []

        for i, step in enumerate(steps):
            action = step.get('action', '').lower()
            element = step.get('element', '')
            value = step.get('value', '')
            selector = step.get('selector', '')

            if not selector and element:
                clean = element.lower().replace(' ', '-').replace('_', '-')
                selector = f'[data-testid="{clean}"]'
                if clean not in [l['name'] for l in locators]:
                    locators.append({'name': clean, 'strategy': 'data-testid', 'value': selector})

            if action == 'navigate':
                code_lines.append(f'    await page.goto("{value or url}", {{ waitUntil: "networkidle" }});')
            elif action == 'click':
                code_lines.append(f'    await page.click("{selector}", {{ timeout: 10000 }});')
            elif action == 'fill' or action == 'type':
                code_lines.append(f'    await page.fill("{selector}", "{value}");')
            elif action == 'select':
                code_lines.append(f'    await page.selectOption("{selector}", "{value}");')
            elif action == 'verify' or action == 'assert':
                expected = step.get('expected', value)
                code_lines.append(f'    await expect(page.locator("{selector}")).toBeVisible({{ timeout: 10000 }});')
                if expected:
                    code_lines.append(f'    await expect(page.locator("{selector}")).toContainText("{expected}");')
                assertions.append({'type': 'visibility', 'target': selector, 'expected': expected})
            elif action == 'wait':
                ms = step.get('ms', 1000)
                code_lines.append(f'    await page.waitForTimeout({ms});')
            elif action == 'hover':
                code_lines.append(f'    await page.hover("{selector}");')
            elif action == 'scroll':
                code_lines.append(f'    await page.evaluate(() => window.scrollBy(0, {value or 300}));')

        code_lines.append('  });')
        code_lines.append('});')

        return {
            'test_name': test_name,
            'framework': framework,
            'code': '\n'.join(code_lines),
            'locators': locators,
            'assertions': assertions,
            'confidence': 0.85,
            'llm_generated': False,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

    async def generate_test_suite(self, requirements: List[str], options: Dict) -> Dict:
        framework = options.get('framework', 'playwright')
        test_cases = []

        for i, req in enumerate(requirements):
            scenario = {
                'name': f"test_case_{i+1}",
                'description': req,
                'url': options.get('base_url', ''),
                'steps': [
                    {'action': 'navigate', 'value': options.get('base_url', '')},
                    {'action': 'verify', 'element': 'page-loaded', 'expected': 'Page loaded successfully'},
                ],
            }
            test = await self.generate_test(scenario, framework)
            test_cases.append({
                'requirement': req,
                'test_code': test['code'],
                'locators': test.get('locators', []),
            })

        return {
            'framework': framework,
            'test_count': len(test_cases),
            'test_cases': test_cases,
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }

    async def suggest_test_coverage(self, feature: str, existing_tests: List[str]) -> Dict:
        if self._available:
            system_prompt = """You are a QA coverage expert. Analyze the feature and existing tests to suggest missing coverage areas.
Return JSON with:
{
  "feature": "...",
  "existing_count": <int>,
  "suggestions": [{"type": "positive|negative|boundary|edge|security|performance", "description": "...", "priority": "high|medium|low"}],
  "coverage_gaps": <int>
}"""
            user_prompt = f"Feature: {feature}\nExisting tests: {json.dumps(existing_tests)}"
            result_str = await self._call_llm(system_prompt, user_prompt, max_tokens=4096)
            if result_str:
                try:
                    return json.loads(result_str)
                except json.JSONDecodeError:
                    pass

        coverage_areas = [
            {'type': 'positive', 'description': f'Happy path test for {feature}', 'priority': 'high'},
            {'type': 'negative', 'description': f'Error handling test for {feature}', 'priority': 'high'},
            {'type': 'boundary', 'description': f'Boundary condition test for {feature}', 'priority': 'medium'},
            {'type': 'edge', 'description': f'Edge case test for {feature}', 'priority': 'medium'},
        ]
        suggestions = [a for a in coverage_areas if not any(a['type'] in t.lower() for t in existing_tests)]
        return {'feature': feature, 'existing_count': len(existing_tests), 'suggestions': suggestions, 'coverage_gaps': len(suggestions)}

    async def optimize_test(self, test_code: str) -> Dict:
        if self._available:
            system_prompt = """You are a Playwright performance expert. Optimize the given test code for:
1. Replace hardcoded sleeps with proper waits
2. Add proper error handling
3. Optimize locators
4. Add screenshots on failure
5. Add trace/viewport config

Return JSON with "optimizations" array and "optimized_code" string."""
            user_prompt = f"Optimize this Playwright test:\n\n{test_code}"
            result_str = await self._call_llm(system_prompt, user_prompt, max_tokens=8192)
            if result_str:
                try:
                    return json.loads(result_str)
                except json.JSONDecodeError:
                    pass

        optimizations = []
        if 'sleep' in test_code:
            optimizations.append({'issue': 'Hard-coded sleep', 'suggestion': 'Replace with explicit wait', 'impact': 'performance'})
        if test_code.count('page.goto') > 1:
            optimizations.append({'issue': 'Multiple navigations', 'suggestion': 'Consider using beforeEach hook', 'impact': 'maintainability'})
        return {'original_length': len(test_code), 'optimizations': optimizations, 'optimized_length': len(test_code), 'estimated_improvement': len(optimizations) * 5}
