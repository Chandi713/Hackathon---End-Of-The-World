"""
ResilienceAI — Supervisor / Orchestrator Logic
"""
import logging
import operator
import json
from typing import Annotated, Any, Dict, List, Optional, Sequence, TypedDict, Union

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, FunctionMessage

logger = logging.getLogger(__name__)
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.graph import StateGraph, END

# The agent state is the list of messages
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str

def _message_content(msg: Any) -> Optional[str]:
    """Get content from message (object or dict)."""
    if isinstance(msg, dict):
        return msg.get("content") or msg.get("text") or ""
    return getattr(msg, "content", None) or getattr(msg, "text", None)


def _parse_route_from_text(content: str, options: List[str]) -> Optional[str]:
    """Find first agent name or FINISH in model text (tools may not be used by HF/DeepSeek)."""
    if not content or not options:
        return None
    text = content.strip().lower()
    # Check longer agent names first so "economic_news_agent" matches before "news_stats_agent"
    agents_only = [o for o in options if o != "FINISH"]
    agents_sorted = sorted(agents_only, key=len, reverse=True)
    for opt in agents_sorted:
        if opt.lower() in text:
            return opt
    if "finish" in text:
        return "FINISH"
    return None


def parse_route_factory(options: List[str]):
    """Build parse_route that knows valid next steps (for text-based routing when tools are not used)."""

    def parse_route(message: BaseMessage) -> Dict[str, Any]:
        """Parse the route from the message: tool_calls, function_call, or text containing agent name."""
        if isinstance(message, dict):
            content = _message_content(message) or ""
            next_ = _parse_route_from_text(content, options)
            if next_:
                return {"next": next_}
            return {"next": "FINISH"}
        if hasattr(message, "tool_calls") and message.tool_calls:
            return message.tool_calls[0]["args"]
        if hasattr(message, "additional_kwargs") and getattr(message, "additional_kwargs") and "function_call" in message.additional_kwargs:
            return json.loads(message.additional_kwargs["function_call"]["arguments"])
        content = _message_content(message) or ""
        next_ = _parse_route_from_text(content, options)
        if next_:
            return {"next": next_}
        # No clear route in text: default FINISH (was previous behavior)
        return {"next": "FINISH"}
    return parse_route

