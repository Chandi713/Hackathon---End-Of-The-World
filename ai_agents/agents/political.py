"""Political Agent — Political stability from GDELT subset"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

df = load_agent_data("political")


@tool
def get_political_stability(country: str, year: Optional[int] = None) -> str:
    """Get political stability metrics: protests, sanctions, threats, cooperation ratio, tension score."""
    data = filter_data(df, country=country, year=year)
    if data.empty: return f"No political data for '{country}'" + (f" in {year}" if year else "")
    return json.dumps({"country": country,
        "period": str(year) if year else f"{int(data['year'].min())}-{int(data['year'].max())}",
        "events": {"protests": int(data['protest_events'].sum()), "sanctions": int(data['sanctions_coercion_events'].sum()),
            "threats": int(data['threat_events'].sum()), "diplomatic_tensions": int(data['diplomatic_tension_events'].sum()),
            "force_posture": int(data['force_posture_events'].sum())},
        "indices": {"instability": round(float(data['instability_index'].mean()),4),
            "conflict_ratio": round(float(data['conflict_ratio'].mean()),4),
            "political_tension": round(float(data['political_tension_score'].mean()),4) if 'political_tension_score' in data.columns else None,
            "cooperation_vs_conflict": round(float(data['cooperation_vs_conflict'].mean()),4) if 'cooperation_vs_conflict' in data.columns else None,
            "goldstein": round(float(data['avg_goldstein_scale'].mean()),3),
            "tone": round(float(data['avg_tone'].mean()),3)}
    }, indent=2)


@tool
def compare_political_stability(countries: str, year: int) -> str:
    """Compare political stability across countries."""
    results = []
    for c in [x.strip() for x in countries.split(',')]:
        data = filter_data(df, country=c, year=year)
        if data.empty: continue
        results.append({"country": c, "protests": int(data['protest_events'].sum()),
            "sanctions": int(data['sanctions_coercion_events'].sum()),
            "instability": round(float(data['instability_index'].mean()),4),
            "goldstein": round(float(data['avg_goldstein_scale'].mean()),3)})
    results.sort(key=lambda x: x['instability'], reverse=True)
    return json.dumps({"year": year, "comparison": results}, indent=2)


@tool
def get_political_trend(country: str, year_start: int, year_end: int) -> str:
    """Political stability trend over time."""
    data = filter_data(df, country=country, year_start=year_start, year_end=year_end)
    if data.empty: return f"No data for '{country}' {year_start}-{year_end}"
    yearly = data.groupby('year').agg(instability=('instability_index','mean'),
        protests=('protest_events','sum'), sanctions=('sanctions_coercion_events','sum')).reset_index()
    direction = "destabilizing" if yearly['instability'].iloc[-1] > yearly['instability'].iloc[0] else "stabilizing"
    return json.dumps({"country": country, "trend": direction, "yearly": yearly.to_dict('records')}, indent=2)


ALL_TOOLS = [get_political_stability, compare_political_stability, get_political_trend]

def create_political_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="political_agent", prompt=prompts['political'])