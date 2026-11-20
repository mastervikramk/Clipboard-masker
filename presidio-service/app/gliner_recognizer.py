"""
Custom Microsoft Presidio EntityRecognizer powered by GLiNER.
Enables fast, zero-shot and open-vocabulary NER entity recognition.
"""
import logging
from typing import List, Optional
from presidio_analyzer import EntityRecognizer, RecognizerResult

try:
    from gliner import GLiNER
except ImportError:
    GLiNER = None

from app.config import GLINER_MODEL_NAME, GLINER_THRESHOLD, DEVICE, SUPPORTED_ENTITIES, GLINER_LABEL_MAP

logger = logging.getLogger("presidio-gliner")


class GLiNERRecognizer(EntityRecognizer):
    """
    Custom Presidio EntityRecognizer that uses GLiNER for named entity recognition.
    """

    def __init__(
        self,
        model_name: str = GLINER_MODEL_NAME,
        threshold: float = GLINER_THRESHOLD,
        device: str = DEVICE,
        supported_entities: Optional[List[str]] = None,
    ):
        super().__init__(
            supported_entities=supported_entities or SUPPORTED_ENTITIES,
            name="GLiNERRecognizer",
            supported_language="en",
        )
        self.model_name = model_name
        self.threshold = threshold
        self.device = device
        self.model = None
        self._load_model()

    def _load_model(self):
        """Loads GLiNER model into memory if available."""
        if GLiNER is None:
            logger.warning("GLiNER package not found. Model will not be active.")
            return

        try:
            logger.info(f"Loading GLiNER model '{self.model_name}' on device '{self.device}'...")
            self.model = GLiNER.from_pretrained(self.model_name)
            if self.device != "cpu" and hasattr(self.model, "to"):
                self.model.to(self.device)
            logger.info("GLiNER model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load GLiNER model '{self.model_name}': {e}")
            self.model = None

    def is_loaded(self) -> bool:
        return self.model is not None

    def analyze(self, text: str, entities: List[str], nlp_artifacts=None) -> List[RecognizerResult]:
        """
        Analyzes the text using GLiNER and returns a list of Presidio RecognizerResults.
        """
        if not self.model or not text:
            return []

        # Map requested Presidio entities back to GLiNER labels
        labels_to_query = []
        for gliner_label, presidio_entity in GLINER_LABEL_MAP.items():
            if not entities or presidio_entity in entities:
                if gliner_label not in labels_to_query:
                    labels_to_query.append(gliner_label)

        if not labels_to_query:
            return []

        try:
            predictions = self.model.predict_entities(
                text,
                labels=labels_to_query,
                threshold=self.threshold,
            )
        except Exception as e:
            logger.error(f"GLiNER prediction failed: {e}")
            return []

        results = []
        for pred in predictions:
            raw_label = pred.get("label", "").lower()
            entity_type = GLINER_LABEL_MAP.get(raw_label, raw_label.upper())

            # Filter if caller requested specific entities
            if entities and entity_type not in entities:
                continue

            score = float(pred.get("score", 0.85))
            start = int(pred.get("start", 0))
            end = int(pred.get("end", 0))

            results.append(
                RecognizerResult(
                    entity_type=entity_type,
                    start=start,
                    end=end,
                    score=score,
                )
            )

        return results
