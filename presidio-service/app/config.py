"""
Configuration settings for the Presidio + GLiNER Service.
"""
import os

PORT = int(os.getenv("PORT", "8125"))
HOST = os.getenv("HOST", "0.0.0.0")

# GLiNER model settings
GLINER_MODEL_NAME = os.getenv("GLINER_MODEL_NAME", "urchade/gliner_small-v2.1")
GLINER_THRESHOLD = float(os.getenv("GLINER_THRESHOLD", "0.4"))
DEVICE = os.getenv("DEVICE", "cpu")  # "cuda" or "cpu"

# Supported PII entity types
SUPPORTED_ENTITIES = [
    "PERSON",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "CREDIT_CARD",
    "CRYPTO",
    "IP_ADDRESS",
    "LOCATION",
    "ORGANIZATION",
    "US_SSN",
    "API_KEY",
    "PASSWORD",
]

# Mapping between GLiNER labels and Presidio entity types
GLINER_LABEL_MAP = {
    "person": "PERSON",
    "email": "EMAIL_ADDRESS",
    "email address": "EMAIL_ADDRESS",
    "phone number": "PHONE_NUMBER",
    "phone": "PHONE_NUMBER",
    "credit card": "CREDIT_CARD",
    "credit card number": "CREDIT_CARD",
    "crypto wallet": "CRYPTO",
    "cryptocurrency address": "CRYPTO",
    "ip address": "IP_ADDRESS",
    "location": "LOCATION",
    "address": "LOCATION",
    "organization": "ORGANIZATION",
    "company": "ORGANIZATION",
    "social security number": "US_SSN",
    "ssn": "US_SSN",
    "api key": "API_KEY",
    "secret token": "API_KEY",
    "password": "PASSWORD",
}
