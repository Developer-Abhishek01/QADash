import logging
import hashlib
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger(__name__)


class FailureAnalyzer:
    """AI-powered failure analysis and root cause detection"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 3600
        self.error_patterns = {
            'timeout': {'category': 'performance', 'severity': 'medium', 'solutions': ['increase_timeout', 'check_network', 'optimize_query']},
            'not_found': {'category': 'element', 'severity': 'high', 'solutions': ['verify_locator', 'check_navigation', 'check_dynamic_ids']},
            'stale': {'category': 'state', 'severity': 'medium', 'solutions': ['refresh_reference', 'use_retry', 'check_rendering']},
            'assertion': {'category': 'test', 'severity': 'high', 'solutions': ['verify_expected', 'check_data', 'update_assertion']},
            'permission': {'category': 'auth', 'severity': 'critical', 'solutions': ['check_login', 'verify_role', 'check_token']},
            'network': {'category': 'infrastructure', 'severity': 'high', 'solutions': ['check_connection', 'verify_api', 'retry_request']},
        }

    async def analyze_failure(self, failure: Dict) -> Dict:
        """Analyze failure and identify root cause"""
        
        error_type = self._classify_error(failure.get('error', ''))
        error_message = failure.get('message', '')
        
        pattern = self._match_pattern(error_message, error_type)
        
        root_cause = self._identify_root_cause(failure, pattern)
        
        suggested_fix = self._generate_fix(failure, root_cause)
        
        analysis = {
            'error_type': error_type,
            'pattern': pattern,
            'root_cause': root_cause,
            'suggested_fix': suggested_fix,
            'confidence': self._calculate_confidence(pattern, root_cause),
            'timestamp': datetime.utcnow().isoformat(),
        }
        
        if self.redis:
            cache_key = f"failure_analysis:{hashlib.md5(json.dumps(failure, sort_keys=True).encode()).hexdigest()}"
            await self.redis.setex(cache_key, self.cache_ttl, json.dumps(analysis))
        
        return analysis

    def _classify_error(self, error: str) -> str:
        """Classify error type"""
        error_lower = error.lower()
        
        for pattern_key in self.error_patterns.keys():
            if pattern_key in error_lower:
                return pattern_key
        
        if 'timeout' in error_lower:
            return 'timeout'
        elif 'not found' in error_lower or 'cannot find' in error_lower:
            return 'not_found'
        elif 'stale' in error_lower:
            return 'stale'
        elif 'assert' in error_lower:
            return 'assertion'
        elif 'permission' in error_lower or 'unauthorized' in error_lower:
            return 'permission'
        
        return 'unknown'

    def _match_pattern(self, message: str, error_type: str) -> Dict:
        """Match error against known patterns"""
        
        pattern = self.error_patterns.get(error_type, {
            'category': 'unknown',
            'severity': 'medium',
            'solutions': ['investigate_manually'],
        })
        
        return {
            'type': error_type,
            'category': pattern['category'],
            'severity': pattern['severity'],
            'solutions': pattern['solutions'],
            'matched_message': message[:200],
        }

    def _identify_root_cause(self, failure: Dict, pattern: Dict) -> str:
        """Identify root cause based on context"""
        
        context = failure.get('context', {})
        stack_trace = failure.get('stack_trace', '')
        
        causes = []
        
        if pattern['category'] == 'element':
            if 'dynamic' in stack_trace.lower():
                causes.append('Dynamic element ID changes on each load')
            elif 'iframe' in stack_trace.lower():
                causes.append('Element inside iframe not accessible')
            elif 'shadow' in stack_trace.lower():
                causes.append('Element inside shadow DOM')
        
        elif pattern['category'] == 'performance':
            if 'database' in stack_trace.lower():
                causes.append('Database query taking too long')
            elif 'api' in stack_trace.lower():
                causes.append('API response time exceeds threshold')
        
        elif pattern['category'] == 'state':
            if 'react' in stack_trace.lower() or 'vue' in stack_trace.lower():
                causes.append('Component re-rendered after DOM update')
            elif 'SPA' in context.get('app_type', ''):
                causes.append('Single Page App navigation not complete')
        
        return causes[0] if causes else f"Root cause: {pattern['category']} issue in {pattern['type']}"

    def _generate_fix(self, failure: Dict, root_cause: str) -> Dict:
        """Generate suggested fix"""
        
        error_type = self._classify_error(failure.get('error', ''))
        
        fixes = {
            'timeout': {
                'code_change': 'Increase timeout or optimize query',
                'test_modification': 'Add explicit wait or retry',
                'infrastructure': 'Check network latency',
            },
            'not_found': {
                'code_change': 'Use stable locator (data-testid)',
                'test_modification': 'Wait for element to appear',
                'infrastructure': 'Verify page loaded correctly',
            },
            'stale': {
                'code_change': 'Re-query element before interaction',
                'test_modification': 'Add retry logic',
                'infrastructure': 'Check for page re-renders',
            },
        }
        
        return fixes.get(error_type, {
            'code_change': 'Review and fix based on error message',
            'test_modification': 'Add appropriate wait or assertion',
            'infrastructure': 'Check system state',
        })

    def _calculate_confidence(self, pattern: Dict, root_cause: str) -> float:
        """Calculate confidence score for analysis"""
        
        confidence = 0.5
        
        if pattern['category'] != 'unknown':
            confidence += 0.3
        
        if root_cause and 'Root cause:' not in root_cause:
            confidence += 0.2
        
        return round(confidence, 2)

    async def get_failure_trends(self, project_id: str) -> Dict:
        """Get failure trends analysis"""
        
        if not self.redis:
            return {'trends': [], 'total_failures': 0}
        
        pattern_key = f"failure_trends:{project_id}"
        data = await self.redis.get(pattern_key)
        
        if data:
            return json.loads(data)
        
        return {
            'trends': [],
            'total_failures': 0,
            'generated_at': datetime.utcnow().isoformat(),
        }

    async def correlate_failures(self, failures: List[Dict]) -> Dict:
        """Correlate multiple failures to find common patterns"""
        
        correlation = {
            'common_errors': defaultdict(int),
            'common_locations': defaultdict(int),
            'likely_root_causes': [],
            'recommended_actions': [],
        }
        
        for failure in failures:
            error = failure.get('error', '')
            correlation['common_errors'][error] += 1
            
            location = failure.get('location', 'unknown')
            correlation['common_locations'][location] += 1
        
        top_errors = sorted(correlation['common_errors'].items(), key=lambda x: x[1], reverse=True)[:3]
        
        if top_errors:
            correlation['likely_root_causes'] = [
                {'error': err, 'count': count, 'likely_cause': self._identify_root_cause({'error': err}, {'category': 'correlated'})}
                for err, count in top_errors
            ]
            
            correlation['recommended_actions'] = [
                f"Fix {err} in {loc} first (affects {count} tests)"
                for (err, _), (loc, count) in zip(top_errors, sorted(correlation['common_locations'].items(), key=lambda x: x[1], reverse=True)[:3])
            ]
        
        return correlation