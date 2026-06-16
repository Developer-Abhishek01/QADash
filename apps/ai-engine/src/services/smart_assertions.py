import logging
import hashlib
import json
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

logger = logging.getLogger(__name__)


class SmartAssertions:
    """AI-powered smart assertions with auto-healing"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 3600
        self.assertion_types = {
            'exact': {'confidence': 1.0, 'flexibility': 0},
            'contains': {'confidence': 0.9, 'flexibility': 0.1},
            'regex': {'confidence': 0.85, 'flexibility': 0.15},
            'fuzzy': {'confidence': 0.7, 'flexibility': 0.3},
            'visual': {'confidence': 0.6, 'flexibility': 0.4},
        }

    async def create_assertion(self, assertion_data: Dict) -> Dict:
        """Create intelligent assertion with fallback strategies"""
        
        expected = assertion_data.get('expected')
        actual = assertion_data.get('actual')
        assertion_type = assertion_data.get('type', 'exact')
        
        result = await self._evaluate_assertion(expected, actual, assertion_type)
        
        if not result['passed']:
            alternatives = await self._find_alternatives(expected, actual, assertion_type)
            result['alternatives'] = alternatives
            result['suggestion'] = self._suggest_fix(alternatives)
        
        if self.redis:
            cache_key = f"assertion:{hashlib.md5(json.dumps(assertion_data, sort_keys=True).encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(result))
        
        return result

    async def _evaluate_assertion(self, expected: Any, actual: Any, assertion_type: str) -> Dict:
        """Evaluate assertion based on type"""
        
        if assertion_type == 'exact':
            passed = expected == actual
        elif assertion_type == 'contains':
            passed = str(expected) in str(actual) if actual else False
        elif assertion_type == 'regex':
            import re
            try:
                passed = bool(re.search(str(expected), str(actual)))
            except:
                passed = False
        elif assertion_type == 'fuzzy':
            passed = self._fuzzy_match(str(expected), str(actual))
        elif assertion_type == 'visual':
            passed = self._visual_match(expected, actual)
        else:
            passed = expected == actual
        
        return {
            'passed': passed,
            'type': assertion_type,
            'expected': expected,
            'actual': actual,
            'confidence': self.assertion_types.get(assertion_type, {}).get('confidence', 0.5),
        }

    def _fuzzy_match(self, expected: str, actual: str) -> bool:
        """Fuzzy string matching"""
        expected_lower = expected.lower()
        actual_lower = actual.lower()
        
        if expected_lower in actual_lower or actual_lower in expected_lower:
            return True
        
        expected_words = set(expected_lower.split())
        actual_words = set(actual_lower.split())
        
        intersection = expected_words.intersection(actual_words)
        union = expected_words.union(actual_words)
        
        return len(intersection) / len(union) > 0.5 if union else False

    def _visual_match(self, expected: Any, actual: Any) -> bool:
        """Visual comparison for images/screenshots"""
        
        if isinstance(expected, str) and isinstance(actual, str):
            return expected[:100] == actual[:100]
        
        return False

    async def _find_alternatives(self, expected: Any, actual: Any, assertion_type: str) -> List[Dict]:
        """Find alternative assertions that might pass"""
        
        alternatives = []
        
        alternatives.append({
            'type': 'contains',
            'expected': expected,
            'reason': 'Check if expected is substring of actual',
        })
        
        alternatives.append({
            'type': 'regex',
            'expected': f".*{expected}.*",
            'reason': 'Use regex pattern matching',
        })
        
        if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
            alternatives.append({
                'type': 'range',
                'expected': {'min': expected * 0.9, 'max': expected * 1.1},
                'reason': 'Allow 10% numerical variance',
            })
        
        return alternatives

    def _suggest_fix(self, alternatives: List[Dict]) -> str:
        """Suggest fix based on alternatives"""
        
        if not alternatives:
            return "Review expected value manually"
        
        best = alternatives[0]
        return f"Try {best['type']} assertion: {best.get('reason', '')}"

    async def assert_element_state(self, element: Dict, expected_state: Dict) -> Dict:
        """Assert element has expected state"""
        
        results = []
        
        if 'visible' in expected_state:
            visible_result = await self._check_visibility(element, expected_state['visible'])
            results.append(visible_result)
        
        if 'enabled' in expected_state:
            enabled_result = await self._check_enabled(element, expected_state['enabled'])
            results.append(enabled_result)
        
        if 'text' in expected_state:
            text_result = await self.create_assertion({
                'expected': expected_state['text'],
                'actual': element.get('text', ''),
                'type': expected_state.get('text_type', 'contains'),
            })
            results.append(text_result)
        
        if 'attribute' in expected_state:
            attr_result = await self._check_attribute(element, expected_state['attribute'])
            results.append(attr_result)
        
        passed = all(r.get('passed', False) for r in results)
        
        return {
            'passed': passed,
            'results': results,
            'summary': f"{sum(1 for r in results if r.get('passed'))}/{len(results)} checks passed',
        }

    async def _check_visibility(self, element: Dict, expected: bool) -> Dict:
        is_visible = element.get('is_visible', False)
        return {
            'check': 'visibility',
            'expected': expected,
            'actual': is_visible,
            'passed': is_visible == expected,
        }

    async def _check_enabled(self, element: Dict, expected: bool) -> Dict:
        is_enabled = element.get('is_enabled', True)
        return {
            'check': 'enabled',
            'expected': expected,
            'actual': is_enabled,
            'passed': is_enabled == expected,
        }

    async def _check_attribute(self, element: Dict, expected_attrs: Dict) -> Dict:
        actual_attrs = element.get('attributes', {})
        
        passed = all(actual_attrs.get(k) == v for k, v in expected_attrs.items())
        
        return {
            'check': 'attributes',
            'expected': expected_attrs,
            'actual': actual_attrs,
            'passed': passed,
        }

    async def learn_assertion_pattern(self, assertion: Dict, passed: bool) -> Dict:
        """Learn from assertion results to improve future predictions"""
        
        if not self.redis:
            return {'learned': False}
        
        cache_key = f"assertion_patterns:{assertion.get('type', 'unknown')}"
        
        existing = await self.redis.get(cache_key)
        patterns = json.loads(existing) if existing else []
        
        patterns.append({
            'timestamp': datetime.utcnow().isoformat(),
            'passed': passed,
            'expected': assertion.get('expected'),
            'actual': assertion.get('actual'),
        })
        
        await self.redis.setex(cache_key, 86400 * 30, json.dumps(patterns[-100:]))
        
        return {'learned': True, 'pattern_count': len(patterns)}

    async def suggest_assertion(self, element_data: Dict) -> Dict:
        """Suggest best assertion based on element characteristics"""
        
        suggestions = []
        
        if element_data.get('text'):
            suggestions.append({
                'type': 'contains',
                'target': 'text',
                'confidence': 0.9,
                'code': f"assert.contains(page.locator(\"{element_data.get('locator')}\"), \"{element_data['text'][:20]}\")",
            })
        
        if element_data.get('is_visible') is not None:
            suggestions.append({
                'type': 'visibility',
                'target': 'visible',
                'confidence': 0.95,
                'code': f"await expect(page.locator(\"{element_data.get('locator')}\")).toBeVisible()",
            })
        
        for attr, value in element_data.get('attributes', {}).items():
            if attr in ['value', 'href', 'src']:
                suggestions.append({
                    'type': 'attribute',
                    'target': attr,
                    'expected': value,
                    'confidence': 0.85,
                    'code': f"await expect(page.locator(\"{element_data.get('locator')}\")).toHaveAttribute(\"{attr}\", \"{value}\")",
                })
        
        return {
            'suggestions': sorted(suggestions, key=lambda x: x['confidence'], reverse=True),
            'recommended': suggestions[0] if suggestions else None,
        }