from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import redis.asyncio as redis
from typing import Optional

from src.api import health, analysis, predictions, ai_features
from src.services.self_healing import SelfHealingService
from src.services.locator_engine import LocatorEngine
from src.services.ocr_processor import OCRProcessor
from src.services.failure_analyzer import FailureAnalyzer
from src.services.smart_assertions import SmartAssertions
from src.services.nlp_parser import NLPParser
from src.services.test_generator import TestGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    logger.info("AI Engine starting up...")
    
    try:
        redis_client = await redis.from_url(
            "redis://localhost:6379/0",
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        redis_client = None

    app.state.redis = redis_client
    app.state.services = {
        'self_healing': SelfHealingService(redis_client),
        'locator_engine': LocatorEngine(redis_client),
        'ocr_processor': OCRProcessor(redis_client),
        'failure_analyzer': FailureAnalyzer(redis_client),
        'smart_assertions': SmartAssertions(redis_client),
        'nlp_parser': NLPParser(redis_client),
        'test_generator': TestGenerator(redis_client),
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(ai_features.router, prefix="/api/ai", tags=["AI Features"])


@app.get("/")
async def root():
    return {"message": "QA AI Engine API", "version": "2.0.0", "features": [
        "self-healing", "locator-engine", "ocr-processing", 
        "failure-analysis", "smart-assertions", "nlp-parsing", "test-generation"
    ]}