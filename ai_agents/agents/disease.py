"""Disease Agent — Outbreaks, WHO alerts, COVID vaccination"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

df = load_agent_data("disease")


@tool
def get_disease_profile(country: str, year: Optional[int] = None) -> str:
    """Get disease/outbreak profile for a country: outbreaks, cases, deaths, CFR, vaccination status."""
    data = filter_data(df, country=country, year=year)
    if data.empty: return f"No disease data for '{country}'" + (f" in {year}" if year else "")
    result = {"country": country, "period": str(year) if year else "all available"}
    if 'num_outbreaks' in data.columns and data['num_outbreaks'].notna().any():
        result["outbreaks"] = {"count": int(data['num_outbreaks'].sum()),
            "diseases": data['diseases_list'].dropna().iloc[0] if data['diseases_list'].notna().any() else "N/A",
            "cases": int(data['total_confirmed_cases'].sum()) if data['total_confirmed_cases'].notna().any() else 0,
            "deaths": int(data['total_outbreak_deaths'].sum()) if data['total_outbreak_deaths'].notna().any() else 0,
            "avg_cfr": round(float(data['avg_cfr'].mean()),2) if data['avg_cfr'].notna().any() else None}
    if 'total_vaccinations' in data.columns and data['total_vaccinations'].notna().any():
        result["vaccination"] = {"total": int(data['total_vaccinations'].max()),
            "fully_vaccinated_pct": round(float(data['fully_vaccinated_per_hundred'].max()),2) if 'fully_vaccinated_per_hundred' in data.columns and data['fully_vaccinated_per_hundred'].notna().any() else None}
    if 'who_alerts' in data.columns and data['who_alerts'].notna().any():
        result["who_alerts"] = {"count": int(data['who_alerts'].sum()),
            "high_risk": int(data['who_high_risk_alerts'].sum()) if 'who_high_risk_alerts' in data.columns else 0}
    return json.dumps(result, indent=2, default=str)


@tool
def find_outbreak_hotspots(year: Optional[int] = None, top_n: int = 15) -> str:
    """Find countries with most disease outbreaks."""
    data = df.copy()
    if year: data = data[data['year'] == year]
    if data.empty: return "No outbreak data available"
    if 'num_outbreaks' in data.columns:
        hotspots = data.groupby('country_name').agg(outbreaks=('num_outbreaks','sum'),
            deaths=('total_outbreak_deaths','sum')).sort_values('outbreaks', ascending=False).head(top_n).reset_index()
    else:
        hotspots = data.groupby('country_name').size().reset_index(name='records').nlargest(top_n,'records')
    return json.dumps({"year": year or "all", "hotspots": hotspots.to_dict('records')}, indent=2, default=str)


@tool
def get_vaccination_coverage(country: str) -> str:
    """Get COVID vaccination coverage and capacity for a country."""
    data = filter_data(df, country=country)
    if data.empty or 'total_vaccinations' not in data.columns: return f"No vaccination data for '{country}'"
    latest = data.dropna(subset=['total_vaccinations']).sort_values('year', ascending=False)
    if latest.empty: return f"No vaccination data for '{country}'"
    row = latest.iloc[0]
    return json.dumps({"country": country, "latest_year": int(row['year']),
        "total_vaccinations": int(row['total_vaccinations']) if pd.notna(row['total_vaccinations']) else None,
        "fully_vaccinated_pct": round(float(row['fully_vaccinated_per_hundred']),2) if 'fully_vaccinated_per_hundred' in row and pd.notna(row.get('fully_vaccinated_per_hundred')) else None,
        "max_daily_capacity": int(row['max_daily_vaccinations']) if 'max_daily_vaccinations' in row and pd.notna(row.get('max_daily_vaccinations')) else None,
    }, indent=2)


import pandas as pd
ALL_TOOLS = [get_disease_profile, find_outbreak_hotspots, get_vaccination_coverage]

def create_disease_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="disease_agent", prompt=prompts['disease'])