import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class TestValidator:
    VALID_ACTIONS = {'click', 'fill', 'type', 'select', 'navigate', 'verify', 'assert', 'wait', 'hover', 'scroll', 'upload', 'download', 'screenshot', 'custom'}
    VALID_ASSERTIONS = {'visibility', 'text', 'value', 'url', 'attribute', 'count', 'enabled', 'disabled', 'checked'}
    SUPPORTED_ACTIONS = {'click', 'fill', 'type', 'select', 'navigate', 'verify', 'assert', 'wait', 'hover', 'scroll', 'upload', 'download', 'screenshot'}
    LOCATOR_PATTERNS = [
        r'\[data-testid="[^"]+"\]',
        r'\[data-cy="[^"]+"\]',
        r'\[data-test="[^"]+"\]',
        r'^#[a-zA-Z][\w:-]*$',
        r'^\.[a-zA-Z][\w:-]*',
        r'^[a-zA-Z][\w:-]*$',
        r'^//',
        r'^xpath=',
        r'^role=',
        r'^text=',
        r'^label=',
        r'^placeholder=',
    ]

    def __init__(self, redis_client=None):
        self.redis = redis_client

    async def validate_test_case(self, test_case: Dict) -> Dict:
        errors = []
        warnings = []

        name = test_case.get('name', '')
        if not name or not name.strip():
            errors.append({'field': 'name', 'type': 'MISSING_FIELD', 'message': 'Test case name is required'})

        steps = test_case.get('steps', [])
        if not steps or not isinstance(steps, list) or len(steps) == 0:
            errors.append({'field': 'steps', 'type': 'MISSING_STEPS', 'message': 'At least one step is required'})

        seen_actions = set()
        duplicate_steps = []
        for i, step in enumerate(steps):
            step_errors = self._validate_step(step, i)
            errors.extend(step_errors)

            action_key = f"{step.get('action')}:{step.get('selector', '')}:{step.get('value', '')}"
            if action_key in seen_actions:
                duplicate_steps.append(i + 1)
            seen_actions.add(action_key)

        if duplicate_steps:
            warnings.append({
                'field': 'steps',
                'type': 'DUPLICATE_STEPS',
                'message': f'Duplicate steps found at positions: {duplicate_steps}',
            })

        return {
            'is_valid': len(errors) == 0,
            'test_name': name,
            'total_steps': len(steps),
            'errors': errors,
            'warnings': warnings,
            'validated_at': datetime.utcnow().isoformat(),
        }

    def _validate_step(self, step: Dict, index: int) -> List[Dict]:
        errors = []
        action = step.get('action', '').lower()
        selector = step.get('selector', '')
        value = step.get('value', '')
        url = step.get('url', '')
        expected = step.get('expected', '')

        if not action:
            errors.append({'field': f'steps[{index}].action', 'type': 'MISSING_ACTION', 'message': f'Step {index + 1}: Action is required'})
        elif action not in self.VALID_ACTIONS:
            errors.append({'field': f'steps[{index}].action', 'type': 'INVALID_ACTION', 'message': f'Step {index + 1}: Unknown action "{action}". Valid: {", ".join(sorted(self.VALID_ACTIONS))}'})
        elif action not in self.SUPPORTED_ACTIONS:
            errors.append({'field': f'steps[{index}].action', 'type': 'UNSUPPORTED_ACTION', 'message': f'Step {index + 1}: Action "{action}" is not supported yet'})

        if action in {'click', 'fill', 'type', 'select', 'hover', 'verify', 'assert'}:
            if not selector:
                errors.append({'field': f'steps[{index}].selector', 'type': 'MISSING_LOCATOR', 'message': f'Step {index + 1}: Selector is required for action "{action}"'})
            elif not self._is_valid_locator(selector):
                errors.append({'field': f'steps[{index}].selector', 'type': 'INVALID_LOCATOR', 'message': f'Step {index + 1}: Selector "{selector}" does not match any known locator pattern'})

        if action in {'fill', 'type'}:
            if value is None or value == '':
                errors.append({'field': f'steps[{index}].value', 'type': 'MISSING_VALUE', 'message': f'Step {index + 1}: Value is required for action "{action}"'})

        if action == 'navigate':
            if not url:
                errors.append({'field': f'steps[{index}].url', 'type': 'MISSING_URL', 'message': f'Step {index + 1}: URL is required for navigate action'})

        if action in {'verify', 'assert'}:
            if not expected:
                errors.append({'field': f'steps[{index}].expected', 'type': 'MISSING_EXPECTED_RESULT', 'message': f'Step {index + 1}: Expected result is required for assertion'})

        return errors

    def _is_valid_locator(self, selector: str) -> bool:
        import re
        for pattern in self.LOCATOR_PATTERNS:
            if re.match(pattern, selector):
                return True
        return False

    async def validate_batch(self, test_cases: List[Dict]) -> Dict:
        results = []
        all_valid = True
        for tc in test_cases:
            result = await self.validate_test_case(tc)
            results.append(result)
            if not result['is_valid']:
                all_valid = False

        return {
            'is_valid': all_valid,
            'total': len(test_cases),
            'valid_count': sum(1 for r in results if r['is_valid']),
            'invalid_count': sum(1 for r in results if not r['is_valid']),
            'results': results,
            'validated_at': datetime.utcnow().isoformat(),
        }
