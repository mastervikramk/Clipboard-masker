#!/usr/bin/env python3
"""
GLiNER2-PII Local Inference Worker for Clipboard Masker.
Communicates with Electron Main process via stdio JSON-RPC.
Provides zero-refusal, span-level Named Entity Recognition for personal, corporate, and regional data.
"""

import sys
import os
import json
import traceback

def get_model_path():
    # If passed as command line argument
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    
    # Check default bundled path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    bundled_path = os.path.join(script_dir, "..", "models", "gliner2-pii")
    if os.path.exists(bundled_path) and os.path.exists(os.path.join(bundled_path, "model.safetensors")):
        return bundled_path
        
    # Check local Hugging Face cache
    cache_path = os.path.expanduser(r"~/.cache/huggingface/hub/models--fastino--gliner2-privacy-filter-PII-multi/snapshots/1cb4166094dc58fa8d836429f060d6c95f62b495")
    if os.path.exists(cache_path):
        return cache_path
        
    return "fastino/gliner2-privacy-filter-PII-multi"

try:
    from gliner2 import GLiNER2
    
    model_source = get_model_path()
    model = GLiNER2.from_pretrained(model_source)
    
    DEFAULT_LABELS = [
        "person", "full_name", "date_of_birth", "email", "phone_number",
        "address", "street_address", "city", "state_or_region", "postal_code",
        "national_id_number", "passport_number", "drivers_license_number",
        "government_id", "tax_id", "tax_number", "bank_account", "account_number",
        "card_number", "card_expiry", "card_cvv", "username", "ip_address",
        "password", "secret", "api_key", "organization"
    ]
    
    # Send ready signal to Node.js
    sys.stdout.write(json.dumps({"status": "ready", "model": "gliner2-pii"}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id", 0)
            text = req.get("text", "")
            labels = req.get("labels", DEFAULT_LABELS)
            threshold = req.get("threshold", 0.4)
            
            if not text:
                sys.stdout.write(json.dumps({"id": req_id, "entities": []}) + "\n")
                sys.stdout.flush()
                continue
            
            result = model.extract_entities(
                text,
                labels,
                threshold=threshold,
                include_confidence=True,
                include_spans=True
            )
            
            entities = []
            if isinstance(result, dict) and "entities" in result:
                for label, items in result["entities"].items():
                    for item in items:
                        entities.append({
                            "type": label.upper(),
                            "text": item.get("text", ""),
                            "start": item.get("start", 0),
                            "end": item.get("end", 0),
                            "score": item.get("confidence", 0.9)
                        })
            
            resp = {"id": req_id, "entities": entities}
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
            
        except Exception as err:
            sys.stdout.write(json.dumps({"id": req_id if 'req_id' in locals() else 0, "error": str(err), "entities": []}) + "\n")
            sys.stdout.flush()

except Exception as init_err:
    sys.stdout.write(json.dumps({"status": "error", "error": str(init_err), "traceback": traceback.format_exc()}) + "\n")
    sys.stdout.flush()
    sys.exit(1)
