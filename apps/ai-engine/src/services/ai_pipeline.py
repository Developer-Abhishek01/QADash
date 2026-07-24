import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class AIPipeline:
    def __init__(self, nlp_parser, test_generator, test_validator, llm_service):
        self.nlp_parser = nlp_parser
        self.test_generator = test_generator
        self.test_validator = test_validator
        self.llm_service = llm_service

    async def process_test_suite_from_excel(self, rows: List[Dict]) -> Dict:
        test_cases = []
        for row in rows:
            test_case = await self._convert_row_to_test_case(row)
            if test_case:
                validation = await self.test_validator.validate_test_case(test_case)
                test_case['validation'] = validation

                if validation['is_valid']:
                    generated = await self.test_generator.generate_test(test_case, 'playwright')
                    test_case['generated_code'] = generated.get('code', '')
                    test_case['locators'] = generated.get('locators', [])
                    test_case['llm_generated'] = generated.get('llm_generated', False)
                    test_case['confidence'] = generated.get('confidence', 0)

                test_cases.append(test_case)

        all_valid = all(tc.get('validation', {}).get('is_valid', False) for tc in test_cases)

        return {
            'success': True,
            'total': len(test_cases),
            'valid_count': sum(1 for tc in test_cases if tc.get('validation', {}).get('is_valid', False)),
            'invalid_count': sum(1 for tc in test_cases if not tc.get('validation', {}).get('is_valid', False)),
            'test_cases': test_cases,
            'processed_at': datetime.now(timezone.utc).isoformat(),
        }

    async def process_natural_language(self, text: str, context: Optional[Dict] = None) -> Dict:
        nlp_result = await self.nlp_parser.parse_scenario(text, context)
        if not nlp_result or not nlp_result.get('steps'):
            return {'success': False, 'error': 'Could not parse any steps from the text', 'test_cases': []}

        test_case = {
            'name': context.get('name', 'Generated Test') if context else 'Generated Test',
            'module': context.get('module', 'General') if context else 'General',
            'description': text[:500],
            'url': context.get('url', '') if context else '',
            'preconditions': context.get('preconditions', '') if context else '',
            'steps': nlp_result.get('steps', []),
            'test_data': context.get('test_data', {}) if context else {},
            'expected_result': context.get('expected_result', '') if context else '',
        }

        validation = await self.test_validator.validate_test_case(test_case)
        test_case['validation'] = validation

        if validation['is_valid']:
            generated = await self.test_generator.generate_test(test_case, 'playwright')
            test_case['generated_code'] = generated.get('code', '')
            test_case['locators'] = generated.get('locators', [])
            test_case['llm_generated'] = generated.get('llm_generated', False)
            test_case['confidence'] = generated.get('confidence', 0)

        return {
            'success': validation['is_valid'],
            'nlp_analysis': nlp_result,
            'test_case': test_case,
            'is_valid': validation['is_valid'],
            'validation_errors': validation.get('errors', []),
            'processed_at': datetime.now(timezone.utc).isoformat(),
        }

    async def generate_from_requirements(self, requirements: List[Dict], options: Optional[Dict] = None) -> Dict:
        options = options or {}
        framework = options.get('framework', 'playwright')
        all_test_cases = []

        for req in requirements:
            description = req.get('description', req.get('text', ''))
            module = req.get('module', 'General')
            preconditions = req.get('preconditions', '')

            test_case = {
                'name': req.get('name', f'Test for {module}'),
                'module': module,
                'description': description,
                'url': options.get('base_url', ''),
                'preconditions': preconditions,
                'steps': [
                    {'action': 'navigate', 'value': options.get('base_url', ''), 'url': options.get('base_url', '')},
                    {'action': 'verify', 'element': 'page', 'expected': 'Page loaded'},
                ],
                'test_data': req.get('test_data', {}),
                'expected_result': req.get('expected_result', req.get('acceptance_criteria', '')),
            }

            if self.llm_service and self.llm_service.is_available:
                llm_result = await self.llm_service.generate_test_cases([req], framework)
                if llm_result and llm_result.get('test_cases'):
                    for tc in llm_result['test_cases']:
                        steps = [{'action': 'navigate', 'url': options.get('base_url', ''), 'value': options.get('base_url', '')}]
                        for step_text in tc.get('steps', []):
                            parsed = await self.nlp_parser.parse_scenario(step_text)
                            if parsed.get('steps'):
                                steps.extend(parsed['steps'])

                        enriched = {
                            'name': tc.get('title', tc.get('id', 'Test Case')),
                            'module': module,
                            'description': tc.get('description', description),
                            'url': options.get('base_url', ''),
                            'preconditions': tc.get('preconditions', preconditions),
                            'steps': steps,
                            'test_data': tc.get('test_data', {}),
                            'expected_result': tc.get('expected', ''),
                            'requirement_id': tc.get('requirement_id', req.get('id', '')),
                            'priority': tc.get('priority', 'MEDIUM'),
                        }
                        validation = await self.test_validator.validate_test_case(enriched)
                        enriched['validation'] = validation
                        if validation['is_valid']:
                            generated = await self.test_generator.generate_test(enriched, framework)
                            enriched['generated_code'] = generated.get('code', '')
                        all_test_cases.append(enriched)
            else:
                validation = await self.test_validator.validate_test_case(test_case)
                test_case['validation'] = validation
                if validation['is_valid']:
                    generated = await self.test_generator.generate_test(test_case, framework)
                    test_case['generated_code'] = generated.get('code', '')
                all_test_cases.append(test_case)

        return {
            'success': True,
            'total': len(all_test_cases),
            'test_cases': all_test_cases,
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }

    async def _convert_row_to_test_case(self, row: Dict) -> Optional[Dict]:
        name = (row.get('Test Name') or row.get('test_name') or row.get('name') or row.get('Title') or row.get('title', '')).strip()
        if not name:
            return None

        steps_raw = (row.get('Steps') or row.get('steps') or row.get('Test Steps') or row.get('test_steps') or '')
        steps = self._parse_steps_from_text(str(steps_raw))

        return {
            'name': name,
            'module': row.get('Module') or row.get('module') or row.get('Feature') or row.get('feature') or 'General',
            'description': row.get('Description') or row.get('description') or row.get('Scenario') or row.get('scenario') or '',
            'url': row.get('URL') or row.get('url') or row.get('Base URL') or row.get('base_url') or '',
            'preconditions': row.get('Preconditions') or row.get('preconditions') or row.get('Prerequisites') or '',
            'steps': steps,
            'test_data': {
                'input': row.get('Test Data') or row.get('test_data') or row.get('Input') or '',
                'expected': row.get('Expected Result') or row.get('expected_result') or row.get('Expected') or '',
            },
            'expected_result': row.get('Expected Result') or row.get('expected_result') or row.get('Expected') or '',
            'priority': row.get('Priority') or row.get('priority') or 'MEDIUM',
            'tags': [row.get('Tag') or row.get('tag') or row.get('Type') or ''] if (row.get('Tag') or row.get('tag') or row.get('Type')) else [],
        }

    def _parse_steps_from_text(self, text: str) -> List[Dict]:
        lines = [l.strip() for l in text.replace('\\n', '\n').split('\n') if l.strip()]
        steps = []

        for line in lines:
            line = line.lstrip('0123456789.).- ')
            line_lower = line.lower()

            if line_lower.startswith('http://') or line_lower.startswith('https://'):
                steps.append({'action': 'navigate', 'url': line, 'value': line})
            elif any(w in line_lower for w in ['click ', 'tap ', 'press ']):
                steps.append({'action': 'click', 'selector': self._extract_selector(line), 'element': line.replace('click ', '').replace('tap ', '').replace('press ', ''), 'value': line})
            elif any(w in line_lower for w in ['enter ', 'type ', 'fill ', 'input ']):
                val = self._extract_quoted_value(line)
                steps.append({'action': 'fill', 'selector': self._extract_selector(line), 'value': val, 'element': line.split(val)[0] if val else line})
            elif any(w in line_lower for w in ['select ', 'choose ', 'pick ']):
                val = self._extract_quoted_value(line)
                steps.append({'action': 'select', 'selector': self._extract_selector(line), 'value': val})
            elif any(w in line_lower for w in ['verify ', 'check ', 'assert ', 'expect ', 'confirm ']):
                steps.append({'action': 'verify', 'selector': self._extract_selector(line), 'expected': line, 'element': 'page'})
            elif any(w in line_lower for w in ['wait ', 'pause ']):
                steps.append({'action': 'wait', 'ms': 1000, 'value': '1s'})
            elif any(w in line_lower for w in ['hover ']):
                steps.append({'action': 'hover', 'selector': self._extract_selector(line), 'element': line.replace('hover ', '').replace('mouse over ', '')})
            elif any(w in line_lower for w in ['scroll ']):
                steps.append({'action': 'scroll', 'value': '300'})
            elif line_lower.startswith('navigate') or line_lower.startswith('go to') or line_lower.startswith('open '):
                url = self._extract_url(line)
                steps.append({'action': 'navigate', 'url': url, 'value': url})
            else:
                steps.append({'action': 'custom', 'description': line})

        return steps

    def _extract_selector(self, text: str) -> str:
        import re
        match = re.search(r'["\']([^"\']+)["\']', text)
        if match:
            return f'[data-testid="{match.group(1).lower().replace(" ", "-")}"]'

        patterns = [
            r'(?:the |a |an |on )?([a-z\s]+?) (?:button|link|field|input|dropdown|checkbox|radio|modal|dialog|menu|tab|icon)',
            r'(?:in |to |from |of )?([a-z\s]+?) (?:field|box|section)',
        ]
        for p in patterns:
            match = re.search(p, text.lower())
            if match:
                return f'[data-testid="{match.group(1).strip().replace(" ", "-")}"]'

        return '[data-testid="element"]'

    def _extract_quoted_value(self, text: str) -> str:
        import re
        match = re.search(r'["\']([^"\']+)["\']', text)
        return match.group(1) if match else ''

    def _extract_url(self, text: str) -> str:
        import re
        match = re.search(r'https?://[^\s]+', text)
        return match.group(0) if match else text.replace('navigate to ', '').replace('go to ', '').replace('open ', '').strip()
