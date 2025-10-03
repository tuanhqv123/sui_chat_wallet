"""
NFT Graph for handling NFT creation operations
"""
import json
from typing import Dict, Any
from langgraph.graph import StateGraph, START
from openai import OpenAI
from langchain_core.messages import AIMessage

from .base import GraphState, build_openai_client, get_openai_config, extract_user_text


def nft_route_decision(state: GraphState) -> str:
    """Route messages for NFT operations"""
    print(f"🚦 NFT_ROUTE: Analyzing NFT message routing")
    
    last = state["messages"][-1]
    print(f"🚦 Last message: {last}")
    
    user_text = extract_user_text(last)
    current_step = state.get("current_step", "initial")
    print(f"🚦 User text: {user_text}")
    print(f"🚦 Current step: {current_step}")
    
    # For NFT graph, always route to nft_collect_info
    print(f"🚦 Routing to: nft_collect_info (NFT mode)")
    return "nft_collect_info"


def nft_collect_info_node(state: GraphState) -> GraphState:
    """Collect NFT information step by step"""
    print(f"🔄 NFT_COLLECT_INFO: Processing NFT creation request")
    
    last = state["messages"][-1]
    user_text = extract_user_text(last)
    nft_info = state.get("nft_info", {})
    current_step = state.get("current_step", "nft_start")
    
    try:
        config = get_openai_config()
        client = build_openai_client()
        
        # Enhanced system prompt for NFT information collection
        nft_system_prompt = f"""You are a helpful NFT creation assistant for the Sui blockchain.

**Conversation History**: {[msg.content for msg in state.get("messages", [])[-6:]]}

**Your role**: Help users create simple NFTs by collecting name and description.

**IMPORTANT**: Look at the conversation history. If the user has already provided:
- A name (like "PEPE Vie", "Cyber Cat", etc.)
- A description (or you've suggested one that they accepted)

AND the user says things like "yes", "create image", "let's mint", "move to mint" - then you MUST respond with the JSON format below.

**When to create the NFT**:
- User has provided name + description (or you suggested description they accepted)
- User confirms with "yes", "create", "mint", "let's go", etc.

**JSON Format when ready to create NFT**:
{{
  "type": "nft_creation_intent",
  "nft_creation_intent": {{
    "name": "[extracted name from conversation]",
    "description": "[extracted/suggested description from conversation]"
  }},
  "message": "Perfect! I have all the information needed. Let me generate an image for your NFT..."
}}

**If still missing info**: Ask for name and description in a friendly way.
**If ready**: Return the JSON above immediately.

You ARE an NFT creation assistant, not a transfer assistant."""

        print(f"🔄 Calling OpenAI API for NFT info collection...")
        resp = client.chat.completions.create(
            extra_headers={"HTTP-Referer": config["referer"], "X-Title": config["title"]},
            extra_body={},
            model=config["model"],
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
        
        print(f"🔄 OpenAI response: {content}")
        
        # Analyze the conversation to determine next step and collect info
        conversation_text = ""
        for msg in state.get("messages", []):
            if hasattr(msg, 'content'):
                conversation_text += f"{msg.content} "
        
        # Simple state management based on conversation content
        updated_nft_info = nft_info.copy()
        updated_step = current_step
        
        # Get the latest user message
        latest_message = ""
        if state.get("messages"):
            latest_msg = state["messages"][-1]
            if hasattr(latest_msg, 'content'):
                latest_message = latest_msg.content
            elif isinstance(latest_msg, dict):
                latest_message = latest_msg.get('content', '')
        
        print(f"🔄 Latest message: {latest_message}")
        
        # Let AI handle the conversation naturally - no hardcoded parsing
        # Just update the state with any new information the AI might have extracted
        print(f"🔄 Letting AI handle NFT info collection naturally...")
        
        # Let AI decide when it has enough info to create NFT
        # Remove hardcoded field checking - let AI handle it naturally
        print(f"🔄 Current NFT info: {updated_nft_info}")
        
        # Only generate image if AI returns nft_creation_intent
        # This will be handled in the JSON parsing section below
        
        # Try to parse JSON response
        try:
            nft_response = json.loads(content)
            print(f"🔄 Parsed NFT response: {nft_response}")
            
            # If it's a complete NFT creation intent, generate image and return
            if nft_response.get("type") == "nft_creation_intent":
                nft_info = nft_response.get("nft_creation_intent", {})
                print(f"🔄 AI decided we have enough info: {nft_info}")
                
                # Generate image using the description
                try:
                    print(f"🔄 Generating image for description: {nft_info.get('description', '')}")
                    import requests
                    
                    # Call the image generation API
                    image_response = requests.post(
                        "http://localhost:8000/api/generate-image",
                        json={"story_prompt": nft_info.get('description', '')},
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if image_response.status_code == 200:
                        image_data = image_response.json()
                        nft_info["image_url"] = image_data.get("image_url", "")
                        nft_info["image_base64"] = image_data.get("image_base64", "")
                        print(f"🔄 Image generated successfully")
                    else:
                        print(f"❌ Image generation failed: {image_response.status_code}")
                        nft_info["image_url"] = ""
                        nft_info["image_base64"] = ""
                        
                except Exception as e:
                    print(f"❌ Error generating image: {e}")
                    nft_info["image_url"] = ""
                    nft_info["image_base64"] = ""
                
                # Update the response with image data
                nft_response["nft_creation_intent"] = nft_info
                updated_content = json.dumps(nft_response)
                
                return {
                    "messages": [AIMessage(content=updated_content)],
                    "nft_info": nft_info,
                    "current_step": "nft_creation_complete"
                }
        except json.JSONDecodeError:
            print(f"🔄 JSON parse failed, returning as chat message")
        
        # Return as regular chat message with updated state
        return {
            "messages": [AIMessage(content=content)],
            "nft_info": updated_nft_info,
            "current_step": updated_step
        }
            
    except Exception as e:
        print(f"❌ Error in nft_collect_info_node: {e}")
        import traceback
        traceback.print_exc()
        return {"messages": [{"role": "assistant", "content": f"Error processing NFT request: {str(e)}"}]}


def build_nft_graph() -> StateGraph:
    """Build and return the NFT graph"""
    print(f"🔧 Building NFT Graph...")
    
    graph = StateGraph(GraphState)
    
    # Add nodes
    graph.add_node("nft_collect_info", nft_collect_info_node)
    
    # Add edges
    graph.add_conditional_edges(
        START,
        nft_route_decision,
        {
            "nft_collect_info": "nft_collect_info"
        }
    )
    
    return graph.compile()
