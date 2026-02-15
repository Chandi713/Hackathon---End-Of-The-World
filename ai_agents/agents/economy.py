"""Economy Agent — GDP, trade, inflation, commodity prices, import dependencies"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

df = load_agent_data("economy")


@tool
def get_economic_indicators(country: str, year: Optional[int] = None) -> str:
    """Get economic indicators: GDP, trade %, inflation, exchange rate, commodity exposure."""
    data = filter_data(df, country=country, year=year, code_col='iso3')
    if data.empty: return f"No economic data for '{country}'" + (f" in {year}" if year else "")
    return json.dumps({"country": country,
        "period": str(year) if year else f"{int(data['year'].min())}-{int(data['year'].max())}",
        "gdp": {"per_capita_ppp": round(float(data['gdp_per_capita_ppp'].mean()),2) if 'gdp_per_capita_ppp' in data.columns and data['gdp_per_capita_ppp'].notna().any() else None,
                "total_nominal": round(float(data['gdp_total_nominal'].mean()),2) if 'gdp_total_nominal' in data.columns and data['gdp_total_nominal'].notna().any() else None},
        "trade": {"trade_pct_gdp": round(float(data['trade_pct_gdp'].mean()),2) if 'trade_pct_gdp' in data.columns and data['trade_pct_gdp'].notna().any() else None,
                  "current_account_balance": round(float(data['current_account_balance'].mean()),2) if 'current_account_balance' in data.columns and data['current_account_balance'].notna().any() else None},
        "monetary": {"inflation_pct": round(float(data['inflation_cpi_annual_pct'].mean()),2) if 'inflation_cpi_annual_pct' in data.columns and data['inflation_cpi_annual_pct'].notna().any() else None,
                     "exchange_rate": round(float(data['exchange_rate_lcu_per_usd'].mean()),4) if 'exchange_rate_lcu_per_usd' in data.columns and data['exchange_rate_lcu_per_usd'].notna().any() else None},
        "import_risk": {"avg_hhi": round(float(data['avg_hhi_concentration'].mean()),2) if 'avg_hhi_concentration' in data.columns and data['avg_hhi_concentration'].notna().any() else None,
                        "high_risk_imports": int(data['num_high_risk_imports'].sum()) if 'num_high_risk_imports' in data.columns and data['num_high_risk_imports'].notna().any() else None}
    }, indent=2)


@tool
def get_economic_trend(country: str, year_start: int, year_end: int, metric: str = "gdp_per_capita_ppp") -> str:
    """Yearly economic trend. metric: 'gdp_per_capita_ppp','inflation_cpi_annual_pct','trade_pct_gdp','exchange_rate_lcu_per_usd'"""
    data = filter_data(df, country=country, year_start=year_start, year_end=year_end, code_col='iso3')
    if data.empty or metric not in data.columns: return f"No data for '{country}' {year_start}-{year_end}"
    yearly = data.groupby('year').agg(value=(metric, 'mean')).reset_index()
    direction = "increasing" if yearly['value'].iloc[-1] > yearly['value'].iloc[0] else "decreasing"
    return json.dumps({"country": country, "metric": metric, "trend": direction, "yearly": yearly.to_dict('records')}, indent=2)


@tool
def compare_economies(countries: str, year: int) -> str:
    """Compare economic indicators across countries."""
    results = []
    for c in [x.strip() for x in countries.split(',')]:
        data = filter_data(df, country=c, year=year, code_col='iso3')
        if data.empty: continue
        results.append({"country": c,
            "gdp_per_capita": round(float(data['gdp_per_capita_ppp'].mean()),2) if data['gdp_per_capita_ppp'].notna().any() else None,
            "inflation": round(float(data['inflation_cpi_annual_pct'].mean()),2) if data['inflation_cpi_annual_pct'].notna().any() else None,
            "trade_pct_gdp": round(float(data['trade_pct_gdp'].mean()),2) if data['trade_pct_gdp'].notna().any() else None})
    return json.dumps({"year": year, "comparison": results}, indent=2)


@tool
def get_commodity_prices(year: int) -> str:
    """Get global commodity prices for a year (oil, gas, coal, wheat, rice, fertilizers)."""
    data = df[df['year'] == year]
    if data.empty: return f"No data for {year}"
    price_cols = [c for c in data.columns if any(k in c for k in ['oil_brent','natural_gas','coal','wheat_avg','rice_avg','fertilizer'])]
    if not price_cols: return "No commodity price data available"
    prices = {col: round(float(data[col].mean()),2) for col in price_cols if data[col].notna().any()}
    return json.dumps({"year": year, "commodity_prices": prices}, indent=2)


ALL_TOOLS = [get_economic_indicators, get_economic_trend, compare_economies, get_commodity_prices]

def create_economy_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="economy_agent", prompt=prompts['economy'])