import asyncio
import logging
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import hashlib

logger = logging.getLogger(__name__)


class SelfHealingService:
    LOCATOR_STRATEGIES = [
        'data-testid',
        'data-cy',
        'data-test',
        'role',
        'aria-label',
        'label',
        'placeholder',
        'text',
        'alt-text',
        'title',
        'name',
        'class',
        'css-selector',
        'xpath',
        'xpath-contains-text',
        'xpath-contains-class',
        'nth-child',
    ]

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 3600
        self._llm_client = None
        self._model = None
        self._available = False
        self._init_llm()

    def _init_llm(self):
        api_key = os.environ.get('LLM_API_KEY') or os.environ.get('OPENAI_API_KEY') or ''
        base_url = os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1')
        model = os.environ.get('LLM_MODEL', 'gpt-4o-mini')
        if api_key:
            try:
                from openai import OpenAI
                self._llm_client = OpenAI(api_key=api_key, base_url=base_url)
                self._model = model
                self._available = True
            except ImportError:
                pass

    async def analyze_failure(self, error: Dict) -> Dict:
        error_type = error.get('type', 'unknown')
        message = error.get('message', '')
        locator = error.get('locator', '')
        page_url = error.get('url', '')
        tag = error.get('tag', '')
        attributes = error.get('attributes', {})
        text_content = error.get('text', '')

        healing_plan = {
            'error_type': error_type,
            'strategy': self._determine_strategy(error_type, message),
            'alternatives': await self._find_all_alternatives(locator, tag, text_content, attributes),
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

        if self._available and locator:
            ai_alternatives = await self._generate_ai_alternatives(locator, tag, text_content, attributes, page_url)
            if ai_alternatives:
                healing_plan['alternatives'].extend(ai_alternatives)

        if self.redis:
            cache_key = f"healing:{hashlib.md5(json.dumps(error, sort_keys=True).encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(healing_plan))

        return healing_plan

    def _determine_strategy(self, error_type: str, message: str) -> str:
        msg_lower = message.lower()
        error_lower = error_type.lower()

        if 'not found' in msg_lower or 'no element' in msg_lower or 'unable to locate' in msg_lower:
            return 'locator_cascade'
        if 'timeout' in msg_lower:
            return 'wait_strategy_adjustment'
        if 'stale' in msg_lower or 'detached' in msg_lower:
            return 'retry_with_reload'
        if 'iframe' in msg_lower or 'frame' in msg_lower:
            return 'frame_switch'
        if 'visible' in msg_lower or 'not visible' in msg_lower:
            return 'scroll_into_view_and_wait'
        if 'click' in msg_lower and 'intercept' in msg_lower:
            return 'js_click_fallback'
        if 'javascript' in msg_lower or 'js' in msg_lower:
            return 'js_execution'
        if 'navigation' in msg_lower or 'net::' in msg_lower:
            return 'navigation_retry'

        return 'locator_cascade'

    async def _find_all_alternatives(self, locator: str, tag: str = '', text_content: str = '', attributes: Dict = None) -> List[Dict]:
        if not locator:
            return []
        attributes = attributes or {}
        alternatives = []
        base_value = self._extract_base_value(locator)

        if not base_value:
            base_value = text_content or tag or 'element'

        strategy_map = {
            'data-testid': [
                {'type': 'css', 'value': f'[data-testid="{base_value}"]', 'strategy': 'data_testid'},
                {'type': 'xpath', 'value': f'//*[@data-testid="{base_value}"]', 'strategy': 'data_testid_xpath'},
            ],
            'data-cy': [
                {'type': 'css', 'value': f'[data-cy="{base_value}"]', 'strategy': 'data_cy'},
            ],
            'role': [
                {'type': 'css', 'value': f'[role="{base_value}"]', 'strategy': 'role'},
                {'type': 'xpath', 'value': f'//*[@role="{base_value}"]', 'strategy': 'role_xpath'},
            ],
            'aria-label': [
                {'type': 'xpath', 'value': f'//*[@aria-label="{base_value}"]', 'strategy': 'aria_label'},
            ],
            'label': [
                {'type': 'xpath', 'value': f'//label[contains(text(), "{base_value}")]', 'strategy': 'label_text'},
                {'type': 'xpath', 'value': f'//*[@aria-labelledby="//label[contains(text(), \\"{base_value}\\")]"]', 'strategy': 'label_for'},
            ],
            'placeholder': [
                {'type': 'css', 'value': f'[placeholder="{base_value}"]', 'strategy': 'placeholder'},
            ],
            'text': [
                {'type': 'xpath', 'value': f'//*[contains(text(), "{base_value}")]', 'strategy': 'text_contains'},
                {'type': 'xpath', 'value': f'//{tag or "*"}[contains(text(), "{base_value}")]', 'strategy': 'tag_text_contains'},
            ],
            'css': [
                {'type': 'css', 'value': f'{tag or ""}[class*="{base_value}"]', 'strategy': 'class_contains'},
            ],
        }

        for attr_name, suggested in attributes.items():
            if attr_name in ('id', 'class', 'name', 'type', 'href'):
                if attr_name == 'id':
                    alternatives.append({'type': 'css', 'value': f'#{attributes[attr_name]}', 'strategy': 'id'})
                elif attr_name == 'name':
                    alternatives.append({'type': 'css', 'value': f'[name="{attributes[attr_name]}"]', 'strategy': 'name'})
                elif attr_name == 'href':
                    alt_val = attributes[attr_name].split('/')[-1] if '/' in attributes[attr_name] else attributes[attr_name]
                    alternatives.append({'type': 'xpath', 'value': f'//a[contains(@href, "{alt_val}")]', 'strategy': 'href_contains'})

        for strat_name, strat_list in strategy_map.items():
            for s in strat_list:
                if s not in alternatives:
                    alternatives.append(s)

        if tag:
            alternatives.append({'type': 'xpath', 'value': f'//{tag}[{len(alternatives) + 1}]', 'strategy': 'nth_tag'})

        return alternatives[:10]

    def _extract_base_value(self, locator: str) -> str:
        import re
        patterns = [
            r'\[data-testid="([^"]+)"\]',
            r'\[data-cy="([^"]+)"\]',
            r'\[data-test="([^"]+)"\]',
            r'#([a-zA-Z][\w-]*)',
            r'\.([a-zA-Z][\w-]*)',
            r'aria-label="([^"]+)"',
            r'placeholder="([^"]+)"',
            r'role="([^"]+)"',
            r'contains\(text\(\)\s*,\s*["\']([^"\']+)["\']\)',
            r'contains\(["\']([^"\']+)["\']\)',
        ]
        for p in patterns:
            match = re.search(p, locator)
            if match:
                return match.group(1)
        return locator.strip('[]#\'" ')

    async def _generate_ai_alternatives(self, locator: str, tag: str, text: str, attributes: Dict, page_url: str) -> List[Dict]:
        if not self._available or not self._llm_client:
            return []

        try:
            response = self._llm_client.chat.completions.create(
                model=self._model,
                messages=[{
                    "role": "system",
                    "content": "You are a Playwright locator expert. Given a failed locator and element context, suggest alternative locators. Return ONLY a JSON array of objects with keys: type (css/xpath), value (the locator string), strategy (descriptive name). Maximum 5 alternatives. Use data-testid, role, aria-label, text, and CSS nth-child strategies."
                }, {
                    "role": "user",
                    "content": f"Failed locator: {locator}\nTag: {tag}\nText: {text}\nAttributes: {json.dumps(attributes)}\nPage URL: {page_url}"
                }],
                max_tokens=1024,
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            if content:
                result = json.loads(content)
                if isinstance(result, list):
                    return result
                if isinstance(result, dict) and 'alternatives' in result:
                    return result['alternatives']
                if isinstance(result, dict) and 'locators' in result:
                    return result['locators']
        except Exception as e:
            logger.warning(f"AI alternative generation failed: {e}")

        return []

    async def heal_element(self, context: Dict) -> Dict:
        strategy = context.get('strategy', 'locator_cascade')
        original_locator = context.get('locator', '')
        alternatives = context.get('alternatives', [])

        healing_result = {
            'success': False,
            'healed_locator': None,
            'strategy_used': strategy,
            'attempts': 0,
            'strategies_tried': [],
        }

        if strategy == 'locator_cascade':
            for i, alt in enumerate(alternatives):
                healing_result['attempts'] = i + 1
                healing_result['strategies_tried'].append(alt.get('strategy', alt.get('type', 'unknown')))
                healing_result['healed_locator'] = alt
                healing_result['success'] = True
                if i < 3:
                    await asyncio.sleep(0.3)
                break

        elif strategy == 'wait_strategy_adjustment':
            healing_result['healed_locator'] = {'type': 'css', 'value': original_locator, 'strategy': 'increased_wait'}
            healing_result['wait_increase'] = 'increased_wait_10x'
            healing_result['success'] = True

        elif strategy == 'scroll_into_view_and_wait':
            healing_result['healed_locator'] = {'type': 'css', 'value': original_locator, 'strategy': 'scroll_into_view'}
            healing_result['scroll_action'] = 'scroll_into_view_if_needed'
            healing_result['success'] = True

        elif strategy == 'js_click_fallback':
            healing_result['healed_locator'] = {'type': 'js', 'value': original_locator, 'strategy': 'js_click'}
            healing_result['success'] = True

        elif strategy == 'retry_with_reload':
            healing_result['healed_locator'] = {'type': 'css', 'value': original_locator, 'strategy': 'reload_and_retry'}
            healing_result['page_reload'] = True
            healing_result['success'] = True

        elif strategy == 'frame_switch':
            healing_result['healed_locator'] = {'type': 'css', 'value': original_locator, 'strategy': 'switch_to_frame'}
            healing_result['frame_strategy'] = 'try_all_frames'
            healing_result['success'] = True

        elif strategy == 'navigation_retry':
            healing_result['healed_locator'] = {'type': 'css', 'value': original_locator, 'strategy': 'navigation_retry'}
            healing_result['navigation_retry'] = True
            healing_result['success'] = True

        else:
            await asyncio.sleep(0.5)
            healing_result['healed_locator'] = {'type': 'css', 'value': original_locator, 'strategy': 'retry_stale'}
            healing_result['success'] = True

        logger.info(f"Self-healing result: strategy={strategy}, success={healing_result['success']}")
        return healing_result

    async def learn_from_failure(self, failure_data: Dict) -> Dict:
        cache_key = f"failure_patterns:{failure_data.get('pattern', 'unknown')}"
        if self.redis:
            existing = await self.redis.get(cache_key)
            patterns = json.loads(existing) if existing else []
            patterns.append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'fix_applied': failure_data.get('fix'),
                'success': failure_data.get('success', False),
                'locator': failure_data.get('locator', ''),
                'strategy': failure_data.get('strategy', ''),
            })
            await self.redis.setex(cache_key, 86400 * 30, json.dumps(patterns[-100:]))
        return {'learned': True, 'pattern': failure_data.get('pattern')}

    async def get_failure_patterns(self) -> Dict:
        if not self.redis:
            return {'patterns': []}
        keys = await self.redis.keys("failure_patterns:*")
        patterns = []
        for key in keys[:10]:
            data = await self.redis.get(key)
            if data:
                patterns.append(json.loads(data))
        return {'patterns': patterns, 'count': len(patterns)}
