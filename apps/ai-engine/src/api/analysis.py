from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class AnalysisRequest(BaseModel):
    test_results: list[dict]
    test_name: str


class AnalysisResponse(BaseModel):
    success: bool
    analysis: dict
    recommendations: list[str]


@router.post("", response_model=AnalysisResponse)
async def analyze_test_results(request: AnalysisRequest):
    try:
        failed_tests = [t for t in request.test_results if t.get('status') == 'failed']
        passed_tests = [t for t in request.test_results if t.get('status') == 'passed']

        analysis = {
            'total': len(request.test_results),
            'passed': len(passed_tests),
            'failed': len(failed_tests),
            'pass_rate': len(passed_tests) / len(request.test_results) * 100 if request.test_results else 0,
        }

        recommendations = []
        if len(failed_tests) > 0:
            recommendations.append("Review failed test cases for root cause analysis")
        if analysis['pass_rate'] < 80:
            recommendations.append("Consider adding more test coverage")

        return AnalysisResponse(success=True, analysis=analysis, recommendations=recommendations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))