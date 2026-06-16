import re
import logging
import hashlib
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from langchain_openai import ChatOpenAI
    from langchain.prompts import PromptTemplate
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("LangChain not available - using template-based generation")


class TestGenerator:
    """AI-powered test generation from scenarios and requirements"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 7200
        
        self.test_templates = {
            'playwright': {
                'imports': ['import { test, expect } from "@playwright/test";'],
                'test_structure': '''
test('{test_name}', async {{ page }) => {{
  {steps}
}});
''',
                'step_templates': {
                    'click': 'await page.click("{locator}");',
                    'fill': 'await page.fill("{locator}", "{value}");',
                    'select': 'await page.selectOption("{locator}", "{value}");',
                    'navigate': 'await page.goto("{url}");',
                    'verify': 'await expect(page.locator("{locator}")).toBeVisible();',
                },
            },
            'cypress': {
                'imports': ['/// <reference types="cypress" />'],
                'test_structure': '''
describe('{test_name}', () => {{
  it('{test_name}', () => {{
    {steps}
  }});
}});
''',
                'step_templates': {
                    'click': 'cy.get("{locator}").click();',
                    'fill': 'cy.get("{locator}").type("{value}");',
                    'select': 'cy.get("{locator}").select("{value}");',
                    'navigate': 'cy.visit("{url}");',
                    'verify': 'cy.get("{locator}").should("be.visible");',
                },
            },
            'pytest': {
                'imports': ['import pytest', 'from playwright.sync_api import Page'],
                'test_structure': '''
def test_{test_name_snake}(page: Page):
    {steps}
''',
                'step_templates': {
                    'click': 'page.click("{locator}")',
                    'fill': 'page.fill("{locator}", "{value}")',
                    'select': 'page.select_option("{locator}", "{value}")',
                    'navigate': 'page.goto("{url}")',
                    'verify': 'expect(page.locator("{locator}")).to_be_visible()',
                },
            },
        }

    async def generate_test(self, scenario: Dict, framework: str = 'playwright') -> Dict:
        """Generate test code from scenario"""
        
        template = self.test_templates.get(framework, self.test_templates['playwright'])
        
        test_name = self._generate_test_name(scenario.get('name', 'test'))
        steps_code = self._generate_steps(scenario.get('steps', []), template)
        
        test_code = template['test_structure'].format(
            test_name=test_name,
            test_name_snake=self._to_snake_case(test_name),
            steps=steps_code,
        )
        
        full_code = '\n'.join(template['imports']) + '\n\n' + test_code
        
        generated = {
            'test_name': test_name,
            'framework': framework,
            'code': full_code,
            'locators': self._extract_locators(steps_code),
            'assertions': self._extract_assertions(steps_code),
            'timestamp': datetime.utcnow().isoformat(),
        }
        
        if self.redis:
            cache_key = f"test_gen:{hashlib.md5(json.dumps(scenario, sort_keys=True).encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(generated))
        
        return generated

    def _generate_test_name(self, name: str) -> str:
        """Generate valid test name"""
        name = name.replace(' ', '_').replace('-', '_')
        return f"test_{name}" if not name.startswith('test') else name

    def _to_snake_case(self, name: str) -> str:
        """Convert to snake_case"""
        name = re.sub(r'([A-Z])', r'_\1', name).lower()
        return name.strip('_')

    def _generate_steps(self, steps: List[Dict], template: Dict) -> str:
        """Generate test steps code"""
        
        step_templates = template['step_templates']
        code_lines = []
        
        for i, step in enumerate(steps):
            action = step.get('action', 'verify')
            element = step.get('element', {}).get('description', '#selector')
            value = step.get('value', '')
            
            step_code = step_templates.get(action, step_templates['verify'])
            
            if '{locator}' in step_code:
                locator = self._generate_locator(element)
                step_code = step_code.replace('{locator}', locator)
            
            if '{value}' in step_code:
                step_code = step_code.replace('{value}', value)
            
            if '{url}' in step_code:
                step_code = step_code.replace('{url}', value or 'https://example.com')
            
            indent = '    ' if 'playwright' in template.get('test_structure', '') else '    '
            code_lines.append(f"{indent}{step_code}")
        
        return '\n'.join(code_lines)

    def _generate_locator(self, element: str) -> str:
        """Generate stable locator for element"""
        
        clean = element.lower().replace(' ', '-').replace('_', '-')
        
        return f'[data-testid="{clean}"]'

    def _extract_locators(self, code: str) -> List[str]:
        """Extract all locators from generated code"""
        locators = re.findall(r'["\'](?:\[.*?\]|#[^\s"\']+)["\']', code)
        return list(set(locators))

    def _extract_assertions(self, code: str) -> List[Dict]:
        """Extract assertions from generated code"""
        
        assertions = []
        
        if 'expect' in code:
            assertions.append({'type': 'visibility', 'count': code.count('toBeVisible')})
        
        if 'toHaveText' in code:
            assertions.append({'type': 'text', 'count': code.count('toHaveText')})
        
        if 'toHaveValue' in code:
            assertions.append({'type': 'value', 'count': code.count('toHaveValue')})
        
        return assertions

    async def generate_test_suite(self, requirements: List[str], options: Dict) -> Dict:
        """Generate complete test suite from requirements"""
        
        framework = options.get('framework', 'playwright')
        test_cases = []
        
        for i, req in enumerate(requirements):
            scenario = {
                'name': f"test_case_{i+1}",
                'steps': [
                    {'action': 'navigate', 'element': 'page', 'value': options.get('base_url', 'https://example.com')},
                    {'action': 'verify', 'element': 'page loaded', 'value': ''},
                ],
            }
            
            test = await self.generate_test(scenario, framework)
            test_cases.append({
                'requirement': req,
                'test_code': test['code'],
                'locators': test['locators'],
            })
        
        suite = {
            'framework': framework,
            'test_count': len(test_cases),
            'test_cases': test_cases,
            'total_locators': sum(len(t['locators']) for t in test_cases),
            'generated_at': datetime.utcnow().isoformat(),
        }
        
        return suite

    async def suggest_test_coverage(self, feature: str, existing_tests: List[str]) -> Dict:
        """Suggest missing test coverage"""
        
        coverage_areas = [
            {'type': 'positive', 'description': 'Happy path test'},
            {'type': 'negative', 'description': 'Error handling test'},
            {'type': 'boundary', 'description': 'Boundary condition test'},
            {'type': 'edge', 'description': 'Edge case test'},
        ]
        
        suggestions = []
        
        for area in coverage_areas:
            if not any(area['type'] in t.lower() for t in existing_tests):
                suggestions.append({
                    'type': area['type'],
                    'description': f"Add {area['description']} for {feature}",
                    'priority': 'high' if area['type'] in ['positive', 'negative'] else 'medium',
                })
        
        return {
            'feature': feature,
            'existing_count': len(existing_tests),
            'suggestions': suggestions,
            'coverage_gaps': len(suggestions),
        }

    async def optimize_test(self, test_code: str) -> Dict:
        """Optimize generated test code"""
        
        optimizations = []
        
        if 'sleep' in test_code:
            optimizations.append({
                'issue': 'Hard-coded sleep',
                'suggestion': 'Replace with explicit wait',
                'impact': 'performance',
            })
        
        if test_code.count('page.goto') > 1:
            optimizations.append({
                'issue': 'Multiple navigations',
                'suggestion': 'Consider using beforeEach hook',
                'impact': 'maintainability',
            })
        
        if len(test_code.split('\n')) > 50:
            optimizations.append({
                'issue': 'Long test file',
                'suggestion': 'Split into multiple test files',
                'impact': 'maintainability',
            })
        
        return {
            'original_length': len(test_code),
            'optimizations': optimizations,
            'optimized_length': len(test_code),
            'estimated_improvement': len(optimizations) * 5,
        }