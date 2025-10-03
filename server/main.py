import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from typing_extensions import TypedDict, Annotated
from typing import Dict
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages

# Import graph builders
from graphs.transfer import build_transfer_graph
from graphs.nft import build_nft_graph
from graphs.base import GraphState
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import json


app = FastAPI(title="Sui Chat Wallet Backend")

# Session storage for maintaining conversation state
session_storage: Dict[str, dict] = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "*",  # Allow all origins for deployment (you may want to restrict this)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    model: str
    wallet_address: str
    current_balance: str
    mode: str = "transfer"


class ModelInfo(BaseModel):
    id: str
    name: str


class ImageGenerationRequest(BaseModel):
    story_prompt: str = None
    prompt: str = None
    
    def get_prompt(self) -> str:
        return self.story_prompt or self.prompt or ""


def build_client() -> OpenAI:
    load_dotenv(Path(__file__).with_name('.env'))
    api_key = os.getenv("OPEN_ROUTER_TOKEN")
    if not api_key:
        raise RuntimeError("OPEN_ROUTER_TOKEN chưa được cấu hình trong server/.env")
    base_url = os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    return OpenAI(api_key=api_key, base_url=base_url)

def build_huggingface_client():
    """Initialize Hugging Face client for image generation"""
    load_dotenv(Path(__file__).with_name('.env'))
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        raise RuntimeError("HF_TOKEN chưa được cấu hình trong server/.env")
    
    from huggingface_hub import InferenceClient
    client = InferenceClient(
        provider="auto",
        api_key=hf_token,
    )
    return client


def direct_test(client: OpenAI):
    model = "x-ai/grok-4-fast:free"
    completion = client.chat.completions.create(
        extra_headers={
            "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:5173"),
            "X-Title": os.getenv("X_TITLE", "Sui Chat Wallet"),
        },
        extra_body={},
        model=model,
        messages=[{"role": "user", "content": "What is the meaning of life?"}],
        temperature=0.2,
    )
    try:
        print("[Direct]", completion.choices[0].message.content)
    except Exception:
        print("[Direct]", completion if isinstance(completion, str) else str(completion))


@app.get("/api/models")
def get_models():
    models = [
        ModelInfo(id="google/gemini-2.0-flash-exp:free", name="Google Gemini 2.0 Flash"),
        ModelInfo(id="x-ai/grok-4-fast:free", name="xAI Grok 4 Fast"),
    ]
    return {"success": True, "data": models}


@app.post("/api/generate-image")
def generate_image(request: ImageGenerationRequest):
    """Generate image from story prompt using Hugging Face Stable Diffusion 3.5"""
    try:
        client = build_huggingface_client()
        
        # Enhanced prompt for better image generation
        prompt_text = request.get_prompt()
        enhanced_prompt = f"""Create a detailed, high-quality digital artwork based on this story: {prompt_text}
        
        Requirements:
        - High resolution, detailed artwork
        - Professional digital art style
        - Vibrant colors and good composition
        - Suitable for NFT creation
        - No text or watermarks
        """
        
        # Generate image using Hugging Face Stable Diffusion XL with fixed parameters
        image = client.text_to_image(
            enhanced_prompt,
            model="stabilityai/stable-diffusion-xl-base-1.0",
            height=512,
            width=512,
            num_inference_steps=20,
            guidance_scale=7.5
        )
        
        # Convert PIL Image to base64 for transmission
        import io
        from PIL import Image
        
        # Ensure image is in RGB mode
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Image is already 512x512, no need to resize
        # Keep the fixed size to avoid transaction size limit
        
        # Convert to base64 with lower quality to reduce size for blockchain
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=60, optimize=True)
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {
            "success": True,
            "image_url": f"data:image/jpeg;base64,{image_base64}",
            "image_base64": image_base64,
            "prompt": enhanced_prompt
        }
        
    except Exception as e:
        print(f"❌ Image generation error: {str(e)}")
        return {
            "success": False,
            "error": f"Failed to generate image: {str(e)}"
        }


@app.post("/api/upload-image")
def upload_image_to_host(request: dict):
    """Upload base64 image to freeimage.host and return public URL"""
    try:
        import requests
        
        # Get image data from request
        image_base64 = request.get('image_base64', '')
        if not image_base64:
            return {
                "success": False,
                "error": "No image data provided"
            }
        
        # Remove data URL prefix if present
        clean_base64 = image_base64.replace('data:image/jpeg;base64,', '')
        clean_base64 = clean_base64.replace('data:image/png;base64,', '')
        
        # Get API key from environment
        api_key = os.getenv("FREEIMAGE_API_KEY")
        if not api_key:
            return {
                "success": False,
                "error": "FREEIMAGE_API_KEY not configured"
            }
        
        # Prepare form data
        form_data = {
            'key': api_key,
            'action': 'upload',
            'source': clean_base64,
            'format': 'json'
        }
        
        # Upload to freeimage.host
        response = requests.post('https://freeimage.host/api/1/upload', data=form_data)
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}"
            }
        
        data = response.json()
        
        # Check if upload was successful
        if data.get('status_code') != 200:
            error_msg = data.get('error', {}).get('message', 'Upload failed')
            return {
                "success": False,
                "error": error_msg
            }
        
        if not data.get('image', {}).get('url'):
            return {
                "success": False,
                "error": "No image URL returned from response"
            }
        
        image_url = data['image']['url']
        print(f"✅ Image uploaded successfully: {image_url}")
        
        return {
            "success": True,
            "image_url": image_url,
            "display_url": data['image'].get('display_url', image_url)
        }
        
    except Exception as e:
        print(f"❌ Image upload error: {str(e)}")
        return {
            "success": False,
            "error": f"Failed to upload image: {str(e)}"
        }


