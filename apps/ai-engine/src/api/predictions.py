import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("ai-engine.api.predictions")
router = APIRouter()


class PredictionRequest(BaseModel):
    test_history: list[dict]
    current_metrics: dict


class PredictionResponse(BaseModel):
    success: bool
    predictions: dict
    confidence: float


@router.post("", response_model=PredictionResponse)
async def predict_test_outcomes(request: PredictionRequest):
    try:
        recent_failures = sum(1 for t in request.test_history if t.get('status') == 'failed')
        total_tests = len(request.test_history)

        flaky_risk = recent_failures / total_tests if total_tests > 0 else 0
        predictions = {
            'flaky_test_risk': 'high' if flaky_risk > 0.3 else 'medium' if flaky_risk > 0.1 else 'low',
            'expected_pass_rate': 100 - (flaky_risk * 100),
            'recommended_retries': 2 if flaky_risk > 0.2 else 0,
        }

        logger.info(f"Prediction made: flaky_risk={flaky_risk:.2f}, pass_rate={predictions['expected_pass_rate']:.1f}%")
        return PredictionResponse(success=True, predictions=predictions, confidence=0.85)
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))