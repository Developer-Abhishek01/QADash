from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()


class PipelineNLERequest(BaseModel):
    text: str
    context: Optional[Dict] = None


class PipelineExcelRequest(BaseModel):
    rows: List[Dict]


class PipelineRequirementsRequest(BaseModel):
    requirements: List[Dict]
    options: Optional[Dict] = None


class ValidateTestCaseRequest(BaseModel):
    test_case: Dict


class ValidateBatchRequest(BaseModel):
    test_cases: List[Dict]


class GenerateCodeRequest(BaseModel):
    scenario: Dict
    framework: Optional[str] = 'playwright'


@router.post("/pipeline/nlp-to-test")
async def nlp_to_test(req: PipelineNLERequest, request: Request):
    service = request.app.state.services.get('ai_pipeline')
    if not service:
        raise HTTPException(status_code=503, detail="Pipeline service not available")
    return await service.process_natural_language(req.text, req.context)


@router.post("/pipeline/excel-to-tests")
async def excel_to_tests(req: PipelineExcelRequest, request: Request):
    service = request.app.state.services.get('ai_pipeline')
    if not service:
        raise HTTPException(status_code=503, detail="Pipeline service not available")
    return await service.process_test_suite_from_excel(req.rows)


@router.post("/pipeline/requirements-to-tests")
async def requirements_to_tests(req: PipelineRequirementsRequest, request: Request):
    service = request.app.state.services.get('ai_pipeline')
    if not service:
        raise HTTPException(status_code=503, detail="Pipeline service not available")
    return await service.generate_from_requirements(req.requirements, req.options)


@router.post("/validate/test-case")
async def validate_test_case(req: ValidateTestCaseRequest, request: Request):
    service = request.app.state.services.get('test_validator')
    if not service:
        raise HTTPException(status_code=503, detail="Validator service not available")
    return await service.validate_test_case(req.test_case)


@router.post("/validate/batch")
async def validate_batch(req: ValidateBatchRequest, request: Request):
    service = request.app.state.services.get('test_validator')
    if not service:
        raise HTTPException(status_code=503, detail="Validator service not available")
    return await service.validate_batch(req.test_cases)


@router.post("/generate-code")
async def generate_code(req: GenerateCodeRequest, request: Request):
    service = request.app.state.services.get('test_generator')
    if not service:
        raise HTTPException(status_code=503, detail="Test generator not available")
    return await service.generate_test(req.scenario, req.framework or 'playwright')


@router.post("/analyze-test")
async def analyze_test(payload: Dict, request: Request):
    llm = request.app.state.llm_service
    if not llm or not llm.is_available:
        raise HTTPException(status_code=503, detail="LLM service not available")
    result = await llm._call_llm(
        "You are a test code analyzer. Analyze the test code and return JSON with: suggestions (array), complexity (string), coverage (number 0-100), recommendedPatterns (array).",
        f"Test code:\n{payload.get('test_code', payload.get('code', ''))}"
    )
    if result:
        import json
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    return {"suggestions": [], "complexity": "unknown", "coverage": 0, "recommendedPatterns": []}


@router.post("/generate-tests")
async def generate_tests(payload: Dict, request: Request):
    generator = request.app.state.services.get('test_generator')
    if not generator:
        raise HTTPException(status_code=503, detail="Test generator not available")
    scenario = {
        'name': payload.get('description', 'Generated Test'),
        'module': payload.get('module', 'General'),
        'description': payload.get('description', ''),
        'preconditions': payload.get('preconditions', ''),
        'url': payload.get('url', ''),
        'steps': payload.get('steps', [
            {'action': 'navigate', 'value': payload.get('url', '')},
            {'action': 'verify', 'element': 'page', 'expected': 'Page loaded'},
        ]),
        'test_data': payload.get('test_data', {}),
        'expected_result': payload.get('expected_result', ''),
    }
    count = payload.get('count', 5)
    result = await generator.generate_test(scenario, payload.get('framework', 'playwright'))
    test_cases = [{
        'id': f"TC-{i+1:03d}",
        'name': f"{result.get('test_name', 'Test')} - {i+1}",
        'description': payload.get('description', ''),
        'code': result.get('code', ''),
        'confidence': result.get('confidence', 0),
    } for i in range(count)]
    return {'testCases': test_cases, 'testCasesCount': len(test_cases)}


@router.post("/analyze-execution")
async def analyze_execution(payload: Dict, request: Request):
    llm = request.app.state.llm_service
    if not llm or not llm.is_available:
        raise HTTPException(status_code=503, detail="LLM service not available")
    result = await llm._call_llm(
        "You are an execution analyzer. Analyze test execution results. Return JSON with: insights (array), recommendations (array), trends (object with passRate (number), trend (string)).",
        f"Execution data:\n{payload}"
    )
    if result:
        import json
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    return {"insights": [], "recommendations": [], "trends": {"passRate": 0, "trend": "stable"}}


@router.post("/suggest-fixes")
async def suggest_fixes(payload: Dict, request: Request):
    llm = request.app.state.llm_service
    if not llm or not llm.is_available:
        raise HTTPException(status_code=503, detail="LLM service not available")
    result = await llm._call_llm(
        "You are a bug fix expert. Suggest fixes for the error. Return JSON with: possibleCauses (array), suggestedFixes (array of {action, confidence}).",
        f"Error:\n{payload.get('errorStack', payload.get('error', ''))}"
    )
    if result:
        import json
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    return {"possibleCauses": [], "suggestedFixes": []}


@router.get("/insights/{project_id}")
async def get_insights(project_id: str, request: Request):
    llm = request.app.state.llm_service
    if not llm or not llm.is_available:
        return {"recommendations": [], "health": 100, "testCoverage": 0}
    result = await llm._call_llm(
        "Generate insights and recommendations for this project. Return JSON with: recommendations (array).",
        f"Project ID: {project_id}"
    )
    if result:
        import json
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass
    return {"recommendations": []}
