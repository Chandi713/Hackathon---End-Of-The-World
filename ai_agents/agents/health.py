"""Health Agent — Healthcare capacity, expenditure, vaccination infrastructure"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

df = load_agent_data("health")


@tool
def get_health_capacity(country: str, year: Optional[int] = None) -> str:
    """Get healthcare capacity: health expenditure % GDP, vaccination coverage, outbreak burden."""
    data = filter_data(df, country=country, year=year)
    if data.empty: return f"No health data for '{country}'" + (f" in {year}" if year else "")
    result = {"country": country, "period": str(year) if year else "all available"}
    if 'health_expenditure_pct_gdp' in data.columns and data['health_expenditure_pct_gdp'].notna().any():
        result["expenditure_pct_gdp"] = round(float(data['health_expenditure_pct_gdp'].mean()),3)
    if 'vaccination_coverage_pct' in data.columns and data['vaccination_coverage_pct'].notna().any():
        result["vaccination_coverage_pct"] = round(float(data['vaccination_coverage_pct'].max()),2)
    if 'vaccination_capacity_daily' in data.columns and data['vaccination_capacity_daily'].notna().any():
        result["vaccination_daily_capacity"] = int(data['vaccination_capacity_daily'].max())
    if 'active_who_alerts' in data.columns and data['active_who_alerts'].notna().any():
        result["active_who_alerts"] = int(data['active_who_alerts'].sum())
    if 'outbreak_deaths' in data.columns and data['outbreak_deaths'].notna().any():
        result["outbreak_deaths"] = int(data['outbreak_deaths'].sum())
    return json.dumps(result, indent=2)


@tool
def find_weakest_health_systems(year: Optional[int] = None, top_n: int = 15) -> str:
    """Find countries with weakest healthcare systems (lowest expenditure, lowest vaccination)."""
    data = df.copy()
    if year: data = data[data['year'] == year]
    if data.empty or 'health_expenditure_pct_gdp' not in data.columns: return "No health expenditure data"
    weak = data.dropna(subset=['health_expenditure_pct_gdp']).groupby('country_name').agg(
        avg_expenditure=('health_expenditure_pct_gdp','mean')).sort_values('avg_expenditure').head(top_n).reset_index()
    return json.dumps({"year": year or "all", "weakest_systems": weak.to_dict('records')}, indent=2)


@tool
def compare_health_systems(countries: str, year: Optional[int] = None) -> str:
    """Compare healthcare capacity across countries."""
    results = []
    for c in [x.strip() for x in countries.split(',')]:
        data = filter_data(df, country=c, year=year)
        if data.empty: continue
        entry = {"country": c}
        if 'health_expenditure_pct_gdp' in data.columns and data['health_expenditure_pct_gdp'].notna().any():
            entry["expenditure_pct_gdp"] = round(float(data['health_expenditure_pct_gdp'].mean()),3)
        if 'vaccination_coverage_pct' in data.columns and data['vaccination_coverage_pct'].notna().any():
            entry["vaccination_pct"] = round(float(data['vaccination_coverage_pct'].max()),2)
        results.append(entry)
    return json.dumps({"year": year or "all", "comparison": results}, indent=2)


ALL_TOOLS = [get_health_capacity, find_weakest_health_systems, compare_health_systems]

def create_health_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="health_agent", prompt=prompts['health'])