"""
ResilienceAI — Multi-Agent Supply Chain Risk System
Run: python main.py
"""

import logging
import sys

from config import get_model, load_prompts

# Only warnings/errors to stderr; on exception full traceback is logged
logging.basicConfig(
    level=logging.WARNING,
    format="%(name)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)
from agents import (
    create_news_stats_agent,
    create_weather_disaster_agent,
    create_economy_agent,
    create_food_agent,
    create_political_agent,
    create_disease_agent,
    create_health_agent,
    create_economic_news_agent,
)
from langgraph_supervisor import create_supervisor
from langgraph.checkpoint.memory import InMemorySaver


# ============================================================
# BUILD ALL AGENTS
# ============================================================

print("\n" + "=" * 60)
print("  ResilienceAI -- Initializing Multi-Agent System")
print("=" * 60)

print("\nCreating agents...")
news_stats_agent = create_news_stats_agent()
weather_disaster_agent = create_weather_disaster_agent()
economy_agent = create_economy_agent()
food_agent = create_food_agent()
political_agent = create_political_agent()
disease_agent = create_disease_agent()
health_agent = create_health_agent()
economic_news_agent = create_economic_news_agent()
print("[OK] All 8 agents created!")


# ============================================================
# BUILD ORCHESTRATOR
# ============================================================

print("Building orchestrator...")
prompts = load_prompts()
model = get_model()

workflow = create_supervisor(
    agents=[
        news_stats_agent,
        weather_disaster_agent,
        economy_agent,
        food_agent,
        political_agent,
        disease_agent,
        health_agent,
        economic_news_agent,
    ],
    model=model,
    prompt=prompts['orchestrator'],
)

app = workflow.compile(checkpointer=InMemorySaver())
print("[OK] ResilienceAI ready!\n")


# ============================================================
# CHAT INTERFACE
# ============================================================

def _message_content(msg) -> str:
    """Get content from a message (dict or object)."""
    if isinstance(msg, dict):
        return (msg.get("content") or msg.get("text") or "").strip()
    return (getattr(msg, "content", None) or getattr(msg, "text", None) or "").strip()


def _is_assistant(msg) -> bool:
    """True if message is from assistant (not user)."""
    if isinstance(msg, dict):
        return (msg.get("role") or "").lower() == "assistant"
    return getattr(msg, "type", "") == "ai" or getattr(msg, "role", "").lower() == "assistant"


def ask(question: str, thread_id: str = "main"):
    result = app.invoke(
        {"messages": [{"role": "user", "content": question}]},
        config={"configurable": {"thread_id": thread_id}}
    )
    messages = result.get("messages") or []
    user_question = question.strip().lower()
    # Show last *assistant* reply, not last message (last might be the user message if supervisor finished without calling an agent)
    for msg in reversed(messages):
        if _is_assistant(msg):
            content = _message_content(msg)
            if content and content.strip().lower() != user_question:
                return content
    return "No response from agents. Try rephrasing or check that the supervisor routes to an agent."


def main():
    print("=" * 60)
    print("  ResilienceAI -- Supply Chain Risk Intelligence")
    print("  Agents: news_stats | weather_disaster | economy |")
    print("          food | political | disease | health | economic_news")
    print("  Data: 2000-2024 | 266 countries (Economic News: Real-time)")
    print("  Type 'quit' to exit")
    print("=" * 60)

    print("\nExample queries:")
    print('  → "What are the risks for India in 2022?"')
    print('  → "Compare Ukraine, Russia, Syria instability in 2022"')
    print('  → "Top 10 global hotspots in 2023"')
    print('  → "If Ukraine collapses in 2022, who else is at risk?"')
    print('  → "What disasters hit Pakistan in 2022 and how was the weather?"')
    print('  → "What is India\'s GDP trend from 2010 to 2022?"')
    print('  → "Which countries have weakest health systems?"')
    print('  → "What disease outbreaks happened in Africa in 2020?"')
    print('  → "Compare food production of India, China, Brazil in 2020"')
    print()

    query_count = 0

    while True:
        try:
            question = input("[?] Ask: ").strip()
            if not question:
                continue
            if question.lower() in ('quit', 'exit', 'q'):
                print("Goodbye!")
                break

            query_count += 1
            thread_id = f"session-{query_count}"

            print("\n[...] Analyzing...\n")
            response = ask(question, thread_id)
            print(f"[=] Response:\n{response}\n")
            print("-" * 60)

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            logger.exception("main: exception during ask")
            print(f"[!] Error: {e}\n")


if __name__ == "__main__":
    main()