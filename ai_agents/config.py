"""
ResilienceAI — Shared Config
"""

import logging
import os

logger = logging.getLogger(__name__)
import yaml
import pandas as pd
import requests
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatResult, ChatGeneration
from datetime import datetime
from typing import Any, List, Optional, Dict, Sequence, Union

load_dotenv()

# Set to True to log LLM input (provider, model, message count, sizes, preview) before each call
LLM_DEBUG_INPUT = os.getenv("LLM_DEBUG_INPUT", "1").strip().lower() in ("1", "true", "yes")
if LLM_DEBUG_INPUT:
    logging.getLogger(__name__).setLevel(logging.INFO)


def _log_llm_input(provider: str, model: str, messages: List[Dict[str, Any]], system_chars: int = 0):
    """Log what is being sent to the LLM for debugging (sizes and short preview)."""
    if not LLM_DEBUG_INPUT:
        return
    total_chars = system_chars + sum(len(m.get("content") or "") for m in messages)
    est_tokens = (total_chars // 4) + 1
    logger.info(
        "[LLM input] provider=%s model=%s messages=%s system_chars=%s total_chars=%s est_tokens≈%s",
        provider, model, len(messages), system_chars, total_chars, est_tokens,
    )
    for i, m in enumerate(messages):
        content = m.get("content") or ""
        preview = (content[:200] + "…") if len(content) > 200 else content
        preview = preview.replace("\n", " ")
        logger.info("[LLM input]   [%s] role=%s len=%s | %s", i, m.get("role"), len(content), preview)
    if system_chars:
        logger.info("[LLM input]   system total chars=%s", system_chars)


# ============================================================
# DATA PATHS
# ============================================================

DATA_DIR = os.path.join(os.path.dirname(__file__), "output")

DATA_FILES = {
    "news_stats": os.path.join(DATA_DIR, "agent_news_stats.csv"),
    "weather": os.path.join(DATA_DIR, "agent_weather.csv"),
    "disaster": os.path.join(DATA_DIR, "agent_disaster.csv"),
    "economy": os.path.join(DATA_DIR, "agent_economy.csv"),
    "food": os.path.join(DATA_DIR, "agent_food.csv"),
    "political": os.path.join(DATA_DIR, "agent_political.csv"),
    "disease": os.path.join(DATA_DIR, "agent_disease.csv"),
    "health": os.path.join(DATA_DIR, "agent_health.csv"),
}


# ============================================================
# MODEL — Remote Blackwell (OpenAI-compatible /v1/chat/completions)
# ============================================================

class RemoteBlackwellChatModel(BaseChatModel):
    """LangChain-compatible chat model calling remote Blackwell endpoint (OpenAI-style /v1/chat/completions)."""
    url: str = ""
    model_name: str = "google/gemma-3-12b-it"

    def __init__(self, url: str, model: str = "google/gemma-3-12b-it"):
        super().__init__()
        self.url = url.rstrip("/")
        self.model_name = model

    @property
    def _llm_type(self) -> str:
        return "remote-blackwell"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        def _content(msg):
            if isinstance(msg, dict):
                return msg.get("content") or msg.get("text") or ""
            return getattr(msg, "content", None) or getattr(msg, "text", None) or ""

        # What the model receives (input): prompt (system + first user) + conversation (user/assistant turns).
        # Assistant turns can be long: they include agent tool outputs (e.g. JSON/summaries from CSV data).
        # The CSV files on disk are read by agent tools; the tools return text; that text is what ends up in the conversation, not the raw CSV.
        # Blackwell API requires alternating user/assistant only (no system). Merge system into first user; then collapse consecutive same-role.
        system_parts = []
        raw = []
        for m in messages:
            if isinstance(m, dict):
                role = (m.get("role") or "user").lower()
                if role not in ("system", "user", "assistant"):
                    role = "user"
                if role == "system":
                    system_parts.append(_content(m))
                else:
                    raw.append({"role": role, "content": _content(m)})
            elif isinstance(m, SystemMessage):
                system_parts.append(_content(m))
            elif isinstance(m, HumanMessage):
                raw.append({"role": "user", "content": _content(m)})
            elif isinstance(m, AIMessage):
                raw.append({"role": "assistant", "content": _content(m)})

        if system_parts:
            prefix = "System instruction: " + "\n".join(system_parts).strip() + "\n\n"
            if raw and raw[0]["role"] == "user":
                raw[0]["content"] = prefix + (raw[0].get("content") or "")
            else:
                raw.insert(0, {"role": "user", "content": prefix.strip()})

        # Collapse consecutive same-role messages so we get strict user/assistant alternation
        api_messages = []
        for m in raw:
            if api_messages and api_messages[-1]["role"] == m["role"]:
                api_messages[-1]["content"] = (api_messages[-1].get("content") or "") + "\n\n" + (m.get("content") or "")
            else:
                api_messages.append({"role": m["role"], "content": m.get("content") or ""})

        # Must start with user; if only assistant(s), prepend a user turn
        if api_messages and api_messages[0]["role"] != "user":
            api_messages.insert(0, {"role": "user", "content": "Continue."})

        def _est_tokens(text):
            return max(1, (len(text or "") // 4))

        # Model context is 8192. Input = prompt (system+first user) + conversation (user/assistant turns; assistant turns can contain long CSV-derived tool output). Trim if over limit.
        max_input_tokens = 8192 - 1024
        total_tokens = sum(_est_tokens(m.get("content")) for m in api_messages)
        if total_tokens > max_input_tokens:
            # Keep first message (system + first user); cap its size. Then keep last N messages to fit.
            first = api_messages[0]
            first_content = (first.get("content") or "")[:24000]
            first_tokens = _est_tokens(first_content)
            rest = api_messages[1:]
            trimmed_rest = []
            remaining = max_input_tokens - first_tokens
            for m in reversed(rest):
                content = (m.get("content") or "")[: (remaining * 4)]
                t = _est_tokens(content)
                if t > remaining:
                    break
                trimmed_rest.append({"role": m["role"], "content": content})
                remaining -= t
            api_messages = [{"role": first["role"], "content": first_content}] + list(reversed(trimmed_rest))
            # Re-enforce alternation after trim (trimmed list can have consecutive same role)
            collapsed = []
            for m in api_messages:
                if collapsed and collapsed[-1]["role"] == m["role"]:
                    collapsed[-1]["content"] = (collapsed[-1].get("content") or "") + "\n\n" + (m.get("content") or "")
                else:
                    collapsed.append({"role": m["role"], "content": m.get("content") or ""})
            if collapsed and collapsed[0]["role"] != "user":
                collapsed.insert(0, {"role": "user", "content": "Continue."})
            api_messages = collapsed

        # max_tokens must fit in 8192 context: set to remaining room
        input_tokens = sum(_est_tokens(m.get("content")) for m in api_messages)
        max_output = max(256, 8192 - input_tokens - 50)
        max_tokens = min(1024, max_output)

        _log_llm_input("RemoteBlackwell", self.model_name, api_messages, system_chars=0)

        headers = {"Content-Type": "application/json"}
        payload = {
            "model": self.model_name,
            "messages": api_messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }
        try:
            resp = requests.post(self.url, headers=headers, json=payload, timeout=120)
            resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Error: No choices in response."))])
            msg = choices[0].get("message") or {}
            content = msg.get("content") or msg.get("text") or ""
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])
        except requests.exceptions.HTTPError as e:
            err = e.response.text if e.response is not None else str(e)
            logger.exception("config._generate: Remote Blackwell API failed: %s", err)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=f"Error: {str(e)}"))])
        except Exception as e:
            logger.exception("config._generate: Remote Blackwell API or response handling failed: %s", e)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=f"Error: {str(e)}"))])

    def bind_tools(self, tools: Sequence[Union[Dict[str, Any], Any]], **kwargs: Any) -> BaseChatModel:
        """Tools not sent; routing uses prompt + keyword fallback."""
        return self


