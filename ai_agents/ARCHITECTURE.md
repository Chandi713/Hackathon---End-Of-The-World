# ResilienceAI — Architecture & Integration Guide

Short reference for how the multi-agent system works and how to integrate it into a full stack.

---

## 1. What It Does

ResilienceAI is a **supply chain risk intelligence** system: the user asks a question (e.g. “Compare food production of India, China, Brazil in 2020”), a **supervisor** routes the conversation to the right **agent** (e.g. food_agent), the agent uses **tools** over CSV/data and an LLM to answer, and the **last assistant message** is returned as the response.

- **Data:** 266 countries, 2000–2024 (CSV in `output/`); economic_news can use real-time/search.
- **LLM:** Remote Blackwell only — OpenAI-style `/v1/chat/completions` endpoint (e.g. `google/gemma-3-12b-it`). URL and model in `.env`; `config.get_model()` returns a single `RemoteBlackwellChatModel`.

---

## 2. High-Level Architecture

```
User question
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPERVISOR (langgraph_supervisor)                           │
│  • Runs orchestrator prompt + same LLM                      │
│  • Decides: which agent next, or FINISH                     │
│  • Routing: model text (e.g. "food_agent") + keyword rules  │
└─────────────────────────────────────────────────────────────┘
     │
     │  next = food_agent | economy_agent | ... | FINISH
     ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENTS (one per domain)                                     │
│  • Each = LangGraph ReAct agent: LLM + tools + prompt       │
│  • Tools read/filter CSV (config.load_agent_data, filter)    │
│  • Returns AIMessage → back to supervisor                   │
└─────────────────────────────────────────────────────────────┘
     │
     │  supervisor again → next agent or FINISH
     ▼
  FINISH → response = last assistant message
```

- **Orchestrator** = the **prompt** (in `prompts.yaml` under `orchestrator`) that tells the LLM how to route (e.g. “food production → food_agent”).
- **Supervisor** = the **code** in `langgraph_supervisor.py` that runs that prompt, parses the model’s reply or uses keyword fallback, and moves the graph to the chosen agent or FINISH.

---

## 3. Main Components

