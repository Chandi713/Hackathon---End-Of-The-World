"""
Economic News Agent using Google ADK
"""
import asyncio
import json
import os
import re
import time
from datetime import datetime
from typing import Optional

from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import get_model, load_prompts

# ADK imports
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search
from google.genai import types

def parse_json_response(response: str) -> dict:
    """Try to parse JSON from the agent response."""
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass
    
    # Try extracting JSON block from markdown
    json_block = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
    if json_block:
        try:
            return json.loads(json_block.group(1))
        except json.JSONDecodeError:
            pass
            
    # Try finding any JSON object
    json_match = re.search(r'\{.*\}', response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
            
    return {"error": "Could not parse JSON response", "raw_response": response[:500]}

async def run_adk_agent_async(country: str) -> str:
    """Run the ADK agent asynchronously to fetch news."""
    
    # Load instruction from prompts.yaml
    prompts = load_prompts()
    base_instruction = prompts.get('economic_news_adk_instruction', '')
    
    lookback_days = 60
    end_date = datetime.now().strftime('%Y-%m-%d')
    
    # Format the instruction with specific parameters
    instruction = base_instruction.format(
        country=country,
        lookback_days=lookback_days,
        end_date=end_date
    )
    
    search_prompt = f"""Search for the most important political and economic news about {country} 
in the past {lookback_days} days (up to {end_date}). 

Specifically search for:
1. Taliban governance updates, political decisions, and policy changes
2. International relations and diplomatic developments  
3. Economic conditions, trade, sanctions, and humanitarian aid
4. Currency/banking developments
5. Security situation and regional dynamics

Make multiple searches to cover both political AND economic news thoroughly.
Return your findings as the specified JSON format."""

    # Set up ADK using API key from env
    # Note: google.adk uses GOOGLE_API_KEY env var by default, or we can pass it
    if not os.environ.get("GOOGLE_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = os.environ.get("GEMINI_API_KEY", "")

    session_service = InMemorySessionService()

    # Create the ADK Agent
    agent = LlmAgent(
        name="economic_news_adk_worker",
        model="gemini-2.0-flash", 
        instruction=instruction,
        tools=[google_search],
    )

    runner = Runner(
        agent=agent,
        app_name="economic_news_service",
        session_service=session_service
    )

    user_id = "orchestrator_user"
    session_id = f"session_{country}_{int(time.time())}"

    # Execution
    session = await runner.session_service.create_session(
        app_name=runner.app_name,
        user_id=user_id,
        session_id=session_id
    )

    content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=search_prompt)]
    )

    final_response = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content
    ):
        if event.is_final_response():
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        final_response += part.text
                        
    return final_response

@tool
def ask_economic_news_agent(country: str) -> str:
    """
    Query the Economic News Agent to get real-time political and economic news for a country.
    
    Args:
        country (str): The name of the country to analyze (e.g., "Afghanistan", "India").
        
    Returns:
        str: A JSON string containing political/economic events, risks, and stability assessment.
    """
    try:
        print(f"  ... 🌍 Connecting to Google ADK for {country} news ...")
        # Run the async ADK agent synchronously so it works with LangGraph tools
        response_text = asyncio.run(run_adk_agent_async(country))
        
        # Parse and re-dump to ensure it's clean JSON string, or just return text
        # If the Orchestrator expects a string, we return the raw response 
        # but parsing ensures we have valid JSON before returning
        parsed = parse_json_response(response_text)
        return json.dumps(parsed, indent=2)
        
    except Exception as e:
        return f"Error running Economic News Agent: {str(e)}"

# Create the LangGraph agent wrapper
def create_economic_news_agent():
    prompts = load_prompts()
    # This is the "router" or "shell" agent that just calls the tool
    return create_react_agent(
        model=get_model(), 
        tools=[ask_economic_news_agent], 
        name="economic_news_agent", 
        prompt=prompts['economic_news_agent']
    )

if __name__ == "__main__":
    # Test run
    print("Testing Economic News Agent...")
    result = ask_economic_news_agent.invoke({"country": "Afghanistan"})
    print(result)
