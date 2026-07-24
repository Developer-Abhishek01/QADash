from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import logging
import os
import sys
import redis.asyncio as redis
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
load_dotenv()
from src.api import health, analysis, predictions, ai_features, pipeline
from src.api.auth import API_KEY_NAME
from src.services.self_healing import SelfHealingService
from src.services.locator_engine import LocatorEngine
from src.services.ocr_processor import OCRProcessor
from src.services.failure_analyzer import FailureAnalyzer
from src.services.smart_assertions import SmartAssertions
from src.services.nlp_parser import NLPParser
from src.services.test_generator import TestGenerator
from src.services.test_validator import TestValidator
from src.services.ai_pipeline import AIPipeline
from src.services.frd_brd_parser import FRDBRDParser
from src.services.llm_service import LLMService

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": "ai-engine",
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


log_handler = logging.StreamHandler(sys.stdout)
log_handler.setFormatter(JSONFormatter())
logging.basicConfig(level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")), handlers=[log_handler])
logger = logging.getLogger("ai-engine")

redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    logger.info("AI Engine starting up...")
    
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        redis_client = await redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        redis_client = None

    app.state.redis = redis_client
    llm_service = LLMService(redis_client)
    app.state.llm_service = llm_service
    nlp_parser = NLPParser(redis_client)
    test_generator = TestGenerator(redis_client)
    test_validator = TestValidator(redis_client)
    app.state.services = {
        'self_healing': SelfHealingService(redis_client),
        'locator_engine': LocatorEngine(redis_client),
        'ocr_processor': OCRProcessor(redis_client),
        'failure_analyzer': FailureAnalyzer(redis_client),
        'smart_assertions': SmartAssertions(redis_client),
        'nlp_parser': nlp_parser,
        'test_generator': test_generator,
        'test_validator': test_validator,
        'ai_pipeline': AIPipeline(nlp_parser, test_generator, test_validator, llm_service),
        'frd_brd_parser': FRDBRDParser(redis_client, llm_service),
    }
    
    yield
    
    if redis_client:
        await redis_client.close()
    logger.info("AI Engine shutting down...")


app = FastAPI(
    title="QA AI Engine",
    description="AI-powered automation engine with self-healing, OCR, NLP, and test generation",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGIN", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if request.url.path in ("/", "/health", "/health/"):
        return await call_next(request)

    api_key = request.headers.get(API_KEY_NAME)
    expected_key = os.getenv("AI_ENGINE_API_KEY", "qadash-ai-dev-key")

    if not api_key:
        return JSONResponse(status_code=401, content={"detail": "Missing API key"})
    if api_key != expected_key:
        return JSONResponse(status_code=403, content={"detail": "Invalid API key"})

    return await call_next(request)


app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(ai_features.router, prefix="/api/ai", tags=["AI Features"])
app.include_router(pipeline.router, prefix="/api/ai", tags=["AI Pipeline"])


@app.get("/")
async def root():
    return {"message": "QA AI Engine API", "version": "2.0.0", "features": [
        "self-healing", "locator-engine", "ocr-processing", 
        "failure-analysis", "smart-assertions", "nlp-parsing", "test-generation",
        "frd-brd-parsing"
    ]}