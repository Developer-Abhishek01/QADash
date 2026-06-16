from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()


class SelfHealingRequest(BaseModel):
    error: Dict
    context: Optional[Dict] = None


class LocatorRequest(BaseModel):
    description: str
    context: Optional[Dict] = None


class OCRRequest(BaseModel):
    image_data: str
    language: Optional[str] = 'eng'


class FailureAnalysisRequest(BaseModel):
    failure: Dict
    context: Optional[Dict] = None


class AssertionRequest(BaseModel):
    expected: Any
    actual: Any
    type: Optional[str] = 'exact'


class NLPParserRequest(BaseModel):
    text: str
    context: Optional[Dict] = None


class TestGenerationRequest(BaseModel):
    scenario: Dict
    framework: Optional[str] = 'playwright'


@router.post("/self-healing/analyze")
async def analyze_failure(req: SelfHealingRequest, request: Request):
    service = request.app.state.services.get('self_healing')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.analyze_failure(req.error)


@router.post("/self-healing/heal")
async def heal_element(req: SelfHealingRequest, request: Request):
    service = request.app.state.services.get('self_healing')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    healing_plan = await service.analyze_failure(req.error)
    return await service.heal_element({**healing_plan, 'locator': req.context.get('locator', '') if req.context else ''})


@router.get("/self-healing/patterns")
async def get_failure_patterns(request: Request):
    service = request.app.state.services.get('self_healing')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.get_failure_patterns()


@router.post("/locator/find")
async def find_element(req: LocatorRequest, request: Request):
    service = request.app.state.services.get('locator_engine')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.find_element(req.description, req.context or {})


@router.post("/locator/test")
async def test_locator(locator: Dict, page_snapshot: Dict, request: Request):
    service = request.app.state.services.get('locator_engine')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.test_locator(locator, page_snapshot)


@router.post("/locator/learn")
async def learn_from_interaction(interaction: Dict, request: Request):
    service = request.app.state.services.get('locator_engine')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.learn_from_interaction(interaction)


@router.post("/ocr/extract-text")
async def extract_text(req: OCRRequest, request: Request):
    service = request.app.state.services.get('ocr_processor')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.extract_text(req.image_data, req.language or 'eng')


@router.post("/ocr/extract-elements")
async def extract_elements(req: OCRRequest, request: Request):
    service = request.app.state.services.get('ocr_processor')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.extract_elements(req.image_data)


@router.post("/ocr/compare")
async def compare_screenshots(before: str, after: str, request: Request):
    service = request.app.state.services.get('ocr_processor')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.compare_screenshots(before, after)


@router.post("/failure/analyze")
async def analyze_failure(req: FailureAnalysisRequest, request: Request):
    service = request.app.state.services.get('failure_analyzer')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.analyze_failure(req.failure)


@router.post("/failure/correlate")
async def correlate_failures(failures: List[Dict], request: Request):
    service = request.app.state.services.get('failure_analyzer')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.correlate_failures(failures)


@router.get("/failure/trends/{project_id}")
async def get_failure_trends(project_id: str, request: Request):
    service = request.app.state.services.get('failure_analyzer')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.get_failure_trends(project_id)


@router.post("/assertions/create")
async def create_assertion(req: AssertionRequest, request: Request):
    service = request.app.state.services.get('smart_assertions')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.create_assertion({'expected': req.expected, 'actual': req.actual, 'type': req.type})


@router.post("/assertions/element-state")
async def assert_element_state(element: Dict, expected_state: Dict, request: Request):
    service = request.app.state.services.get('smart_assertions')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.assert_element_state(element, expected_state)


@router.post("/assertions/suggest")
async def suggest_assertion(element_data: Dict, request: Request):
    service = request.app.state.services.get('smart_assertions')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.suggest_assertion(element_data)


@router.post("/nlp/parse")
async def parse_scenario(req: NLPParserRequest, request: Request):
    service = request.app.state.services.get('nlp_parser')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.parse_scenario(req.text, req.context)


@router.post("/nlp/requirement")
async def parse_requirement(requirement: str, request: Request):
    service = request.app.state.services.get('nlp_parser')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.parse_requirement(requirement)


@router.post("/nlp/test-data")
async def generate_test_data(scenario: str, schema: Dict, request: Request):
    service = request.app.state.services.get('nlp_parser')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.generate_test_data(scenario, schema)


@router.post("/test-generator/generate")
async def generate_test(req: TestGenerationRequest, request: Request):
    service = request.app.state.services.get('test_generator')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.generate_test(req.scenario, req.framework or 'playwright')


@router.post("/test-generator/suite")
async def generate_test_suite(requirements: List[str], options: Dict, request: Request):
    service = request.app.state.services.get('test_generator')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.generate_test_suite(requirements, options)


@router.post("/test-generator/coverage")
async def suggest_test_coverage(feature: str, existing_tests: List[str], request: Request):
    service = request.app.state.services.get('test_generator')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.suggest_test_coverage(feature, existing_tests)


@router.post("/test-generator/optimize")
async def optimize_test(test_code: str, request: Request):
    service = request.app.state.services.get('test_generator')
    if not service:
        raise HTTPException(status_code=503, detail="Service not available")
    return await service.optimize_test(test_code)