def create_supervisor(agents: List[Any], model: BaseChatModel, prompt: str):
    """
    Create a supervisor agent that routes to other agents.
    """
    members = [a.name for a in agents]
    options = ["FINISH"] + members
    
    # Define the routing function
    function_def = {
        "name": "route",
        "description": "Select the next role.",
        "parameters": {
            "title": "routeSchema",
            "type": "object",
            "properties": {
                "next": {
                    "title": "Next",
                    "anyOf": [
                        {"enum": options},
                    ],
                }
            },
            "required": ["next"],
        },
    }
    
    prompt_template = ChatPromptTemplate.from_messages(
        [
            ("system", prompt),
            MessagesPlaceholder(variable_name="messages"),
            (
                "system",
                "Given the conversation above, who should act next? Reply with ONLY one word from this list: {options}. "
                "No explanation, no other text. Examples: food_agent, economy_agent, FINISH.",
            ),
        ]
    ).partial(options=str(options), members=", ".join(members))

    parse_route = parse_route_factory(options)
    supervisor_chain = (
        prompt_template
        | model.bind_tools(tools=[function_def])
        | parse_route
    )

    # Keyword rules for inferring route from user query (order = specificity: more specific first)
    QUERY_ROUTE_RULES: List[tuple] = [
        # food_agent — food/crop/production (check "food production" before generic "production")
        ("food_agent", [
            "food production", "food trade", "food price", "food security", "compare food",
            "crop", "crops", "agriculture", "harvest", "faostat", "food supply",
            "wheat", "rice production", "maize", "soybean", "sugar cane", "staple crop",
            "food", "agricultural",
        ]),
        # economic_news_agent — real-time / live news (before generic "news")
        ("economic_news_agent", [
            "economic news", "real-time", "realtime", "live update", "current event",
            "google search", "latest news", "today's news", "breaking",
        ]),
        # economy_agent
        ("economy_agent", [
            "gdp", "trade", "inflation", "commodity", "exchange rate", "current account",
            "economy", "economic", "ppp", "import", "export", "trade balance",
        ]),
        # weather_disaster_agent
        ("weather_disaster_agent", [
            "weather", "climate", "disaster", "flood", "drought", "earthquake", "storm",
            "temperature", "precipitation", "era5", "em-dat", "natural disaster",
        ]),
        # disease_agent
        ("disease_agent", [
            "disease", "outbreak", "pandemic", "epidemic", "vaccination", "covid",
            "virus", "infection", "health crisis",
        ]),
        # health_agent (after disease so "health" in "health expenditure" doesn't steal disease queries)
        ("health_agent", [
            "health expenditure", "healthcare", "hospital", "health system",
            "health capacity", "medical",
        ]),
        # political_agent
        ("political_agent", [
            "political", "protest", "sanctions", "stability", "tension", "diplomatic",
            "governance", "conflict ratio", "instability index",
        ]),
        # news_stats_agent — conflict/GDELT/media (after economic_news)
        ("news_stats_agent", [
            "conflict", "war", "gdelt", "media", "event data", "news stats",
            "conflict event", "sanctions event", "protest event",
        ]),
    ]

    def _infer_route_from_query(q: str) -> Optional[str]:
        """Infer agent from user query using ordered keyword rules (most specific first)."""
        if not q or not q.strip():
            return None
        text = (q or "").lower().strip()
        for agent_name, keywords in QUERY_ROUTE_RULES:
            if agent_name not in members:
                continue
            for k in keywords:
                if k in text:
                    return agent_name
        return None

    def _last_message_role(messages: list) -> Optional[str]:
        """Return role of last message: 'user', 'assistant', or None."""
        if not messages:
            return None
        m = messages[-1]
        if isinstance(m, dict):
            return (m.get("role") or "").lower() or None
        return (getattr(m, "type", "") or getattr(m, "role", "") or "").lower() or None

    def supervisor_node(state: Dict[str, Any]) -> Dict[str, Any]:
        result = supervisor_chain.invoke(state)
        next_val = result.get("next", "FINISH")
        messages = state.get("messages") or []
        # If the last message is from an agent (assistant), go to FINISH to avoid supervisor→agent→supervisor→agent loops
        last_role = _last_message_role(messages)
        if last_role in ("assistant", "ai") and len(messages) > 2:
            next_val = "FINISH"
        # Whenever model didn't route to an agent, try to infer from the last user message (first turn only)
        elif next_val == "FINISH":
            last_user_content = ""
            for m in reversed(messages):
                role = (m.get("role") if isinstance(m, dict) else getattr(m, "type", "") or getattr(m, "role", ""))
                if (isinstance(m, dict) and (m.get("role") or "").lower() == "user") or (str(role).lower() in ("user", "human")):
                    last_user_content = _message_content(m) or ""
                    break
            inferred = _infer_route_from_query(last_user_content)
            if inferred:
                next_val = inferred
        return {"next": next_val}

    # Build the graph
    workflow = StateGraph(AgentState)

    # Add the supervisor node (chain + keyword fallback whenever model doesn't route)
    workflow.add_node("supervisor", supervisor_node)
    
    # Add agent nodes
    for agent in agents:
        agent_node = agent
        workflow.add_node(agent.name, agent_node)

    # Add edges
    for member in members:
        # After an agent finishes, return to supervisor
        workflow.add_edge(member, "supervisor")
    
    # Define conditional edges from supervisor
    workflow.add_conditional_edges(
        "supervisor",
        lambda x: x["next"],
        {k: k for k in members} | {"FINISH": END}
    )
    
    workflow.set_entry_point("supervisor")
    
    return workflow
