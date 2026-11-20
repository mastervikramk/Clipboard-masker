# Multi-stage lightweight Dockerfile for Presidio + GLiNER Service
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8125 \
    DEVICE=cpu \
    HF_HOME=/models_cache

WORKDIR /app

# Install system dependencies needed for compiling certain NLP/torch extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU-only first for fast download and lean footprint
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy and install python dependencies
COPY presidio-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Download Presidio's small spacy pipeline if needed by fallback analyzers
RUN python -m spacy download en_core_web_sm || true

# Copy service source code
COPY presidio-service/app /app/app

# Create cache directory for HuggingFace GLiNER models
RUN mkdir -p /models_cache && chmod -R 777 /models_cache

# Expose port
EXPOSE 8125

# Healthcheck configuration
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8125/healthz || exit 1

# Start FastAPI server via Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8125"]
