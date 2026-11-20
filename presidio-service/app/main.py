"""
FastAPI application for Presidio + GLiNER PII Masking Service.
Exposes endpoints to analyze and anonymize text with low latency.
"""
import time
import logging
import hashlib
from typing import List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

from app.config import (
    GLINER_MODEL_NAME,
    DEVICE,
    SUPPORTED_ENTITIES,
)
from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    EntityResult,
    AnonymizeRequest,
    AnonymizeResponse,
    AnonymizeItem,
    HealthResponse,
)
from app.gliner_recognizer import GLiNERRecognizer

# Configure safe logging (DO NOT log sensitive text)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("presidio-service")

# Global engine singletons
analyzer: AnalyzerEngine = None
anonymizer: AnonymizerEngine = None
gliner_recognizer: GLiNERRecognizer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global analyzer, anonymizer, gliner_recognizer
    logger.info("Initializing Microsoft Presidio Analyzer & Anonymizer...")
    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()

    try:
        logger.info(f"Loading GLiNER recognizer ({GLINER_MODEL_NAME})...")
        gliner_recognizer = GLiNERRecognizer()
        analyzer.registry.add_recognizer(gliner_recognizer)
        logger.info("GLiNER recognizer registered successfully with Presidio.")
    except Exception as e:
        logger.warning(f"Could not initialize GLiNER recognizer: {e}. Presidio default pattern recognizers will be used.")

    yield
    logger.info("Presidio service shutting down.")


app = FastAPI(
    title="Clipboard Masker Presidio + GLiNER Service",
    description="Local PII analysis and anonymization service for Clipboard Masker",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Electron origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=HealthResponse)
def healthz():
    """Health check endpoint for Docker & Electron app."""
    is_gliner_loaded = gliner_recognizer.is_loaded() if gliner_recognizer else False
    return HealthResponse(
        status="healthy" if analyzer else "initializing",
        gliner_loaded=is_gliner_loaded,
        model_name=GLINER_MODEL_NAME,
        device=DEVICE,
        supported_entities=SUPPORTED_ENTITIES,
    )


@app.get("/entities")
def get_supported_entities():
    """Return all supported PII entity types."""
    return {"entities": SUPPORTED_ENTITIES}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_text(request: AnalyzeRequest):
    """
    Detects PII entities within input text using Presidio and GLiNER.
    """
    if not analyzer:
        raise HTTPException(status_code=503, detail="Analyzer not initialized")

    start_time = time.perf_counter()

    results: List[RecognizerResult] = analyzer.analyze(
        text=request.text,
        entities=request.entities,
        language=request.language,
        score_threshold=request.score_threshold or 0.35,
    )

    entities_output: List[EntityResult] = []
    for res in results:
        sub_text = request.text[res.start : res.end]
        entities_output.append(
            EntityResult(
                entity_type=res.entity_type,
                start=res.start,
                end=res.end,
                score=round(float(res.score), 3),
                text=sub_text,
            )
        )

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(f"Analyzed {len(request.text)} chars in {latency_ms}ms, detected {len(entities_output)} entities")

    return AnalyzeResponse(
        entities=entities_output,
        language=request.language,
        latency_ms=latency_ms,
    )


def _build_operators(strategy: str) -> Dict[str, OperatorConfig]:
    """Generates Presidio operator configuration for anonymization."""
    if strategy == "redact":
        return {"DEFAULT": OperatorConfig("replace", {"new_value": "[REDACTED]"})}
    elif strategy == "asterisk":
        return {"DEFAULT": OperatorConfig("mask", {"type": "mask", "masking_char": "*", "chars_to_mask": 20, "from_end": True})}
    elif strategy == "hash":
        return {"DEFAULT": OperatorConfig("hash", {"hash_type": "sha256"})}
    else:
        # Default strategy: 'tag' e.g. <EMAIL_ADDRESS>
        operators = {}
        for entity in SUPPORTED_ENTITIES:
            operators[entity] = OperatorConfig("replace", {"new_value": f"<{entity}>"})
        operators["DEFAULT"] = OperatorConfig("replace", {"new_value": "<PII>"})
        return operators


@app.post("/anonymize", response_model=AnonymizeResponse)
def anonymize_text(request: AnonymizeRequest):
    """
    Anonymizes sensitive text using configured strategy (tag, redact, asterisk, hash).
    """
    if not analyzer or not anonymizer:
        raise HTTPException(status_code=503, detail="Engines not initialized")

    start_time = time.perf_counter()

    # Step 1: Analyze if entities were not supplied
    if request.entities is None:
        raw_results = analyzer.analyze(
            text=request.text,
            language="en",
            score_threshold=0.35,
        )
    else:
        raw_results = [
            RecognizerResult(
                entity_type=item.entity_type,
                start=item.start,
                end=item.end,
                score=item.score,
            )
            for item in request.entities
        ]

    # Step 2: Build operators and anonymize
    operators = _build_operators(request.strategy)
    anonymized_result = anonymizer.anonymize(
        text=request.text,
        analyzer_results=raw_results,
        operators=operators,
    )

    items = [
        AnonymizeItem(
            start=item.start,
            end=item.end,
            entity_type=item.entity_type,
            text=item.text,
            operator=item.operator,
        )
        for item in anonymized_result.items
    ]

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(f"Anonymized {len(request.text)} chars in {latency_ms}ms with strategy '{request.strategy}'")

    return AnonymizeResponse(
        text=anonymized_result.text,
        items=items,
        latency_ms=latency_ms,
    )
