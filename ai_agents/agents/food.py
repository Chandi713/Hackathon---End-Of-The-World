"""Food Agent — FAOSTAT production, trade, food commodity prices"""

import json
from typing import Optional
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from config import load_agent_data, filter_data, get_model, load_prompts

df = load_agent_data("food")


@tool
def get_food_production(country: str, year: Optional[int] = None) -> str:
    """Get food production data for a country: crop areas, yields, production quantities, trade."""
    data = filter_data(df, country=country, year=year)
    if data.empty: return f"No food data for '{country}'" + (f" in {year}" if year else "")
    numeric_cols = data.select_dtypes(include='number').columns.tolist()
    summary = {col: round(float(data[col].mean()),2) for col in numeric_cols if col != 'year' and data[col].notna().any()}
    return json.dumps({"country": country, "period": str(year) if year else f"{int(data['year'].min())}-{int(data['year'].max())}",
                        "indicators": summary}, indent=2)


@tool
def get_food_trade_balance(country: str, year: Optional[int] = None) -> str:
    """Get food import/export balance for a country."""
    data = filter_data(df, country=country, year=year)
    if data.empty: return f"No food trade data for '{country}'"
    result = {"country": country}
    if 'food_export_total_value' in data.columns: result["exports"] = round(float(data['food_export_total_value'].sum()),2)
    if 'food_import_total_value' in data.columns: result["imports"] = round(float(data['food_import_total_value'].sum()),2)
    if 'food_export_total_value' in data.columns and 'food_import_total_value' in data.columns:
        result["trade_balance"] = round(float(data['food_export_total_value'].sum() - data['food_import_total_value'].sum()),2)
        result["net_importer"] = result["trade_balance"] < 0
    return json.dumps(result, indent=2)


@tool
def get_food_prices(year: int) -> str:
    """Get global food commodity prices: wheat, rice, maize, soybeans, sugar, palm oil, fertilizers."""
    data = df[df['year'] == year]
    if data.empty: return f"No food price data for {year}"
    price_cols = [c for c in data.columns if 'price' in c.lower()]
    if not price_cols: return "No price columns found"
    prices = {col: round(float(data[col].mean()),2) for col in price_cols if data[col].notna().any()}
    return json.dumps({"year": year, "food_prices": prices}, indent=2)


@tool
def find_food_vulnerable_countries(year: int, top_n: int = 15) -> str:
    """Find countries most vulnerable to food supply disruption based on import dependency and low production."""
    data = df[df['year'] == year].copy()
    if data.empty: return f"No data for {year}"
    if 'food_import_total_value' in data.columns and 'food_export_total_value' in data.columns:
        data['import_ratio'] = data['food_import_total_value'] / (data['food_export_total_value'].clip(lower=1))
        vulnerable = data.nlargest(top_n, 'import_ratio')[['country_name','import_ratio','food_import_total_value','food_export_total_value']]
        return json.dumps({"year": year, "vulnerable": vulnerable.to_dict('records')}, indent=2, default=str)
    return "Insufficient data for vulnerability analysis"


ALL_TOOLS = [get_food_production, get_food_trade_balance, get_food_prices, find_food_vulnerable_countries]

def create_food_agent():
    prompts = load_prompts()
    return create_react_agent(model=get_model(), tools=ALL_TOOLS, name="food_agent", prompt=prompts['food'])