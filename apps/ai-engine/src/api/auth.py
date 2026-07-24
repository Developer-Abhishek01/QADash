from fastapi import Header, HTTPException, Request, Depends
from typing import Optional
import os

API_KEY_NAME = "X-API-Key"


def get_api_key(request: Request) -> str:
    api_key = request.headers.get(API_KEY_NAME)
    expected_key = os.getenv("AI_ENGINE_API_KEY", "qadash-ai-dev-key")

    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    if api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return api_key
