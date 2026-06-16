import logging
import hashlib
import json
import re
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from langchain.text_splitter import CharacterTextSplitter
    from langchain.schema import Document
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("LangChain not available")

try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
        SPACY_AVAILABLE = True
    except:
        SPACY_AVAILABLE = False
        nlp = None
except ImportError:
    SPACY_AVAILABLE = False
    nlp = None


class NLPParser:
    """NLP parsing for test scenarios and requirements"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 3600
        self.action_verbs = {
            'click': ['click', 'tap', 'press', 'select'],
            'fill': ['fill', 'enter', 'type', 'input', 'write'],
            'select': ['select', 'choose', 'pick', 'option'],
            'verify': ['verify', 'check', 'ensure', 'confirm', 'assert'],
            'navigate': ['navigate', 'go', 'open', 'visit', 'browse'],
            'upload': ['upload', 'attach', 'add file'],
            'download': ['download', 'export', 'save'],
            'wait': ['wait', 'pause', 'sleep', 'expect'],
        }

    async def parse_scenario(self, text: str, context: Optional[Dict] = None) -> Dict:
        """Parse natural language test scenario"""
        
        sentences = self._split_sentences(text)
        
        steps = []
        for sentence in sentences:
            step = await self._parse_step(sentence, context)
            if step:
                steps.append(step)
        
        entities = self._extract_entities(text)
        
        parsed = {
            'original_text': text,
            'steps': steps,
            'entities': entities,
            'action_count': len(steps),
            'confidence': self._calculate_confidence(steps, entities),
        }
        
        if self.redis:
            cache_key = f"nlp:{hashlib.md5(text.encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(parsed))
        
        return parsed

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        
        sentences = re.split(r'[.!?]\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    async def _parse_step(self, sentence: str, context: Optional[Dict]) -> Optional[Dict]:
        """Parse individual test step"""
        
        sentence_lower = sentence.lower()
        
        action = self._identify_action(sentence_lower)
        
        if not action:
            return None
        
        element = self._extract_element(sentence)
        
        value = self._extract_value(sentence, action)
        
        expected = self._extract_expected(sentence)
        
        return {
            'action': action,
            'element': element,
            'value': value,
            'expected': expected,
            'original': sentence,
            'order': 0,
        }

    def _identify_action(self, text: str) -> Optional[str]:
        """Identify action from text"""
        
        for action, synonyms in self.action_verbs.items():
            for synonym in synonyms:
                if synonym in text:
                    return action
        
        return 'verify'

    def _extract_element(self, sentence: str) -> Dict:
        """Extract element to interact with"""
        
        patterns = [
            r'(?:the |a |an )?([a-z\s]+?) (?:button|link|field|input|dropdown|checkbox|radio|modal|dialog)',
            r'(?:on )?(?:the )?([a-z\s]+?) (?:page|screen)',
            r'(?:to|for|in) ([a-z\s]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, sentence.lower())
            if match:
                return {
                    'description': match.group(1).strip(),
                    'type': self._infer_element_type(sentence),
                }
        
        return {'description': 'element', 'type': 'unknown'}

    def _infer_element_type(self, sentence: str) -> str:
        """Infer element type from sentence"""
        sentence_lower = sentence.lower()
        
        if any(w in sentence_lower for w in ['button', 'click', 'press']):
            return 'button'
        if any(w in sentence_lower for w in ['input', 'type', 'fill', 'enter']):
            return 'input'
        if any(w in sentence_lower for w in ['select', 'dropdown', 'choose']):
            return 'dropdown'
        if any(w in sentence_lower for w in ['check', 'checkbox']):
            return 'checkbox'
        if any(w in sentence_lower for w in ['link', 'navigate', 'go to']):
            return 'link'
        
        return 'generic'

    def _extract_value(self, sentence: str, action: str) -> Optional[str]:
        """Extract value to input or select"""
        
        if action in ['fill', 'select']:
            match = re.search(r'["\']([^"\']+)["\']', sentence)
            if match:
                return match.group(1)
            
            match = re.search(r'(?:with|as|from|to) (?:value )?([^,\.]+)', sentence)
            if match:
                return match.group(1).strip()
        
        return None

    def _extract_expected(self, sentence: str) -> Optional[str]:
        """Extract expected result"""
        
        patterns = [
            r'should (?:be |have )?(.+)',
            r'expect (?:to |that )?(.+)',
            r'verify (?:that )?(.+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, sentence.lower())
            if match:
                return match.group(1).strip()
        
        return None

    def _extract_entities(self, text: str) -> Dict:
        """Extract entities using NLP"""
        
        entities = {
            'urls': re.findall(r'https?://[^\s]+', text),
            'emails': re.findall(r'\b[\w.-]+@[\w.-]+\.\w+\b', text),
            'numbers': re.findall(r'\d+', text),
            'dates': re.findall(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', text),
        }
        
        if SPACY_AVAILABLE and nlp:
            doc = nlp(text)
            entities['people'] = [ent.text for ent in doc.ents if ent.label_ == 'PERSON']
            entities['organizations'] = [ent.text for ent in doc.ents if ent.label_ == 'ORG']
            entities['locations'] = [ent.text for ent in doc.ents if ent.label_ == 'GPE']
        
        return entities

    def _calculate_confidence(self, steps: List[Dict], entities: Dict) -> float:
        """Calculate parsing confidence"""
        
        if not steps:
            return 0.0
        
        confidence = 0.5
        
        if len(steps) > 0:
            confidence += 0.2
        
        if entities.get('urls') or entities.get('emails'):
            confidence += 0.1
        
        for step in steps:
            if step.get('element', {}).get('type') != 'unknown':
                confidence += 0.05
        
        return min(0.95, confidence)

    async def parse_requirement(self, requirement: str) -> Dict:
        """Parse requirement into testable criteria"""
        
        parsed = await self.parse_scenario(requirement)
        
        criteria = []
        
        if parsed['steps']:
            for i, step in enumerate(parsed['steps']):
                if step['action'] == 'verify':
                    criteria.append({
                        'type': 'assertion',
                        'description': step.get('expected', step['original']),
                        'priority': 'high',
                    })
                else:
                    criteria.append({
                        'type': 'action',
                        'action': step['action'],
                        'element': step['element'],
                        'value': step['value'],
                        'priority': 'medium',
                    })
        
        return {
            'requirement': requirement,
            'criteria': criteria,
            'step_count': len(parsed['steps']),
            'entities': parsed['entities'],
        }

    async def generate_test_data(self, scenario: str, schema: Dict) -> Dict:
        """Generate test data from scenario"""
        
        entities = (await self.parse_scenario(scenario))['entities']
        
        test_data = {}
        
        if 'email' in schema or 'user' in schema.get('type', '').lower():
            test_data['email'] = entities['emails'][0] if entities['emails'] else 'test@example.com'
        
        if 'name' in schema or 'user' in schema.get('type', '').lower():
            test_data['name'] = 'Test User'
        
        if 'amount' in schema or 'number' in schema.get('type', '').lower():
            test_data['amount'] = int(entities['numbers'][0]) if entities['numbers'] else 100
        
        for field, field_schema in schema.get('fields', {}).get('properties', {}).items():
            if field not in test_data:
                test_data[field] = self._generate_field_value(field, field_schema)
        
        return test_data

    def _generate_field_value(self, field: str, schema: Dict) -> Any:
        """Generate value based on field schema"""
        
        field_type = schema.get('type', 'string')
        
        if field_type == 'integer':
            return 0
        elif field_type == 'number':
            return 0.0
        elif field_type == 'boolean':
            return False
        elif field_type == 'array':
            return []
        elif field_type == 'object':
            return {}
        else:
            return f"test_{field}"