import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from typing_extensions import TypedDict, Annotated
from typing import Dict
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import json
import google.generativeai as genai


app = FastAPI(title="Sui Chat Wallet Backend")

# Session storage for maintaining conversation state
session_storage: Dict[str, dict] = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    model: str = "x-ai/grok-4-fast:free"
    wallet_address: str = ""
    current_balance: str = "0"  # Current wallet balance for validation
    mode: str = "transfer"  # "nft" or "transfer"

class TransferRecipient(BaseModel):
    to_address: str
    amount: float

class TransferIntent(BaseModel):
    intent: str  # "transfer"
    from_address: str
    to_address: str = ""  # For single recipient (backward compatibility)
    amount: float = 0.0  # For single recipient (backward compatibility)
    recipients: list[TransferRecipient] = []  # For multiple recipients
    token_type: str = "SUI"
    network: str = "devnet"
    requires_confirmation: bool = True

class NFTMintIntent(BaseModel):
    intent: str  # "mint_nft"
    owner_address: str
    name: str
    description: str
    image_url: str
    attributes: dict = {}
    network: str = "devnet"
    requires_confirmation: bool = True

class StructuredResponse(BaseModel):
    type: str  # "chat" | "transfer_intent" | "nft_mint_intent" | "confirmation_required"
    message: str
    transfer_intent: TransferIntent | None = None
    nft_mint_intent: NFTMintIntent | None = None


class ModelInfo(BaseModel):
    id: str
    name: str

class NFTMintRequest(BaseModel):
    story_prompt: str
    wallet_address: str
    name: str = ""
    description: str = ""

class ImageGenerationRequest(BaseModel):
    story_prompt: str


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


class GraphState(TypedDict):
    messages: Annotated[list, add_messages]
    nft_info: dict  # Store NFT information during creation flow
    current_step: str  # Track current step in NFT creation
    wallet_address: str  # User's wallet address
    current_balance: str  # Current wallet balance


