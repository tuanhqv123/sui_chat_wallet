"""
Transfer Graph for handling SUI token transfers
"""
import json
from typing import Dict, Any
from langgraph.graph import StateGraph, START
from openai import OpenAI

from .base import GraphState, build_openai_client, get_openai_config, extract_user_text


def transfer_route_decision(state: GraphState) -> str:
    """Route messages for transfer operations"""
    print(f"🚦 TRANSFER_ROUTE: Analyzing transfer message routing")
    
    last = state["messages"][-1]
    print(f"🚦 Last message: {last}")
    
    user_text = extract_user_text(last)
    current_step = state.get("current_step", "initial")
    print(f"🚦 User text: {user_text}")
    print(f"🚦 Current step: {current_step}")
    
    # For transfer graph, always route to transfer_handler
    print(f"🚦 Routing to: transfer_handler (Transfer mode)")
    return "transfer_handler"


def transfer_handler_node(state: GraphState) -> GraphState:
    """Handle transfer operations and extract transfer intent"""
    print(f"🔄 TRANSFER_HANDLER: Processing transfer request")
    
    last = state["messages"][-1]
    user_text = extract_user_text(last)
    
    try:
        config = get_openai_config()
        client = build_openai_client()
        
        # Enhanced system prompt for transfer analysis
        transfer_system_prompt = f"""You are a Sui blockchain transfer assistant. Your job is to analyze user messages and extract transfer information.

**Current wallet address**: {state.get('wallet_address', '[user_wallet_address]')}

**Your task**: Extract transfer details from user messages and return structured JSON.

**Examples of valid transfer requests**:
- "transfer 1 SUI to 0x123..."
- "send 0.5 SUI to 0x456..."
- "chuyển 2 SUI cho 0x789..."
- "gửi 1.5 SUI đến 0xabc..."

**For single recipient, return**:
{{
  "type": "transfer_intent",
  "transfer_intent": {{
    "intent": "transfer",
    "from_address": "{state.get('wallet_address', '[user_wallet_address]')}",
    "to_address": "[extracted_address]",
    "amount": [extracted_amount],
    "token_type": "SUI",
    "network": "devnet",
    "requires_confirmation": true
  }}
}}

**For multiple recipients, return**:
{{
  "type": "transfer_intent", 
  "transfer_intent": {{
    "intent": "transfer",
    "from_address": "{state.get('wallet_address', '[user_wallet_address]')}",
    "recipients": [
      {{"to_address": "0x...", "amount": 1.0}},
      {{"to_address": "0x...", "amount": 2.0}}
    ],
    "token_type": "SUI",
    "network": "devnet", 
    "requires_confirmation": true
  }}
}}

**Important**:
- ONLY return JSON, no additional text
- If information is missing, ask for clarification instead of proceeding
- Do NOT include current_balance or after_transaction_balance in your response
- Always set requires_confirmation to true"""

        print(f"🔄 Calling OpenAI API for transfer analysis...")
        resp = client.chat.completions.create(
            extra_headers={"HTTP-Referer": config["referer"], "X-Title": config["title"]},
            extra_body={},
            model=config["model"],
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
            transfer_intent = json.loads(content)
            print(f"🔄 Parsed transfer intent: {transfer_intent}")
            
            # Validate wallet addresses
            def validate_address(address):
                return isinstance(address, str) and address.startswith("0x") and len(address) >= 42
            
            # Check for single recipient
            if "to_address" in transfer_intent.get("transfer_intent", {}):
                to_address = transfer_intent["transfer_intent"]["to_address"]
                if not validate_address(to_address):
                    return {"messages": [{"role": "assistant", "content": json.dumps({
                        "type": "transfer_error",
                        "error": "invalid_address",
                        "message": f"Invalid wallet address format: {to_address}"
                    })}]}
            
            # Check for multiple recipients
            elif "recipients" in transfer_intent.get("transfer_intent", {}):
                recipients = transfer_intent["transfer_intent"]["recipients"]
                for recipient in recipients:
                    if not validate_address(recipient.get("to_address", "")):
                        return {"messages": [{"role": "assistant", "content": json.dumps({
                            "type": "transfer_error", 
                            "error": "invalid_address",
                            "message": f"Invalid wallet address format: {recipient.get('to_address', '')}"
                        })}]}
            
            # Create response with proper message
            wallet_address = state.get("wallet_address", "[user_wallet_address]")
            print(f"🔄 Wallet address from state: {wallet_address}")
            
            # Remove balance fields from response
            if "recipients" in transfer_intent.get("transfer_intent", {}):
                response_data = {
                    "type": "transfer_intent",
                    "transfer_intent": {
                        "intent": "transfer",
                        "from_address": wallet_address,
                        "recipients": transfer_intent["transfer_intent"].get("recipients", []),
                        "token_type": "SUI",
                        "network": "devnet",
                        "requires_confirmation": True
                    },
                    "message": "Transfer intent confirmed. Opening confirmation dialog..."
                }
            else:
                response_data = {
                    "type": "transfer_intent",
                    "transfer_intent": {
                        "intent": "transfer",
                        "from_address": wallet_address,
                        "to_address": transfer_intent["transfer_intent"].get("to_address", ""),
                        "amount": transfer_intent["transfer_intent"].get("amount", 0),
                        "token_type": "SUI",
                        "network": "devnet",
                        "requires_confirmation": True
                    },
                    "message": "Transfer intent confirmed. Opening confirmation dialog..."
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


def build_transfer_graph() -> StateGraph:
    """Build and return the transfer graph"""
    print(f"🔧 Building Transfer Graph...")
    
    graph = StateGraph(GraphState)
    
    # Add nodes
    graph.add_node("transfer_handler", transfer_handler_node)
    
    # Add edges
    graph.add_conditional_edges(
        START,
        transfer_route_decision,
        {
            "transfer_handler": "transfer_handler"
        }
    )
    
    return graph.compile()
