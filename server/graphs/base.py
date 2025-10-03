"""
Base classes and utilities for LangGraph nodes
"""
import os
import json
from typing import TypedDict, Dict, Any
from typing_extensions import Annotated
from langgraph.graph.message import add_messages
from openai import OpenAI


class GraphState(TypedDict):
    """Base state for all graphs"""
    messages: Annotated[list, add_messages]
    nft_info: dict  # Store NFT information during creation flow
    current_step: str  # Track current step in NFT creation
    wallet_address: str  # User's wallet address
    current_balance: str  # Current wallet balance


def build_openai_client() -> OpenAI:
    """Build OpenAI client with OpenRouter configuration"""
    from dotenv import load_dotenv
    from pathlib import Path
    
    load_dotenv(Path(__file__).parent.parent / '.env')
    api_key = os.getenv("OPEN_ROUTER_TOKEN")
    if not api_key:
        raise RuntimeError("OPEN_ROUTER_TOKEN chưa được cấu hình trong server/.env")
    base_url = os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    return OpenAI(api_key=api_key, base_url=base_url)


def get_openai_config():
    """Get OpenAI configuration"""
    return {
        "model": os.getenv("OPENAI_MODEL", "x-ai/grok-4-fast:free"),
        "referer": os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "title": os.getenv("X_TITLE", "Sui Chat Wallet")
    }


def extract_user_text(message) -> str:
    """Extract user text from various message formats"""
    if isinstance(message, dict):
        user_text = message.get("content", str(message))
    else:
        user_text = str(message)
    
    # Extract actual text content from LangGraph messages
    if hasattr(message, 'content'):
        user_text = message.content
    elif isinstance(message, dict):
        user_text = message.get("content", str(message))
    else:
        user_text = str(message)
    
    return user_text