| Component | Role |
|-----------|------|
| **main.py** | Builds all agents, builds supervisor workflow, compiles graph with checkpointer. Exposes `ask(question, thread_id)` for the CLI (and for your backend to call). |
| **config.py** | Shared config: `DATA_FILES`, `load_agent_data()`, `filter_data()`, `get_model()` (Remote Blackwell only), `load_prompts()`. LLM = `RemoteBlackwellChatModel` — LangChain-compatible wrapper for a remote OpenAI-style chat completions API. |
| **langgraph_supervisor.py** | Defines the supervisor graph: one “supervisor” node (prompt + model + parse_route + keyword fallback), one node per agent, edges agent→supervisor, conditional edges supervisor→agent or FINISH. |
| **agents/** | One module per agent (e.g. `food.py`, `economy.py`). Each exports `create_*_agent()` which returns a ReAct agent (model + tools + prompt from `prompts.yaml`). |
| **prompts.yaml** | Orchestrator prompt (`orchestrator`) and per-agent prompts (`food`, `economy`, `news_stats`, etc.). |
| **output/** | CSV data files per agent (e.g. `agent_food.csv`, `agent_economy.csv`). Paths in `config.DATA_FILES`. |

---

## 4. Data Flow (Single Question)

1. **Entry:** `app.invoke({"messages": [{"role": "user", "content": question}]}, config={"configurable": {"thread_id": thread_id}})`
2. **State:** `{ "messages": [...], "next": "food_agent" | "FINISH" | ... }`. Messages are appended (reducer: add).
3. **Supervisor runs:**  
   - System prompt (orchestrator) + conversation so far + “Reply with one word: food_agent, economy_agent, …, FINISH”.  
   - Same LLM (Remote Blackwell, e.g. Gemma) is called.  
   - Reply is parsed for an agent name (or "FINISH"); if none found, **keyword fallback** on the last user message (e.g. “food”, “production” → food_agent).  
   - State update: `{"next": "food_agent"}` or `{"next": "FINISH"}`.
4. **If next = agent:** That agent’s node runs (ReAct: LLM + tools over CSV). Agent appends an AIMessage to `messages`, then edge goes back to supervisor.
5. **If next = FINISH:** Graph ends. Caller uses **last assistant message** in `result["messages"]` as the reply (see `main.ask()`).
6. **Response extraction:** `ask()` scans `result["messages"]` from the end, returns the first **assistant** message with content (and skips content that only echoes the user). If none, returns a short “No response from agents” message.

---

## 5. Routing (How the Correct Agent Is Chosen)

- **Model reply:** Supervisor asks the LLM to reply with a single word from the list (e.g. `food_agent`, `economy_agent`, `FINISH`). Code parses the reply for these strings (longer names checked first to avoid e.g. matching “news” in “economic_news_agent” wrongly).
- **Keyword fallback:** If the model does not output a valid agent (or says FINISH when we still want to route), the **last user message** is checked against ordered keyword rules in `langgraph_supervisor.py` (e.g. “food production”, “crop”, “agriculture” → food_agent; “economic news”, “real-time” → economic_news_agent; “gdp”, “trade” → economy_agent). This runs whenever the supervisor would otherwise set `next = "FINISH"`, so routing stays robust even when the LLM doesn’t name an agent.

---

## 6. Agents and Data

- **Agent list:** news_stats, weather_disaster, economy, food, political, disease, health, economic_news (8 agents).
- **Per-agent:** Each has a prompt in `prompts.yaml` and a set of tools. Tools use `config.load_agent_data(agent_name)` and `config.filter_data(df, country=..., year=...)` to read/filter CSVs from `output/`.
- **economic_news_agent:** Can use real-time / search; others use the static CSV datasets (2000–2024, 266 countries where applicable).

---

## 7. Integration for a Full Stack

**Single entry point for “ask a question and get an answer”:**

- **Build once at startup:**  
  - Create all agents (e.g. `create_food_agent()`, …).  
  - `workflow = create_supervisor(agents=[...], model=get_model(), prompt=prompts['orchestrator'])`  
  - `app = workflow.compile(checkpointer=InMemorySaver())`  
  (Same as in `main.py`.)

- **Per request:**  
  - `result = app.invoke(  
      {"messages": [{"role": "user", "content": user_question}]},  
      config={"configurable": {"thread_id": thread_id}}  
    )`  
  - `thread_id`: use a stable id per user/session if you want conversation memory; otherwise a new id per request is fine.

- **Get reply text:**  
  - Same logic as `ask()` in `main.py`: from `result["messages"]`, take the **last assistant message** (by role/type), get its `content` (support both dict and object messages). If that content is empty or equals the user question (echo), treat as no response and return a fallback string.

**Minimal API surface:**

```python
# At startup
from config import get_model, load_prompts
from agents import create_news_stats_agent, create_weather_disaster_agent, create_economy_agent, create_food_agent, create_political_agent, create_disease_agent, create_health_agent, create_economic_news_agent
from langgraph_supervisor import create_supervisor
from langgraph.checkpoint.memory import InMemorySaver

prompts = load_prompts()
model = get_model()
workflow = create_supervisor(
    agents=[news_stats_agent, weather_disaster_agent, economy_agent, food_agent, political_agent, disease_agent, health_agent, economic_news_agent],
    model=model,
    prompt=prompts['orchestrator'],
)
app = workflow.compile(checkpointer=InMemorySaver())

# Per request
def ask(question: str, thread_id: str = "default"):
    result = app.invoke(
        {"messages": [{"role": "user", "content": question}]},
        config={"configurable": {"thread_id": thread_id}}
    )
    # Return last assistant message content (see main.py for full logic)
    messages = result.get("messages") or []
    for msg in reversed(messages):
        if _is_assistant(msg):
            content = _message_content(msg)
            if content and content.strip().lower() != question.strip().lower():
                return content
    return "No response from agents. Try rephrasing or check that the supervisor routes to an agent."
```

Your backend (FastAPI, Flask, etc.) can call `ask(question, thread_id)` and return that string (or stream it if you add streaming later).

---

## 8. Environment

- **.env:**  
  - `REMOTE_BLACKWELL_URL` — OpenAI-style chat completions endpoint (e.g. `http://129.10.224.226:8000/v1/chat/completions`).  
  - `REMOTE_BLACKWELL_MODEL` — Model name (e.g. `google/gemma-3-12b-it`).  
  - (Any other keys your agents need, e.g. for economic_news search.)

---

## 9. File Layout (Relevant to Integration)

```
├── main.py                 # Builds app, defines ask(); CLI loop
├── config.py               # DATA_FILES, get_model(), load_prompts(), load_agent_data(), filter_data()
├── langgraph_supervisor.py # create_supervisor(), routing rules, supervisor node
├── prompts.yaml            # orchestrator + per-agent prompts
├── agents/
│   ├── __init__.py         # Exports create_*_agent
│   ├── food.py             # create_food_agent(), tools, prompt key 'food'
│   ├── economy.py
│   ├── news_stats.py
│   ├── weather_disaster.py
│   ├── political.py
│   ├── disease.py
│   ├── health.py
│   └── economic_news.py
├── output/                 # CSV data (agent_food.csv, agent_economy.csv, ...)
├── .env                    # REMOTE_BLACKWELL_URL, REMOTE_BLACKWELL_MODEL
├── ARCHITECTURE.md         # This file
└── FIXES.md                # Notes on past fixes (dict vs object, routing)
```

---

## 10. Summary

- **LLM** = Remote Blackwell only (`config.get_model()` → `RemoteBlackwellChatModel`). Configure via `REMOTE_BLACKWELL_URL` and `REMOTE_BLACKWELL_MODEL` in `.env`.
- **Orchestrator** = routing instructions (prompt). **Supervisor** = graph + code that runs those instructions and chooses the next agent or FINISH.
- **Routing** = model reply parsing + keyword fallback on the last user message so the right agent is chosen even when the LLM doesn’t output an agent name.
- **Response** = last assistant message in graph state after FINISH; your backend should use the same “last assistant message” logic as `main.ask()` when integrating.

Use `app.invoke(...)` with a messages list and a thread_id; read the last assistant message from `result["messages"]` for the reply to show in your full stack.
