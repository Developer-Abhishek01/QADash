import logging
import hashlib
import json
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class LocatorEngine:
    """AI-powered locator engine for element discovery"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 7200
        self.locator_priority = [
            'data-testid',
            'data-cy',
            'data-test',
            'id',
            'aria-label',
            'role',
            'text',
            'xpath',
            'css',
        ]

    async def find_element(self, description: str, context: Dict) -> Dict:
        """Find element using AI-generated locators"""
        
        locators = self._generate_locators(description)
        
        ranked = self._rank_locators(locators, context)
        
        if self.redis:
            cache_key = f"locator:{hashlib.md5(description.encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(ranked))
        
        return {
            'description': description,
            'locators': ranked,
            'recommended': ranked[0] if ranked else None,
            'confidence': self._calculate_confidence(ranked[0]) if ranked else 0,
        }

    def _generate_locators(self, description: str) -> List[Dict]:
        """Generate multiple locator strategies"""
        words = description.lower().split()
        locators = []
        
        locators.append({
            'type': 'xpath',
            'value': f"//*[contains(text(), '{description}')]",
            'strategy': 'text_contains',
            'priority': 7,
        })
        
        for word in words[:2]:
            if len(word) > 3:
                locators.append({
                    'type': 'xpath',
                    'value': f"//*[contains(@*, '{word}')]",
                    'strategy': 'attribute_contains',
                    'priority': 5,
                })
        
        locators.extend([
            {'type': 'css', 'value': f'[data-testid="{description.lower().replace(" ", "-")}"]', 'strategy': 'data_testid', 'priority': 10},
            {'type': 'css', 'value': f'[data-cy="{description.lower().replace(" ", "-")}"]', 'strategy': 'data_cy', 'priority': 9},
            {'type': 'css', 'value': f'#{description.lower().replace(" ", "-")}', 'strategy': 'id', 'priority': 8},
            {'type': 'xpath', 'value': f"//button[contains(text(), '{description}')]", 'strategy': 'button_text', 'priority': 8},
            {'type': 'xpath', 'value': f"//a[contains(text(), '{description}')]", 'strategy': 'link_text', 'priority': 7},
            {'type': 'xpath', 'value': f"//*[contains(@aria-label, '{description}')]", 'strategy': 'aria_label', 'priority': 9},
            {'type': 'xpath', 'value': f"//*[@role='button' and contains(@*, '{description}')]", 'strategy': 'role_button', 'priority': 6},
        ])
        
        return locators

    def _rank_locators(self, locators: List[Dict], context: Dict) -> List[Dict]:
        """Rank locators by predicted success rate"""
        
        existing_attrs = context.get('existing_attrs', [])
        
        for locator in locators:
            score = locator['priority']
            
            if locator['value'] in existing_attrs:
                score += 5
            
            if locator['strategy'] in ['data_testid', 'data_cy', 'id', 'aria_label']:
                score += 3
            
            locator['score'] = score
        
        return sorted(locators, key=lambda x: x['score'], reverse=True)

    def _calculate_confidence(self, locator: Dict) -> float:
        """Calculate confidence score for locator"""
        base_confidence = locator.get('score', 0) / 20
        
        high_priority_strategies = ['data_testid', 'data_cy', 'id', 'aria_label']
        if locator.get('strategy') in high_priority_strategies:
            base_confidence = min(0.95, base_confidence + 0.15)
        
        return round(base_confidence, 2)

    async def test_locator(self, locator: Dict, page_snapshot: Dict) -> Dict:
        """Test locator against page snapshot"""
        
        element_found = self._simulate_locator_test(locator, page_snapshot)
        
        return {
            'locator': locator,
            'found': element_found,
            'elements_matched': 1 if element_found else 0,
            'suggestion': self._generate_suggestion(locator, element_found),
        }

    def _simulate_locator_test(self, locator: Dict, page_snapshot: Dict) -> bool:
        """Simulate locator testing (in production, would use actual browser)"""
        return len(locator.get('value', '')) > 5

    def _generate_suggestion(self, locator: Dict, found: bool) -> str:
        """Generate improvement suggestion"""
        if found:
            return "Locator is effective. Consider adding data-testid for stability."
        
        strategies = {
            'text_contains': "Try more specific text or use exact match",
            'attribute_contains': "Check if attribute exists in DOM",
            'data_testid': "Add data-testid attribute to element",
            'aria_label': "Add aria-label for accessibility",
        }
        
        return strategies.get(locator.get('strategy', ''), 'Try alternative locator strategy')

    async def learn_from_interaction(self, interaction: Dict) -> Dict:
        """Learn from successful/failed interactions"""
        if not self.redis:
            return {'learned': False}
        
        cache_key = f"locator_learned:{interaction.get('element', 'unknown')}"
        
        existing = await self.redis.get(cache_key)
        learnings = json.loads(existing) if existing else []
        
        learnings.append({
            'timestamp': interaction.get('timestamp'),
            'locator_used': interaction.get('locator'),
            'success': interaction.get('success'),
            'page_url': interaction.get('url'),
        })
        
        await self.redis.setex(cache_key, 86400 * 30, json.dumps(learnings[-100:]))
        
        return {'learned': True, 'interactions_stored': len(learnings)}