"""Weather + Disaster Agent — ERA5 climate + EM-DAT disasters"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

weather_df = load_agent_data("weather")
disaster_df = load_agent_data("disaster")


@tool
def get_weather_conditions(country: str, year: Optional[int] = None) -> str:
    """Get climate conditions: temperature, precipitation, anomalies, drought, severity."""
    data = filter_data(weather_df, country=country, year=year)
    if data.empty: return f"No weather data for '{country}'" + (f" in {year}" if year else "")
    return json.dumps({"country": country,
        "period": str(year) if year else f"{int(data['year'].min())}-{int(data['year'].max())}",
        "temperature": {"avg_c": round(float(data['temp_mean'].mean()),2), "anomaly_c": round(float(data['temp_anomaly'].mean()),3),
            "anomaly_zscore": round(float(data['temp_anomaly_zscore'].mean()),3)},
        "precipitation": {"avg_monthly_mm": round(float(data['precip_total_mm'].mean()),2),
            "anomaly_zscore": round(float(data['precip_anomaly_zscore'].mean()),3)},
        "extremes": {"drought_index": round(float(data['drought_index'].mean()),3),
            "max_drought": round(float(data['drought_index'].max()),3),
            "heat_stress": round(float(data['heat_stress'].mean()),3),
            "severity": round(float(data['weather_severity'].mean()),3),
            "max_severity": round(float(data['weather_severity'].max()),3)}
    }, indent=2)


@tool
def get_disaster_history(country: str, year: Optional[int] = None) -> str:
    """Get disaster history: types, deaths, people affected, economic damage."""
    data = disaster_df[disaster_df['country_name'].str.contains(country, case=False, na=False)] if 'country_name' in disaster_df.columns else disaster_df[disaster_df['Country'].str.contains(country, case=False, na=False)] if 'Country' in disaster_df.columns else disaster_df
    yr_col = 'year' if 'year' in data.columns else 'Year'
    if year: data = data[data[yr_col] == int(year)]
    if data.empty: return f"No disaster data for '{country}'" + (f" in {year}" if year else "")
    dtype_col = 'Disaster Type' if 'Disaster Type' in data.columns else 'disaster_type'
    by_type = data.groupby(dtype_col).agg(events=('Total Events','sum'), deaths=('Total Deaths','sum'),
        affected=('Total Affected','sum'), damage=('Total Damage (USD, adjusted)','sum')).sort_values('events', ascending=False).reset_index()
    return json.dumps({"country": country,
        "summary": {"total_events": int(data['Total Events'].sum()) if data['Total Events'].notna().any() else 0,
            "total_deaths": int(data['Total Deaths'].sum()) if data['Total Deaths'].notna().any() else 0,
            "total_affected": int(data['Total Affected'].sum()) if data['Total Affected'].notna().any() else 0,
            "total_damage_usd": round(float(data['Total Damage (USD, adjusted)'].sum()),2) if data['Total Damage (USD, adjusted)'].notna().any() else 0},
        "by_type": by_type.to_dict('records')}, indent=2, default=str)


@tool
def find_extreme_weather_months(country: str, extreme_type: str = "overall", top_n: int = 10) -> str:
    """Find worst weather months. extreme_type: 'heat','drought','flood_risk','overall'"""
    data = filter_data(weather_df, country=country)
    if data.empty: return f"No weather data for '{country}'"
    col = {"heat":"temp_anomaly_zscore","drought":"drought_index","flood_risk":"precip_anomaly_zscore","overall":"weather_severity"}.get(extreme_type,"weather_severity")
    worst = data.nlargest(top_n, col)
    return json.dumps({"country": country, "extreme_type": extreme_type,
        "worst_months": worst[['year_month','year','month','temp_mean','temp_anomaly','precip_total_mm','drought_index','weather_severity']].to_dict('records')}, indent=2)


@tool
def find_disaster_prone_countries(year: int, disaster_type: Optional[str] = None, top_n: int = 15) -> str:
    """Most disaster-affected countries in a year. Optional: 'Flood','Drought','Storm','Earthquake','Epidemic'"""
    yr_col = 'year' if 'year' in disaster_df.columns else 'Year'
    data = disaster_df[disaster_df[yr_col] == year]
    dtype_col = 'Disaster Type' if 'Disaster Type' in data.columns else 'disaster_type'
    name_col = 'country_name' if 'country_name' in data.columns else 'Country'
    if disaster_type: data = data[data[dtype_col].str.contains(disaster_type, case=False, na=False)]
    if data.empty: return f"No disaster data for {year}"
    by_c = data.groupby([name_col]).agg(events=('Total Events','sum'), deaths=('Total Deaths','sum'),
        affected=('Total Affected','sum')).sort_values('events', ascending=False).head(top_n).reset_index()
    return json.dumps({"year": year, "type": disaster_type or "all", "countries": by_c.to_dict('records')}, indent=2, default=str)


@tool
def get_weather_trend(country: str, year_start: int, year_end: int, metric: str = "temp_anomaly") -> str:
    """Yearly weather trend. metric: 'temp_anomaly','temp_mean','precip_total_mm','drought_index','weather_severity'"""
    data = filter_data(weather_df, country=country, year_start=year_start, year_end=year_end)
    if data.empty: return f"No data for '{country}' {year_start}-{year_end}"
    yearly = data.groupby('year').agg(value=(metric, 'mean')).reset_index()
    direction = "worsening" if yearly['value'].iloc[-1] > yearly['value'].iloc[0] else "improving"
    return json.dumps({"country": country, "metric": metric, "trend": direction, "yearly": yearly.to_dict('records')}, indent=2)


@tool
def get_combined_risk(country: str, year: int) -> str:
    """Combined climate + disaster risk for a country in a year."""
    import numpy as np
    w = filter_data(weather_df, country=country, year=year)
    name_col = 'country_name' if 'country_name' in disaster_df.columns else 'Country'
    yr_col = 'year' if 'year' in disaster_df.columns else 'Year'
    e = disaster_df[(disaster_df[name_col].str.contains(country, case=False, na=False)) & (disaster_df[yr_col] == year)]
    result = {"country": country, "year": year}
    if not w.empty:
        result["climate"] = {"temp_anomaly": round(float(w['temp_anomaly'].mean()),3),
            "precip_anomaly": round(float(w['precip_anomaly'].mean()),3), "drought_index": round(float(w['drought_index'].mean()),3),
            "severity": round(float(w['weather_severity'].mean()),3)}
    if not e.empty:
        result["disasters"] = {"events": int(e['Total Events'].sum()) if e['Total Events'].notna().any() else 0,
            "deaths": int(e['Total Deaths'].sum()) if e['Total Deaths'].notna().any() else 0,
            "affected": int(e['Total Affected'].sum()) if e['Total Affected'].notna().any() else 0}
    w_sev = float(w['weather_severity'].mean()) if not w.empty else 0
    d_norm = min(int(e['Total Events'].sum())/10, 1) if not e.empty and e['Total Events'].notna().any() else 0
    result["combined_risk"] = round(min(1.0, w_sev*0.5 + d_norm*0.5), 4)
    return json.dumps(result, indent=2, default=str)


ALL_TOOLS = [get_weather_conditions, get_disaster_history, find_extreme_weather_months,
             find_disaster_prone_countries, get_weather_trend, get_combined_risk]

def create_weather_disaster_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="weather_disaster_agent", prompt=prompts['weather_disaster'])