def build_graph(client: OpenAI):
    model = os.getenv("OPENAI_MODEL", "x-ai/grok-4-fast:free")
    referer = os.getenv("FRONTEND_URL", "http://localhost:5173")
    title = os.getenv("X_TITLE", "Sui Chat Wallet")

    graph = StateGraph(GraphState)

    def route_decision(state: GraphState) -> str:
        """Route messages based on mode and current step"""
        print(f"🚦 ROUTE_DECISION: Analyzing message routing")
        
        last = state["messages"][-1]
        print(f"🚦 Last message: {last}")
        
        # Handle both string messages and dict messages
        if isinstance(last, dict):
            user_text = last.get("content", str(last))
        else:
            user_text = str(last)
        
        # Extract actual text content from LangGraph messages
        if hasattr(last, 'content'):
            user_text = last.content
        elif isinstance(last, dict):
            user_text = last.get("content", str(last))
        else:
            user_text = str(last)
        
        current_step = state.get("current_step", "initial")
        mode = state.get("mode", "transfer")
        print(f"🚦 User text: {user_text}")
        print(f"🚦 Current step: {current_step}")
        print(f"🚦 Mode: {mode}")
        
        # Route based on mode
        if mode == "nft":
            # If already in NFT creation flow, continue
            if current_step.startswith("nft_") or current_step != "initial":
                print(f"🚦 Routing to: nft_collect_info (NFT flow)")
                return "nft_collect_info"
            else:
                print(f"🚦 Routing to: nft_collect_info (NFT mode)")
                return "nft_collect_info"
        elif mode == "transfer":
            # If already in transfer flow, continue
            if current_step.startswith("transfer_") or current_step != "initial":
                print(f"🚦 Routing to: transfer_handler (Transfer flow)")
                return "transfer_handler"
            else:
                print(f"🚦 Routing to: transfer_handler (Transfer mode)")
                return "transfer_handler"
        
        print(f"🚦 Routing to: llm (Default)")
        return "llm"

    def llm_node(state: GraphState) -> GraphState:
        last = state["messages"][-1]
        # Handle both string messages and dict messages
        if isinstance(last, dict):
            user_text = last.get("content", str(last))
        else:
            user_text = str(last)
        
        # Handle "show confirm transactions" request
        if user_text.lower().strip() == "show confirm transactions":
            # Look for pending transfer in session messages
            messages = state.get("messages", [])
            for msg in reversed(messages):
                if isinstance(msg, dict) and msg.get("role") == "assistant":
                    content = msg.get("content", "")
                    try:
                        parsed = json.loads(content)
                        if parsed.get("type") == "transfer_intent":
                            # Return the transfer intent for confirmation
                            return {"messages": [{"role": "assistant", "content": content}]}
                    except json.JSONDecodeError:
                        continue
            
            # No pending transfer found
            return {"messages": [{"role": "assistant", "content": "No pending transfer intent found. Please provide transfer details (e.g., \"transfer 1 SUI to 0x...\") to extract and confirm."}]}
        
        # System prompt for Sui Chat Wallet
        system_prompt = """You are Sui Chat Wallet AI Assistant. You help users with:

1. **Sui Blockchain Operations**: Transfer tokens, check balances, view transaction history
2. **NFT Creation**: Help users create NFTs with AI-generated images
3. **Wallet Management**: Connect wallets, view assets, manage Sui blockchain interactions

**Important Guidelines:**
- You CAN help with cryptocurrency transfers on Sui blockchain - this is your core function
- You CAN assist with financial transactions within the Sui ecosystem
- Always provide helpful, accurate information about Sui blockchain operations
- When users request transfers, help them complete the transactions safely
- For NFT creation, guide users through the process step by step

**Transfer Operations:**
- Help users transfer SUI tokens to other addresses
- Validate addresses and amounts
- Provide transaction confirmations
- Estimate gas fees

**NFT Operations:**
- Help users create NFTs with custom images
- Generate images from text descriptions
- Guide through minting process

You are here to help users succeed with their Sui blockchain operations. Be helpful and supportive."""
        
        resp = client.chat.completions.create(
            extra_headers={"HTTP-Referer": referer, "X-Title": title},
            extra_body={},
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.2,
        )
        content = ""
        try:
            content = resp.choices[0].message.content
        except Exception:
            content = resp if isinstance(resp, str) else str(resp)
        return {"messages": [content]}

    def nft_collect_info_node(state: GraphState) -> GraphState:
        """Collect NFT information step by step"""
        last = state["messages"][-1]
        # Handle both string messages and dict messages
        if isinstance(last, dict):
            user_text = last.get("content", str(last))
        else:
            user_text = str(last)
        nft_info = state.get("nft_info", {})
        current_step = state.get("current_step", "nft_start")
        
        # Enhanced system prompt for NFT information collection
        nft_system_prompt = f"""You are collecting NFT creation information. Current step: {current_step}
        
        NFT Information collected so far: {nft_info}
        
        You need to collect:
        1. Story/Description (what the NFT should represent)
        2. NFT Name (short, catchy name)
        3. Collection Name (optional, defaults to user's choice)
        4. Total Supply (how many NFTs in this collection, user decides)
        5. Description (detailed description of the NFT)
        
        Current step: {current_step}
        
        If information is missing, ask for the next piece of information and return:
        {{
            "type": "nft_collect_info",
            "message": "your_question_here",
            "next_step": "nft_next_step_name",
            "collected_info": {nft_info}
        }}
        
        If all information is complete, return:
        {{
            "type": "nft_creation_intent",
            "message": "Perfect! I have all the information needed. Let me generate an image based on your story and then we can mint your NFT.",
            "nft_creation_intent": {{
                "intent": "create_nft",
                "story_prompt": "{nft_info.get('story', '')}",
                "name": "{nft_info.get('name', '')}",
                "collection_name": "{nft_info.get('collection_name', '')}",
                "total_supply": {nft_info.get('total_supply', 1)},
                "description": "{nft_info.get('description', '')}",
                "network": "devnet",
                "requires_image_generation": true
            }}
        }}
        
        Always respond in JSON format."""
        
        resp = client.chat.completions.create(
            extra_headers={"HTTP-Referer": referer, "X-Title": title},
            extra_body={},
            model=model,
            messages=[
                {"role": "system", "content": nft_system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.2,
        )
        
        content = ""
        try:
            content = resp.choices[0].message.content
        except Exception:
            content = resp if isinstance(resp, str) else str(resp)
        
        # Try to parse the response as JSON to update state
        try:
            parsed_response = json.loads(content)
            if parsed_response.get("type") == "nft_collect_info":
                # Update nft_info with collected information
                collected_info = parsed_response.get("collected_info", {})
                next_step = parsed_response.get("next_step", current_step)
                
                # Smart extraction of information from user message based on current step
                if current_step == "story" and not collected_info.get("story"):
                    collected_info["story"] = user_text
                elif current_step == "name" and not collected_info.get("name"):
                    collected_info["name"] = user_text
                elif current_step == "collection_name" and not collected_info.get("collection_name"):
                    collected_info["collection_name"] = user_text
                elif current_step == "total_supply" and not collected_info.get("total_supply"):
                    # Extract number from user message
                    import re
                    numbers = re.findall(r'\d+', user_text)
                    if numbers:
                        collected_info["total_supply"] = int(numbers[0])
                    else:
                        collected_info["total_supply"] = 1
                elif current_step == "description" and not collected_info.get("description"):
                    collected_info["description"] = user_text
                
                # Merge collected info with existing nft_info
                updated_nft_info = {**nft_info, **collected_info}
                
                return {
                    "messages": [content],
                    "nft_info": updated_nft_info,
                    "current_step": next_step
                }
            elif parsed_response.get("type") == "nft_creation_intent":
                return {
                    "messages": [content],
                    "nft_info": nft_info,
                    "current_step": "nft_creation_complete"
                }
        except json.JSONDecodeError:
            pass
        
        return {"messages": [content]}

    def transfer_handler_node(state: GraphState) -> GraphState:
        """Handle transfer intent and return structured response"""
        print(f"🔄 TRANSFER_HANDLER_NODE: Processing transfer request")
        print(f"🔄 Current state: {state}")
        print(f"🔄 State keys: {list(state.keys())}")
        print(f"🔄 Current balance from state: {state.get('current_balance', 'NOT_FOUND')}")
        
        try:
            last = state["messages"][-1]
            print(f"🔄 Last message: {last}")
            
            # Handle both string messages and dict messages
            if isinstance(last, dict):
                user_text = last.get("content", str(last))
            else:
                user_text = str(last)
            
            print(f"🔄 Extracted user text: {user_text}")
            
            # System prompt for transfer handling
            transfer_system_prompt = """You are a Sui blockchain transfer assistant. When users request transfers, analyze their message and return a JSON response with transfer intent.

Extract transfer information from user messages like:
- "chuyển 1 SUI tới 0x..."
- "transfer 2 tokens to address..."
- "send 0.5 sui to..."

IMPORTANT: Do NOT include current_balance or after_transaction_balance fields in your response. Only include the fields shown below.

Return JSON format:
{
  "type": "transfer_intent",
  "transfer_intent": {
    "intent": "transfer",
    "from_address": "[user_wallet_address]",
    "to_address": "[extracted_address]",
    "amount": [extracted_amount],
    "token_type": "SUI",
    "network": "devnet",
    "requires_confirmation": true
  },
  "message": "Transfer information extracted. Please type "show confirm transactions" to confirm details."
}

If multiple recipients, use:
{
  "type": "transfer_intent", 
  "transfer_intent": {
    "intent": "transfer",
    "from_address": "[user_wallet_address]",
    "recipients": [
      {"to_address": "0x...", "amount": 1.0},
      {"to_address": "0x...", "amount": 2.0}
    ],
    "token_type": "SUI",
    "network": "devnet", 
    "requires_confirmation": true
  },
  "message": "Multiple transfer recipients detected. Please type "show confirm transactions" to confirm details."
}

If information is missing, ask for clarification instead of proceeding."""
            
            print(f"🔄 Calling OpenAI API for transfer analysis...")
            resp = client.chat.completions.create(
                extra_headers={"HTTP-Referer": referer, "X-Title": title},
                extra_body={},
                model=model,
                messages=[
                    {"role": "system", "content": transfer_system_prompt},
                    {"role": "user", "content": user_text}
                ],
                temperature=0.2,
            )
            
            content = ""
            try:
                content = resp.choices[0].message.content
            except Exception:
                content = resp if isinstance(resp, str) else str(resp)
            
            print(f"🔄 OpenAI response: {content}")
            
            # Try to parse JSON response
            try:
                response_data = json.loads(content)
                print(f"🔄 Parsed JSON response: {response_data}")
                
                # Validate transfer intent
                if response_data.get("type") == "transfer_intent":
                    transfer_intent = response_data.get("transfer_intent", {})
                    
                    # 1. Calculate total amount from recipients
                    total_amount = 0
                    if "recipients" in transfer_intent:
                        recipients = transfer_intent.get("recipients", [])
                        total_amount = sum(float(r.get("amount", 0)) for r in recipients)
                        print(f"🔄 Total amount from {len(recipients)} recipients: {total_amount}")
                    else:
                        total_amount = float(transfer_intent.get("amount", 0))
                        print(f"🔄 Single recipient amount: {total_amount}")
                    
                    # 2. Validate wallet addresses after AI response
                    invalid_addresses = []
                    if "recipients" in transfer_intent:
                        for i, recipient in enumerate(transfer_intent.get("recipients", [])):
                            address = recipient.get("to_address", "")
                            if not address.startswith("0x") or len(address) < 10:
                                invalid_addresses.append(f"Recipient {i+1}: {address}")
                    else:
                        address = transfer_intent.get("to_address", "")
                        if not address.startswith("0x") or len(address) < 10:
                            invalid_addresses.append(f"Address: {address}")
                    
                    # 3. Check address validation - return error if invalid
                    if invalid_addresses:
                        error_response = {
                            "type": "transfer_error",
                            "error": "invalid_address",
                            "message": f"Invalid wallet addresses: {', '.join(invalid_addresses)}",
                            "invalid_addresses": invalid_addresses
                        }
                        print(f"🔄 Address validation failed: {error_response}")
                        return {"messages": [{"role": "assistant", "content": json.dumps(error_response)}]}
                    
                    # 4. Address validation passed - return original AI response without balance fields
                    print(f"🔄 Address validation passed!")
                    
                    # Get wallet address from state
                    wallet_address = state.get("wallet_address", "[user_wallet_address]")
                    print(f"🔄 Wallet address from state: {wallet_address}")
                    
                    # Remove balance fields from response
                    if "recipients" in transfer_intent:
                        response_data = {
                            "type": "transfer_intent",
                            "transfer_intent": {
                                "intent": "transfer",
                                "from_address": wallet_address,
                                "recipients": transfer_intent.get("recipients", []),
                                "token_type": "SUI",
                                "network": "devnet",
                                "requires_confirmation": True
                            },
                            "message": "Multiple transfer recipients detected. Please type \"show confirm transactions\" to confirm details."
                        }
                    else:
                        response_data = {
                            "type": "transfer_intent",
                            "transfer_intent": {
                                "intent": "transfer",
                                "from_address": wallet_address,
                                "to_address": transfer_intent.get("to_address", ""),
                                "amount": transfer_intent.get("amount", 0),
                                "token_type": "SUI",
                                "network": "devnet",
                                "requires_confirmation": True
                            },
                            "message": "Transfer information extracted. Please type \"show confirm transactions\" to confirm details."
                        }
                
                # Return as LangGraph compatible message
                return {"messages": [{"role": "assistant", "content": json.dumps(response_data)}]}
            except json.JSONDecodeError:
                print(f"🔄 JSON parse failed, returning as chat message")
                # If not JSON, return as regular message
                return {"messages": [{"role": "assistant", "content": content}]}
        except Exception as e:
            print(f"❌ Error in transfer_handler_node: {e}")
            import traceback
            traceback.print_exc()
            return {"messages": [{"role": "assistant", "content": f"Error processing transfer request: {str(e)}"}]}


    graph.add_node("llm", llm_node)
    graph.add_node("nft_collect_info", nft_collect_info_node)
    graph.add_node("transfer_handler", transfer_handler_node)
    
    graph.add_conditional_edges(
        START,
        route_decision,
        {
            "nft_collect_info": "nft_collect_info",
            "transfer_handler": "transfer_handler",
            "llm": "llm"
        }
    )
    
    return graph.compile()


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
        enhanced_prompt = f"""Create a detailed, high-quality digital artwork based on this story: {request.story_prompt}
        
        Requirements:
        - High resolution, detailed artwork
        - Professional digital art style
        - Vibrant colors and good composition
        - Suitable for NFT creation
        - No text or watermarks
        """
        
        # Generate image using Hugging Face Stable Diffusion XL
        image = client.text_to_image(
            enhanced_prompt,
            model="stabilityai/stable-diffusion-xl-base-1.0"
        )
        
        # Convert PIL Image to base64 for transmission
        import base64
        from io import BytesIO
        
        # Convert PIL Image to bytes
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        
        # Encode to base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        data_url = f"data:image/png;base64,{base64_image}"
        
        return {
            "success": True,
            "message": "Image generated successfully with Stable Diffusion 3.5 Large",
            "image_url": data_url,
            "prompt_used": enhanced_prompt
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to generate image: {str(e)}"
        }

@app.post("/api/chat")
def chat(request: ChatRequest):
    print(f"💬 CHAT_ENDPOINT: Received chat request")
    print(f"💬 Message: {request.message}")
    print(f"💬 Model: {request.model}")
    print(f"💬 Wallet: {request.wallet_address}")
    
    client = build_client()
    
    # Create or get session (use wallet address as session key for simplicity)
    session_id = request.wallet_address or "anonymous"
    print(f"💬 Session ID: {session_id}")
    
    if session_id not in session_storage:
        session_storage[session_id] = {
            "messages": [],
            "nft_info": {},
            "current_step": "initial",
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
    
    # Build and run graph with session state
    print(f"💬 Building LangGraph...")
    graph = build_graph(client)
    
    graph_input = {
        "messages": session["messages"],
        "nft_info": session.get("nft_info", {}),
        "current_step": session.get("current_step", "initial"),
        "mode": request.mode,
        "current_balance": request.current_balance,
        "wallet_address": request.wallet_address
    }
    print(f"💬 Graph input: {graph_input}")
    
    print(f"💬 Invoking LangGraph...")
    result = graph.invoke(graph_input)
    print(f"💬 Graph result: {result}")
    
    # Update session state
    session["messages"] = result.get("messages", session["messages"])
    session["nft_info"] = result.get("nft_info", session.get("nft_info", {}))
    session["current_step"] = result.get("current_step", session.get("current_step", "initial"))
    print(f"💬 Updated session: {session}")
    
    # Get the last message
    messages = result.get("messages", [])
    if not messages:
        print(f"💬 No messages in result, returning error")
        return {"success": False, "error": "No response generated"}
    
    last_message = messages[-1]
    
    # Try to parse as JSON for structured responses
    try:
        if isinstance(last_message, str):
            parsed_response = json.loads(last_message)
            return {"success": True, "reply": parsed_response}
        else:
            # Handle HumanMessage objects - extract content attribute
            if hasattr(last_message, 'content'):
                message_content = last_message.content
            else:
                message_content = str(last_message)
            
            # Try to parse as JSON
            parsed_response = json.loads(message_content)
            return {"success": True, "reply": parsed_response}
    except json.JSONDecodeError:
        # Fallback to regular chat message
        if hasattr(last_message, 'content'):
            message_content = last_message.content
        else:
            message_content = str(last_message)
        return {"success": True, "reply": {"type": "chat", "message": message_content}}
@app.post("/api/transfer/execute")
def execute_transfer(transfer_intent: TransferIntent):
    """Execute transfer transaction using Sui blockchain"""
    try:
        # For now, return a structured response indicating that the transaction
        # should be executed on the frontend using the wallet
        # The frontend will handle the actual transaction signing and execution
        
        # Handle multiple recipients
        if transfer_intent.recipients:
            total_amount = sum(r.amount for r in transfer_intent.recipients)
            message = f"Ready to transfer to {len(transfer_intent.recipients)} recipients. Total: {total_amount} {transfer_intent.token_type}"
        else:
            # Single recipient (backward compatibility)
            message = f"Ready to transfer {transfer_intent.amount} {transfer_intent.token_type} to {transfer_intent.to_address}"
        
        return {
            "success": True,
            "requires_wallet_signature": True,
            "transfer_intent": transfer_intent.model_dump(),
            "message": f"{message}. Please confirm in your wallet to complete the transaction."
        }
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/nft/mint")
def mint_nft(nft_intent: NFTMintIntent):
    """Execute NFT minting using real Sui blockchain"""
    try:
        # Load contract configuration
        import json
        import os
        from pathlib import Path
        
        config_path = Path(__file__).parent.parent / "contract_config.json"
        if not config_path.exists():
            return {"success": False, "error": "Contract not deployed. Please deploy the Move contract first."}
        
        with open(config_path, 'r') as f:
            contract_config = json.load(f)
        
        package_id = contract_config["package_id"]
        
        # Log the minting attempt for debugging
        print(f"🔨 Real NFT Minting Attempt:")
        print(f"   Name: {nft_intent.name}")
        print(f"   Owner: {nft_intent.owner_address}")
        print(f"   Network: {nft_intent.network}")
        print(f"   Package ID: {package_id}")
        
        # For now, we'll return a success response indicating that the NFT
        # should be minted by the frontend using the Sui SDK
        # In a production environment, you would:
        # 1. Use Sui SDK to build transaction
        # 2. Handle wallet signing (this should be done on frontend)
        # 3. Execute transaction and return real results
        
        return {
            "success": True,
            "message": f"NFT '{nft_intent.name}' ready for minting! Please use the frontend to complete the transaction.",
            "package_id": package_id,
            "function_name": "mint_to_sender",
            "module_name": "nft_mint",
            "nft_type": contract_config["nft_type"],
            "instructions": "Use Sui SDK on frontend to call mint_to_sender function with the provided package ID"
        }
            
    except Exception as e:
        print(f"❌ NFT minting error: {str(e)}")
        return {"success": False, "error": str(e)}


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

    test_graph = build_graph(client)
    result = test_graph.invoke({"messages": ["Give me a one-sentence Vietnamese answer: ý nghĩa của cuộc sống là gì?"]})
    messages = result.get("messages", [])
    reply = messages[-1] if messages else ""
    print("[LangGraph]", reply)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
