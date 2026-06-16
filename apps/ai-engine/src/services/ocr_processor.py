import io
import logging
import hashlib
import json
import base64
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("Tesseract not available. Install pytesseract and tesseract-ocr")


class OCRProcessor:
    """OCR processing for screenshots and images"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 3600

    async def extract_text(self, image_data: str, language: str = 'eng') -> Dict:
        """Extract text from image using OCR"""
        
        if not TESSERACT_AVAILABLE:
            return {
                'text': 'OCR not available - install pytesseract',
                'language': language,
                'success': False,
                'confidence': 0,
            }
        
        try:
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            text = pytesseract.image_to_string(image, lang=language)
            data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)
            
            words = []
            for i, word in enumerate(data['text']):
                if word.strip():
                    words.append({
                        'text': word,
                        'conf': data['conf'][i],
                        'left': data['left'][i],
                        'top': data['top'][i],
                        'width': data['width'][i],
                        'height': data['height'][i],
                    })
            
            result = {
                'text': text.strip(),
                'words': words,
                'language': language,
                'success': True,
                'confidence': sum(w['conf'] for w in words) / len(words) if words else 0,
                'word_count': len(words),
            }
            
            if self.redis:
                cache_key = f"ocr:{hashlib.md5(image_data[:1000].encode()).hexdigest()}"
                await self.redis.setex(cache_key, self.cache_ttl, json.dumps(result))
            
            return result
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return {
                'text': '',
                'error': str(e),
                'success': False,
                'confidence': 0,
            }

    async def extract_elements(self, image_data: str) -> Dict:
        """Extract UI elements from screenshot"""
        
        if not TESSERACT_AVAILABLE:
            return {'elements': [], 'success': False}
        
        try:
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            elements = []
            current_line = []
            current_top = None
            
            for i, text in enumerate(data['text']):
                if not text.strip():
                    continue
                
                if current_top is None:
                    current_top = data['top'][i]
                elif abs(data['top'][i] - current_top) > 10:
                    if current_line:
                        elements.append({
                            'type': 'text_group',
                            'text': ' '.join(current_line),
                            'bbox': self._calculate_bbox(current_line, data, i),
                        })
                    current_line = []
                    current_top = data['top'][i]
                
                current_line.append({
                    'text': text,
                    'left': data['left'][i],
                    'top': data['top'][i],
                    'width': data['width'][i],
                })
            
            if current_line:
                elements.append({
                    'type': 'text_group',
                    'text': ' '.join([t['text'] for t in current_line]),
                    'bbox': self._calculate_bbox(current_line, data, len(data['text'])),
                })
            
            return {'elements': elements, 'success': True, 'count': len(elements)}
            
        except Exception as e:
            logger.error(f"Element extraction failed: {e}")
            return {'elements': [], 'success': False, 'error': str(e)}

    def _calculate_bbox(self, line_items: List, data: Dict, end_idx: int) -> Dict:
        """Calculate bounding box for text group"""
        lefts = [item['left'] for item in line_items]
        tops = [item.get('top', 0) for item in line_items]
        widths = [item.get('width', 0) for item in line_items]
        
        return {
            'left': min(lefts),
            'top': min(tops),
            'width': max(lefts) + max(widths) - min(lefts),
            'height': 20,
        }

    async def compare_screenshots(self, image1: str, image2: str) -> Dict:
        """Compare two screenshots for visual differences"""
        
        try:
            img1_bytes = base64.b64decode(image1)
            img2_bytes = base64.b64decode(image2)
            
            img1 = Image.open(io.BytesIO(img1_bytes)).convert('RGB')
            img2 = Image.open(io.BytesIO(img2_bytes)).convert('RGB')
            
            if img1.size != img2.size:
                img2 = img2.resize(img1.size)
            
            import numpy as np
            arr1 = np.array(img1)
            arr2 = np.array(img2)
            
            diff = np.abs(arr1.astype(float) - arr2.astype(float))
            diff_percentage = np.mean(diff) / 255 * 100
            
            diff_mask = np.any(diff > 30, axis=2)
            changed_pixels = np.sum(diff_mask)
            total_pixels = diff_mask.size
            
            return {
                'similarity': 100 - diff_percentage,
                'changed_pixels': int(changed_pixels),
                'total_pixels': int(total_pixels),
                'changed_percentage': round(changed_pixels / total_pixels * 100, 2),
                'match': changed_pixels < total_pixels * 0.01,
            }
            
        except ImportError:
            return {'similarity': 0, 'error': 'numpy not available', 'match': False}
        except Exception as e:
            logger.error(f"Screenshot comparison failed: {e}")
            return {'similarity': 0, 'error': str(e), 'match': False}

    async def detect_text_changes(self, before: str, after: str) -> Dict:
        """Detect text changes between two screenshots"""
        
        text_before = await self.extract_text(before)
        text_after = await self.extract_text(after)
        
        if not text_before['success'] or not text_after['success']:
            return {'changes': [], 'success': False}
        
        words_before = set(text_before['text'].lower().split())
        words_after = set(text_after['text'].lower().split())
        
        added = words_after - words_before
        removed = words_before - words_after
        
        return {
            'changes': {
                'added': list(added),
                'removed': list(removed),
            },
            'change_count': len(added) + len(removed),
            'success': True,
        }