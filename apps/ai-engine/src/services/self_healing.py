import asyncio
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)


class SelfHealingService:
    """Self-healing automation service for test failures"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 3600
        self.healing_strategies = [
            'retry_with_screenshot',
            'locator_alternatives',
            'wait_strategy_adjustment',
            'frame_switch',
            'scroll_into_view',
            'js_execution',
            'screenshot_comparison',
        ]

    async def analyze_failure(self, error: Dict) -> Dict:
        """Analyze failure and determine healing strategy"""
        error_type = error.get('type', 'unknown')
        message = error.get('message', '')
        locator = error.get('locator', '')
        
        healing_plan = {
            'error_type': error_type,
            'strategy': self._determine_strategy(error_type, message),
            'alternatives': await self._find_alternatives(locator),
            'timestamp': datetime.utcnow().isoformat(),
        }
        
        if self.redis:
            cache_key = f"healing:{hashlib.md5(json.dumps(error).encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(healing_plan))
        
        return healing_plan

    def _determine_strategy(self, error_type: str, message: str) -> str:
        """Determine best healing strategy"""
        strategies = {
            'element_not_found': 'locator_alternatives',
            'timeout': 'wait_strategy_adjustment',
            'stale_element': 'retry_with_screenshot',
            'iframe_error': 'frame_switch',
            'not_visible': 'scroll_into_view',
            'javascript_error': 'js_execution',
            'visual_diff': 'screenshot_comparison',
        }
        
        for key, strategy in strategies.items():
            if key in message.lower() or key in error_type.lower():
                return strategy
        return 'retry_with_screenshot'

    async def _find_alternatives(self, locator: str) -> List[Dict]:
        """Generate alternative locators"""
        if not locator:
            return []
        
        alternatives = []
        
        if 'id=' in locator:
            base_id = locator.split('id=')[1].split(']')[0]
            alternatives.extend([
                {'type': 'xpath', 'value': f"//*[@data-testid='{base_id}']"},
                {'type': 'xpath', 'value': f"//*[contains(@class, '{base_id}')]"},
                {'type': 'css', 'value': f"[data-testid='{base_id}']"},
            ])
        
        if 'text=' in locator:
            text = locator.split('text=')[1].split(']')[0]
            alternatives.extend([
                {'type': 'xpath', 'value': f"//*[contains(text(), '{text}')]"},
                {'type': 'xpath', 'value': f"//button[contains(text(), '{text}')]"},
                {'type': 'xpath', 'value': f"//a[contains(text(), '{text}')]"},
            ])
        
        return alternatives[:3]

    async def heal_element(self, context: Dict) -> Dict:
        """Apply healing strategy to fix element interaction"""
        strategy = context.get('strategy', 'retry_with_screenshot')
        original_locator = context.get('locator', '')
        
        healing_result = {
            'success': False,
            'healed_locator': None,
            'strategy_used': strategy,
            'attempts': 0,
        }
        
        for attempt in range(3):
            healing_result['attempts'] = attempt + 1
            
            if strategy == 'locator_alternatives':
                alternatives = await self._find_alternatives(original_locator)
                if alternatives:
                    healing_result['healed_locator'] = alternatives[0]
                    healing_result['success'] = True
                    break
            
            elif strategy == 'wait_strategy_adjustment':
                healing_result['healed_locator'] = original_locator
                healing_result['success'] = True
                healing_result['wait_increase'] = 'increased_wait_5x'
                break
            
            await asyncio.sleep(0.5 * (attempt + 1))
        
        logger.info(f"Self-healing result: {healing_result}")
        return healing_result

    async def learn_from_failure(self, failure_data: Dict) -> Dict:
        """Learn from failures to improve future healing"""
        cache_key = f"failure_patterns:{failure_data.get('pattern', 'unknown')}"
        
        if self.redis:
            existing = await self.redis.get(cache_key)
            patterns = json.loads(existing) if existing else []
            patterns.append({
                'timestamp': datetime.utcnow().isoformat(),
                'fix_applied': failure_data.get('fix'),
                'success': failure_data.get('success', False),
            })
            await self.redis.setex(cache_key, 86400 * 30, json.dumps(patterns[-100:]))
        
        return {'learned': True, 'pattern': failure_data.get('pattern')}

    async def get_failure_patterns(self) -> Dict:
        """Get learned failure patterns"""
        if not self.redis:
            return {'patterns': []}
        
        keys = await self.redis.keys("failure_patterns:*")
        patterns = []
        
        for key in keys[:10]:
            data = await self.redis.get(key)
            if data:
                patterns.append(json.loads(data))
        
        return {'patterns': patterns, 'count': len(patterns)}