def get_model():
    """Use Remote Blackwell only (OpenAI-style /v1/chat/completions)."""
    url = os.getenv("REMOTE_BLACKWELL_URL", "http://129.10.224.226:8000/v1/chat/completions").strip()
    model = os.getenv("REMOTE_BLACKWELL_MODEL", "google/gemma-3-12b-it").strip()
    return RemoteBlackwellChatModel(url=url, model=model or "google/gemma-3-12b-it")

# ============================================================
# PROMPTS
# ============================================================

def load_prompts():
    prompts_path = os.path.join(os.path.dirname(__file__), "prompts.yaml")
    with open(prompts_path, 'r') as f:
        return yaml.safe_load(f)


# ============================================================
# SHARED DATA LOADER
# ============================================================

_data_cache = {}

def load_agent_data(agent_name: str) -> pd.DataFrame:
    """Load CSV for an agent with caching."""
    if agent_name not in _data_cache:
        path = DATA_FILES.get(agent_name)
        if path and os.path.exists(path):
            df = pd.read_csv(path, low_memory=False)
            # Standardize year columns
            for col in ['year', 'Year']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            for col in ['month']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            _data_cache[agent_name] = df
            print(f"  Loaded {agent_name}: {df.shape}")
        else:
            print(f"  ⚠ Data not found for {agent_name}: {path}")
            _data_cache[agent_name] = pd.DataFrame()
    return _data_cache[agent_name]


# ============================================================
# SHARED FILTER HELPER
# ============================================================

def filter_data(df, country=None, year=None, year_start=None, year_end=None,
                country_col='country_name', code_col='country_code', year_col='year'):
    """Universal filter for any agent dataframe."""
    result = df.copy()
    if country:
        name_match = result[result[country_col].str.contains(country, case=False, na=False)] if country_col in result.columns else pd.DataFrame()
        code_match = result[result[code_col] == country.upper()] if code_col in result.columns else pd.DataFrame()
        result = name_match if not name_match.empty else code_match
    if year:
        result = result[result[year_col] == int(year)]
    if year_start and year_end:
        result = result[(result[year_col] >= int(year_start)) & (result[year_col] <= int(year_end))]
    return result