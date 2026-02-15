"""News Stats Agent — GDELT event analysis"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

df = load_agent_data("news_stats")


@tool
def get_country_event_stats(country: str, year: Optional[int] = None) -> str:
    """Get news/event statistics for a country: events, war, protests, sanctions, tone, instability."""
    data = filter_data(df, country=country, year=year)
    if data.empty:
        return f"No GDELT data for '{country}'" + (f" in {year}" if year else "")
    return json.dumps({
        "country": country,
        "period": str(year) if year else f"{int(data['year'].min())}-{int(data['year'].max())}",
        "months": len(data),
        "events": {k: int(data[f'{k}_events'].sum()) if f'{k}_events' in data.columns else int(data.get(k, 0))
                   for k in ['total', 'war', 'protest', 'sanctions_coercion', 'humanitarian_aid', 'threat', 'diplomatic_tension']
                   if f'{k}_events' in data.columns or k == 'total'},
        "severity": {
            "avg_goldstein": round(float(data['avg_goldstein_scale'].mean()), 3),
            "avg_tone": round(float(data['avg_tone'].mean()), 3),
            "total_mentions": int(data['total_mentions'].sum()),
            "severe_events": int(data['severe_negative_events'].sum()),
        },
        "risk": {
            "avg_instability": round(float(data['instability_index'].mean()), 4),
            "max_instability": round(float(data['instability_index'].max()), 4),
            "avg_conflict_ratio": round(float(data['conflict_ratio'].mean()), 4),
        }
    }, indent=2)


@tool
def find_high_risk_periods(country: str, risk_type: str = "instability", top_n: int = 10) -> str:
    """Find most dangerous months. risk_type: 'instability','conflict','sanctions','humanitarian'"""
    data = filter_data(df, country=country)
    if data.empty: return f"No data for '{country}'"
    col = {"instability": "instability_index", "conflict": "war_events",
           "sanctions": "sanctions_coercion_events", "humanitarian": "humanitarian_aid_events"}.get(risk_type, "instability_index")
    worst = data.nlargest(top_n, col)
    return json.dumps({"country": country, "risk_type": risk_type,
        "top_periods": worst[['year_month','year','month','war_events','protest_events',
            'sanctions_coercion_events','humanitarian_aid_events','instability_index',
            'avg_goldstein_scale','avg_tone']].to_dict('records')}, indent=2)


@tool
def compare_countries_risk(countries: str, year: int) -> str:
    """Compare risk across countries. countries: comma-separated e.g. 'India,Pakistan,China'"""
    results = []
    for c in [x.strip() for x in countries.split(',')]:
        data = filter_data(df, country=c, year=year)
        if data.empty: continue
        results.append({"country": c, "total_events": int(data['total_events'].sum()),
            "war_events": int(data['war_events'].sum()), "protest_events": int(data['protest_events'].sum()),
            "sanctions": int(data['sanctions_coercion_events'].sum()),
            "avg_instability": round(float(data['instability_index'].mean()), 4),
            "avg_goldstein": round(float(data['avg_goldstein_scale'].mean()), 3)})
    results.sort(key=lambda x: x['avg_instability'], reverse=True)
    return json.dumps({"year": year, "comparison": results}, indent=2)


@tool
def get_risk_trend(country: str, year_start: int, year_end: int, metric: str = "instability_index") -> str:
    """Yearly trend of a risk metric."""
    data = filter_data(df, country=country, year_start=year_start, year_end=year_end)
    if data.empty: return f"No data for '{country}' {year_start}-{year_end}"
    yearly = data.groupby('year').agg(value=(metric, 'mean')).reset_index()
    direction = "increasing" if yearly['value'].iloc[-1] > yearly['value'].iloc[0] else "decreasing"
    return json.dumps({"country": country, "metric": metric, "trend": direction,
                        "yearly": yearly.to_dict('records')}, indent=2)


@tool
def find_global_hotspots(year: int, metric: str = "instability_index", top_n: int = 15) -> str:
    """Top N most at-risk countries globally for a year."""
    data = df[df['year'] == year]
    if data.empty: return f"No data for {year}"
    agg = 'mean' if metric in ['instability_index','conflict_ratio'] else 'sum'
    h = data.groupby(['country_code','country_name']).agg(risk=(metric, agg), events=('total_events','sum')).reset_index()
    h = h.dropna(subset=['country_name']).nlargest(top_n, 'risk')
    return json.dumps({"year": year, "hotspots": h.to_dict('records')}, indent=2, default=str)


@tool
def find_cascade_risk(trigger_country: str, year: int, top_n: int = 10) -> str:
    """Which countries are at risk if trigger_country has a crisis?"""
    trigger = filter_data(df, country=trigger_country, year=year)
    if trigger.empty: return f"No data for '{trigger_country}' in {year}"
    t_inst = float(trigger['instability_index'].mean())
    t_conf = float(trigger['conflict_ratio'].mean())
    t_hum = float(trigger['humanitarian_aid_events'].sum())
    all_c = df[df['year'] == year].groupby(['country_code','country_name']).agg(
        instability=('instability_index','mean'), conflict=('conflict_ratio','mean'),
        humanitarian=('humanitarian_aid_events','sum'), wars=('war_events','sum')).reset_index().dropna(subset=['country_name'])
    all_c['cascade_score'] = (0.4*(all_c['instability']/max(t_inst,0.001)).clip(0,3) +
        0.3*(all_c['conflict']/max(t_conf,0.001)).clip(0,3) + 0.3*(all_c['humanitarian']/max(t_hum,1)).clip(0,3))
    cascade = all_c[~all_c['country_name'].str.contains(trigger_country, case=False, na=False)].nlargest(top_n, 'cascade_score')
    return json.dumps({"trigger": trigger_country, "year": year,
        "at_risk": cascade[['country_name','instability','humanitarian','cascade_score']].to_dict('records')}, indent=2, default=str)


ALL_TOOLS = [get_country_event_stats, find_high_risk_periods, compare_countries_risk,
             get_risk_trend, find_global_hotspots, find_cascade_risk]

def create_news_stats_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="news_stats_agent", prompt=prompts['news_stats'])