@app.post("/api/chat")
def chat(request: ChatRequest):
    print(f"💬 CHAT_ENDPOINT: Received chat request")
    print(f"💬 Message: {request.message}")
    print(f"💬 Model: {request.model}")
    print(f"💬 Wallet: {request.wallet_address}")
    print(f"💬 Balance: {request.current_balance}")
    print(f"💬 Mode: {request.mode}")
    
    try:
        client = build_client()
    except Exception as e:
        return {"success": False, "error": str(e)}
    
    # Create or update session
    session_id = f"{request.wallet_address}_{request.mode}"
    if session_id not in session_storage:
        session_storage[session_id] = {
            "messages": [],
            "nft_info": {},
            "current_step": "initial",
            "mode": request.mode,
            "wallet_address": request.wallet_address,
            "current_balance": request.current_balance
        }
        print(f"💬 Created new session for {session_id} with balance: {request.current_balance}")
    else:
        # Update existing session with new balance
        session_storage[session_id]["current_balance"] = request.current_balance
        print(f"💬 Updated session {session_id} with balance: {request.current_balance}")
    
    session = session_storage[session_id]
    print(f"💬 Current session state: {session}")
    
    # Check for topic change and reset if needed
    current_step = session.get("current_step", "initial")
    user_message = request.message.lower()
    
    # Check if user is switching topics
    nft_keywords = ["create nft", "mint nft", "nft", "create image", "generate image", "story"]
    transfer_keywords = ["chuyển", "transfer", "send", "gửi", "sui", "token", "coin", "địa chỉ", "address"]
    
    is_nft_intent = any(keyword in user_message for keyword in nft_keywords)
    is_transfer_intent = any(keyword in user_message for keyword in transfer_keywords)
    
    # Reset session if switching topics
    if (current_step.startswith("nft_") and is_transfer_intent) or \
       (current_step.startswith("transfer_") and is_nft_intent):
        print(f"💬 Topic change detected, resetting session state")
        session["messages"] = []
        session["nft_info"] = {}
        session["current_step"] = "initial"
    
    # Store current_balance in session for transfer_handler_node to access
    session["current_balance"] = request.current_balance
    print(f"💬 Stored current_balance in session: {request.current_balance}")
    
    # Add user message to session messages
    session["messages"].append({"role": "user", "content": request.message})
    print(f"💬 Added user message to session")
    
    # Build and run graph with session state based on mode
    print(f"💬 Building LangGraph for mode: {request.mode}")
    if request.mode == "nft":
        graph = build_nft_graph()
    else:
        graph = build_transfer_graph()
    
    graph_input = {
        "messages": session["messages"],
        "nft_info": session.get("nft_info", {}),
        "current_step": session.get("current_step", "initial"),
        "mode": request.mode,
        "current_balance": request.current_balance,
        "wallet_address": request.wallet_address
    }
    
    print(f"💬 Graph input: {graph_input}")
    
    # Run the graph
    try:
        result = graph.invoke(graph_input)
        print(f"💬 Graph result: {result}")
        
        # Update session with new state
        if "messages" in result:
            session["messages"] = result["messages"]
        if "nft_info" in result:
            session["nft_info"] = result["nft_info"]
        if "current_step" in result:
            session["current_step"] = result["current_step"]
        
        # Get the latest message
        messages = result.get("messages", [])
        if messages:
            latest_message = messages[-1]
            if hasattr(latest_message, 'content'):
                content = latest_message.content
                
                # Check if content is JSON (structured response)
                try:
                    import json
                    parsed_content = json.loads(content)
                    if isinstance(parsed_content, dict) and "type" in parsed_content:
                        print(f"💬 Structured response detected: {parsed_content['type']}")
                        return {"success": True, "response": parsed_content}
                except (json.JSONDecodeError, TypeError):
                    # Not JSON, treat as regular string
                    pass
                    
            elif isinstance(latest_message, dict):
                content = latest_message.get("content", "")
            else:
                content = str(latest_message)
        else:
            content = "No response generated"
        
        print(f"💬 Final response: {content}")
        return {"success": True, "response": content}
        
    except Exception as e:
        print(f"❌ Graph execution error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Graph execution failed: {str(e)}"}


@app.post("/api/upload/image")
def upload_image(file: UploadFile = File(...)):
    """Upload and process image for NFT"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            return {"success": False, "error": "File phải là ảnh"}
        
        # Validate file size (max 10MB)
        content = file.file.read()
        if len(content) > 10 * 1024 * 1024:
            return {"success": False, "error": "File quá lớn (max 10MB)"}
        
        # Convert to base64 for storage
        image_base64 = base64.b64encode(content).decode('utf-8')
        
        # Create data URL
        image_url = f"data:{file.content_type};base64,{image_base64}"
        
        return {
            "success": True,
            "image_url": image_url,
            "filename": file.filename,
            "size": len(content),
            "content_type": file.content_type
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    client = build_client()
    direct_test(client)

    # Test transfer graph
    test_transfer_graph = build_transfer_graph()
    result = test_transfer_graph.invoke({"messages": ["Give me a one-sentence Vietnamese answer: ý nghĩa của cuộc sống là gì?"]})
    messages = result.get("messages", [])
    reply = messages[-1] if messages else ""
    print("[Transfer Graph]", reply)
    
    # Test NFT graph
    test_nft_graph = build_nft_graph()
    result = test_nft_graph.invoke({"messages": ["Give me a one-sentence Vietnamese answer: ý nghĩa của cuộc sống là gì?"]})
    messages = result.get("messages", [])
    reply = messages[-1] if messages else ""
    print("[NFT Graph]", reply)


# Health check endpoint for deployment monitoring
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "sui-chat-wallet-backend",
        "version": "1.0.0",
        "timestamp": "2025-01-03T22:00:00Z"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
