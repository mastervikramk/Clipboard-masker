"""
Pydantic schemas for API request and response data models.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EntityResult(BaseModel):
    entity_type: str = Field(..., description="Presidio or GLiNER entity type (e.g. PERSON, EMAIL_ADDRESS)")
    start: int = Field(..., description="Start character offset")
    end: int = Field(..., description="End character offset")
    score: float = Field(..., description="Confidence score between 0.0 and 1.0")
    text: Optional[str] = Field(None, description="Extracted sensitive substring")


class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="The clipboard text to analyze for PII")
    entities: Optional[List[str]] = Field(None, description="Subset of entities to detect (None for all)")
    language: str = Field("en", description="Text language code (default 'en')")
    score_threshold: Optional[float] = Field(None, description="Minimum confidence threshold (overrides default)")


class AnalyzeResponse(BaseModel):
    entities: List[EntityResult]
    language: str
    latency_ms: float


class MaskingOperator(BaseModel):
    type: str = Field("replace", description="Masking operator: 'replace', 'redact', 'mask', or 'hash'")
    new_value: Optional[str] = Field(None, description="Replacement value if type='replace'")
    masking_char: Optional[str] = Field("*", description="Character to mask with if type='mask'")
    chars_to_mask: Optional[int] = Field(None, description="Number of characters to mask")
    from_end: Optional[bool] = Field(False, description="Whether to mask from end")


class AnonymizeRequest(BaseModel):
    text: str = Field(..., description="Original raw text")
    entities: Optional[List[EntityResult]] = Field(None, description="Pre-analyzed entities, or None to auto-analyze")
    strategy: str = Field("tag", description="Masking strategy: 'tag', 'redact', 'asterisk', or 'hash'")
    custom_operators: Optional[Dict[str, MaskingOperator]] = Field(None, description="Per-entity custom operator overrides")


class AnonymizeItem(BaseModel):
    start: int
    end: int
    entity_type: str
    text: Optional[str] = None
    operator: str


class AnonymizeResponse(BaseModel):
    text: str = Field(..., description="The masked/sanitized output text")
    items: List[AnonymizeItem] = Field(default_factory=list, description="List of masked entity spans")
    latency_ms: float


class HealthResponse(BaseModel):
    status: str
    gliner_loaded: bool
    model_name: str
    device: str
    supported_entities: List[str]
