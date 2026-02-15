"""
ResilienceAI — Full 8-Agent Risk Scoring Engine
=================================================
Reads all 8 agent CSVs from data/ folder, computes per-country risk scores,
and outputs data/risk_scores.json for the Next.js frontend.

Usage: python scripts/risk_engine.py [year]
Default year: 2024
"""

import pandas as pd
import numpy as np
import json
import sys
import pycountry
from datetime import datetime
from pathlib import Path
from fips_map import FIPS_TO_ISO2

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Standard ISO3 Lat/Lng centroids (approximate)
COUNTRY_GEO_ISO3 = {
    "AFG": {"lat": 33.9391, "lng": 67.7099}, "ALB": {"lat": 41.1533, "lng": 20.1683}, "DZA": {"lat": 28.0339, "lng": 1.6596}, "ASM": {"lat": -14.2710, "lng": -170.1320},
    "AND": {"lat": 42.5063, "lng": 1.5218}, "AGO": {"lat": -11.2027, "lng": 17.8739}, "AIA": {"lat": 18.2206, "lng": -63.0686}, "ATA": {"lat": -75.2509, "lng": -0.0714},
    "ATG": {"lat": 17.0608, "lng": -61.7964}, "ARG": {"lat": -38.4161, "lng": -63.6167}, "ARM": {"lat": 40.0691, "lng": 45.0382}, "ABW": {"lat": 12.5211, "lng": -69.9683},
    "AUS": {"lat": -25.2744, "lng": 133.7751}, "AUT": {"lat": 47.5162, "lng": 14.5501}, "AZE": {"lat": 40.1431, "lng": 47.5769}, "BHS": {"lat": 25.0343, "lng": -77.3963},
    "BHR": {"lat": 26.0667, "lng": 50.5577}, "BGD": {"lat": 23.6850, "lng": 90.3563}, "BRB": {"lat": 13.1939, "lng": -59.5432}, "BLR": {"lat": 53.7098, "lng": 27.9534},
    "BEL": {"lat": 50.5039, "lng": 4.4699}, "BLZ": {"lat": 17.1899, "lng": -88.4976}, "BEN": {"lat": 9.3077, "lng": 2.3158}, "BMU": {"lat": 32.3078, "lng": -64.7505},
    "BTN": {"lat": 27.5142, "lng": 90.4336}, "BOL": {"lat": -16.2902, "lng": -63.5887}, "BES": {"lat": 12.1784, "lng": -68.2385}, "BIH": {"lat": 43.9159, "lng": 17.6791},
    "BWA": {"lat": -22.3285, "lng": 24.6849}, "BVT": {"lat": -54.4232, "lng": 3.4139}, "BRA": {"lat": -14.2350, "lng": -51.9253}, "IOT": {"lat": -6.3432, "lng": 71.8765},
    "BRN": {"lat": 4.5353, "lng": 114.7277}, "BGR": {"lat": 42.7339, "lng": 25.4858}, "BFA": {"lat": 12.2383, "lng": -1.5616}, "BDI": {"lat": -3.3731, "lng": 29.9189},
    "CPV": {"lat": 16.0021, "lng": -24.0131}, "KHM": {"lat": 12.5657, "lng": 104.9910}, "CMR": {"lat": 7.3697, "lng": 12.3547}, "CAN": {"lat": 56.1304, "lng": -106.3468},
    "CYM": {"lat": 19.3133, "lng": -81.2546}, "CAF": {"lat": 6.6111, "lng": 20.9394}, "TCD": {"lat": 15.4542, "lng": 18.7322}, "CHL": {"lat": -35.6751, "lng": -71.5430},
    "CHN": {"lat": 35.8617, "lng": 104.1954}, "CXR": {"lat": -10.4475, "lng": 105.6904}, "CCK": {"lat": -12.1642, "lng": 96.8710}, "COL": {"lat": 4.5709, "lng": -74.2973},
    "COM": {"lat": -11.8750, "lng": 43.8722}, "COD": {"lat": -4.0383, "lng": 21.7587}, "COG": {"lat": -0.2280, "lng": 15.8277}, "COK": {"lat": -21.2367, "lng": -159.7777},
    "CRI": {"lat": 9.7489, "lng": -83.7534}, "HRV": {"lat": 45.1000, "lng": 15.2000}, "CUB": {"lat": 21.5218, "lng": -77.7812}, "CUW": {"lat": 12.1696, "lng": -68.9900},
    "CYP": {"lat": 35.1264, "lng": 33.4299}, "CZE": {"lat": 49.8175, "lng": 15.4730}, "CIV": {"lat": 7.5400, "lng": -5.5471}, "DNK": {"lat": 56.2639, "lng": 9.5018},
    "DJI": {"lat": 11.8251, "lng": 42.5903}, "DMA": {"lat": 15.4150, "lng": -61.3710}, "DOM": {"lat": 18.7357, "lng": -70.1627}, "ECU": {"lat": -1.8312, "lng": -78.1834},
    "EGY": {"lat": 26.8206, "lng": 30.8025}, "SLV": {"lat": 13.7942, "lng": -88.8965}, "GNQ": {"lat": 1.6508, "lng": 10.2679}, "ERI": {"lat": 15.1794, "lng": 39.7823},
    "EST": {"lat": 58.5953, "lng": 25.0136}, "ETH": {"lat": 9.1450, "lng": 40.4897}, "FLK": {"lat": -51.7963, "lng": -59.5236}, "FRO": {"lat": 61.8926, "lng": -6.9118},
    "FJI": {"lat": -17.7134, "lng": 178.0650}, "FIN": {"lat": 61.9241, "lng": 25.7482}, "FRA": {"lat": 46.2276, "lng": 2.2137}, "GUF": {"lat": 3.9339, "lng": -53.1258},
    "PYF": {"lat": -17.6797, "lng": -149.4068}, "ATF": {"lat": -49.2804, "lng": 69.3486}, "GAB": {"lat": -0.8037, "lng": 11.6094}, "GMB": {"lat": 13.4432, "lng": -15.3101},
    "GEO": {"lat": 42.3154, "lng": 43.3569}, "DEU": {"lat": 51.1657, "lng": 10.4515}, "GHA": {"lat": 7.9465, "lng": -1.0232}, "GIB": {"lat": 36.1408, "lng": -5.3536},
    "GRC": {"lat": 39.0742, "lng": 21.8243}, "GRL": {"lat": 71.7069, "lng": -42.6043}, "GRD": {"lat": 12.1165, "lng": -61.6790}, "GLP": {"lat": 16.2650, "lng": -61.5510},
    "GUM": {"lat": 13.4443, "lng": 144.7937}, "GTM": {"lat": 15.7835, "lng": -90.2308}, "GGY": {"lat": 49.4482, "lng": -2.5895}, "GIN": {"lat": 9.9456, "lng": -9.6966},
    "GNB": {"lat": 11.8037, "lng": -15.1804}, "GUY": {"lat": 4.8604, "lng": -58.9302}, "HTI": {"lat": 18.9712, "lng": -72.2852}, "HMD": {"lat": -53.0818, "lng": 73.5042},
    "VAT": {"lat": 41.9029, "lng": 12.4534}, "HND": {"lat": 15.2000, "lng": -86.2419}, "HKG": {"lat": 22.3193, "lng": 114.1694}, "HUN": {"lat": 47.1625, "lng": 19.5033},
    "ISL": {"lat": 64.9631, "lng": -19.0208}, "IND": {"lat": 20.5937, "lng": 78.9629}, "IDN": {"lat": -0.7893, "lng": 113.9213}, "IRN": {"lat": 32.4279, "lng": 53.6880},
    "IRQ": {"lat": 33.2232, "lng": 43.6793}, "IRL": {"lat": 53.1424, "lng": -7.6921}, "IMN": {"lat": 54.2361, "lng": -4.5481}, "ISR": {"lat": 31.0461, "lng": 34.8516},
    "ITA": {"lat": 41.8719, "lng": 12.5674}, "JAM": {"lat": 18.1096, "lng": -77.2975}, "JPN": {"lat": 36.2048, "lng": 138.2529}, "JEY": {"lat": 49.2144, "lng": -2.1312},
    "JOR": {"lat": 30.5852, "lng": 36.2384}, "KAZ": {"lat": 48.0196, "lng": 66.9237}, "KEN": {"lat": -0.0236, "lng": 37.9062}, "KIR": {"lat": -3.3704, "lng": -168.7340},
    "PRK": {"lat": 40.3399, "lng": 127.5101}, "KOR": {"lat": 35.9078, "lng": 127.7669}, "KWT": {"lat": 29.3117, "lng": 47.4818}, "KGZ": {"lat": 41.2044, "lng": 74.7661},
    "LAO": {"lat": 19.8563, "lng": 102.4955}, "LVA": {"lat": 56.8796, "lng": 24.6032}, "LBN": {"lat": 33.8547, "lng": 35.8623}, "LSO": {"lat": -29.6100, "lng": 28.2336},
    "LBR": {"lat": 6.4281, "lng": -9.4295}, "LBY": {"lat": 26.3351, "lng": 17.2283}, "LIE": {"lat": 47.1660, "lng": 9.5554}, "LTU": {"lat": 55.1694, "lng": 23.8813},
    "LUX": {"lat": 49.8153, "lng": 6.1296}, "MAC": {"lat": 22.1987, "lng": 113.5439}, "MKD": {"lat": 41.6086, "lng": 21.7453}, "MDG": {"lat": -18.7669, "lng": 46.8691},
    "MWI": {"lat": -13.2543, "lng": 34.3015}, "MYS": {"lat": 4.2105, "lng": 101.9758}, "MDV": {"lat": 3.2028, "lng": 73.2207}, "MLI": {"lat": 17.5707, "lng": -3.9962},
    "MLT": {"lat": 35.9375, "lng": 14.3754}, "MHL": {"lat": 7.1315, "lng": 171.1845}, "MTQ": {"lat": 14.6415, "lng": -61.0242}, "MRT": {"lat": 21.0079, "lng": -10.9408},
    "MUS": {"lat": -20.3484, "lng": 57.5522}, "MYT": {"lat": -12.8275, "lng": 45.1662}, "MEX": {"lat": 23.6345, "lng": -102.5528}, "FSM": {"lat": 7.4256, "lng": 150.5508},
    "MDA": {"lat": 47.4116, "lng": 28.3699}, "MCO": {"lat": 43.7384, "lng": 7.4246}, "MNG": {"lat": 46.8625, "lng": 103.8467}, "MNE": {"lat": 42.7087, "lng": 19.3744},
    "MSR": {"lat": 16.7425, "lng": -62.1874}, "MAR": {"lat": 31.7917, "lng": -7.0926}, "MOZ": {"lat": -18.6657, "lng": 35.5296}, "MMR": {"lat": 21.9162, "lng": 95.9560},
    "NAM": {"lat": -22.9576, "lng": 18.4904}, "NRU": {"lat": -0.5228, "lng": 166.9315}, "NPL": {"lat": 28.3949, "lng": 84.1240}, "NLD": {"lat": 52.1326, "lng": 5.2913},
    "NCL": {"lat": -20.9043, "lng": 165.6180}, "NZL": {"lat": -40.9006, "lng": 174.8860}, "NIC": {"lat": 12.8654, "lng": -85.2072}, "NER": {"lat": 17.6078, "lng": 8.0817},
    "NGA": {"lat": 9.0820, "lng": 8.6753}, "NIU": {"lat": -19.0544, "lng": -169.8672}, "NFK": {"lat": -29.0408, "lng": 167.9547}, "MKD": {"lat": 41.6086, "lng": 21.7453},
    "MNP": {"lat": 17.3308, "lng": 145.3847}, "NOR": {"lat": 60.4720, "lng": 8.4689}, "OMN": {"lat": 21.4735, "lng": 55.9754}, "PAK": {"lat": 30.3753, "lng": 69.3451},
    "PLW": {"lat": 7.5150, "lng": 134.5825}, "PSE": {"lat": 31.9522, "lng": 35.2332}, "PAN": {"lat": 8.5380, "lng": -80.7821}, "PNG": {"lat": -6.314993, "lng": 143.9555},
    "PRY": {"lat": -23.442503, "lng": -58.4438}, "PER": {"lat": -9.189967, "lng": -75.0152}, "PHL": {"lat": 12.879721, "lng": 121.7740}, "PCN": {"lat": -24.703615, "lng": -127.4393},
    "POL": {"lat": 51.919438, "lng": 19.1451}, "PRT": {"lat": 39.399872, "lng": -8.2245}, "PRI": {"lat": 18.220833, "lng": -66.5901}, "QAT": {"lat": 25.354826, "lng": 51.1839},
    "REU": {"lat": -21.115141, "lng": 55.5364}, "ROU": {"lat": 45.943161, "lng": 24.9668}, "RUS": {"lat": 61.524010, "lng": 105.3188}, "RWA": {"lat": -1.940278, "lng": 29.8739},
    "BLM": {"lat": 17.900000, "lng": -62.8333}, "SHN": {"lat": -15.965002, "lng": -5.7089}, "KNA": {"lat": 17.357822, "lng": -62.7829}, "LCA": {"lat": 13.909444, "lng": -60.9789},
    "MAF": {"lat": 18.070830, "lng": -63.0501}, "SPM": {"lat": 46.941936, "lng": -56.2711}, "VCT": {"lat": 12.984305, "lng": -61.2872}, "WSM": {"lat": -13.759029, "lng": -172.1046},
    "SMR": {"lat": 43.942360, "lng": 12.4578}, "STP": {"lat": 0.186360, "lng": 6.6131}, "SAU": {"lat": 23.885942, "lng": 45.0792}, "SEN": {"lat": 14.497401, "lng": -14.4524},
    "SRB": {"lat": 44.016521, "lng": 21.0059}, "SYC": {"lat": -4.679574, "lng": 55.4919}, "SLE": {"lat": 8.460555, "lng": -11.7799}, "SGP": {"lat": 1.352083, "lng": 103.8198},
    "SXM": {"lat": 18.042480, "lng": -63.0548}, "SVK": {"lat": 48.669026, "lng": 19.6990}, "SVN": {"lat": 46.151241, "lng": 14.9955}, "SLB": {"lat": -9.645710, "lng": 160.1562},
    "SOM": {"lat": 5.152149, "lng": 46.1996}, "ZAF": {"lat": -30.559482, "lng": 22.9375}, "SGS": {"lat": -54.423199, "lng": -36.5879}, "SSD": {"lat": 6.8770, "lng": 31.3070},
    "ESP": {"lat": 40.463667, "lng": -3.7492}, "LKA": {"lat": 7.873054, "lng": 80.7718}, "SDN": {"lat": 12.862807, "lng": 30.2176}, "SUR": {"lat": 3.919305, "lng": -56.0278},
    "SJM": {"lat": 77.553604, "lng": 23.6703}, "SWZ": {"lat": -26.522503, "lng": 31.4659}, "SWE": {"lat": 60.128161, "lng": 18.6435}, "CHE": {"lat": 46.818188, "lng": 8.2275},
    "SYR": {"lat": 34.802075, "lng": 38.9968}, "TWN": {"lat": 23.697810, "lng": 120.9605}, "TJK": {"lat": 38.861034, "lng": 71.2761}, "TZA": {"lat": -6.369028, "lng": 34.8888},
    "THA": {"lat": 15.870032, "lng": 100.9925}, "TLS": {"lat": -8.874217, "lng": 125.7275}, "TGO": {"lat": 8.619543, "lng": 0.8248}, "TKL": {"lat": -9.2002, "lng": -171.8484},
    "TON": {"lat": -21.178986, "lng": -175.1982}, "TTO": {"lat": 10.6918, "lng": -61.2225}, "TUN": {"lat": 33.886917, "lng": 9.5375}, "TUR": {"lat": 38.963745, "lng": 35.2433},
    "TKM": {"lat": 38.969719, "lng": 59.5563}, "TCA": {"lat": 21.694025, "lng": -71.7979}, "TUV": {"lat": -7.109535, "lng": 177.6493}, "UGA": {"lat": 1.373333, "lng": 32.2903},
    "UKR": {"lat": 48.379433, "lng": 31.1656}, "ARE": {"lat": 23.424076, "lng": 53.8478}, "GBR": {"lat": 55.378051, "lng": -3.4359}, "USA": {"lat": 37.090240, "lng": -95.7129},
    "UMI": {"lat": 19.2801, "lng": 166.6500}, "URY": {"lat": -32.522779, "lng": -55.7658}, "UZB": {"lat": 41.377491, "lng": 64.5853}, "VUT": {"lat": -15.376706, "lng": 166.9592},
    "VEN": {"lat": 6.423750, "lng": -66.5897}, "VNM": {"lat": 14.058324, "lng": 108.2772}, "VGB": {"lat": 18.4207, "lng": -64.6400}, "VIR": {"lat": 18.3358, "lng": -64.8963},
    "WLF": {"lat": -13.768752, "lng": -177.1561}, "ESH": {"lat": 24.215527, "lng": -12.8858}, "YEM": {"lat": 15.552727, "lng": 48.5164}, "ZMB": {"lat": -13.133897, "lng": 27.8493},
    "ZWE": {"lat": -19.015438, "lng": 29.1549},
}

# ============================================================
# 1. LOAD DATA
# ============================================================

def load_data():
    """Load all 8 agent CSVs."""
    news = pd.read_csv(DATA_DIR / "agent_news_stats.csv")
    weather = pd.read_csv(DATA_DIR / "agent_weather.csv")
    disaster = pd.read_csv(DATA_DIR / "agent_disaster.csv")
    economy = pd.read_csv(DATA_DIR / "agent_economy.csv")
    food = pd.read_csv(DATA_DIR / "agent_food.csv")
    political = pd.read_csv(DATA_DIR / "agent_political.csv")
    disease = pd.read_csv(DATA_DIR / "agent_disease.csv")
    health = pd.read_csv(DATA_DIR / "agent_health.csv")

    # Normalize year columns to numeric
    for df in [news, weather, disaster, economy, food, political, disease, health]:
        if 'year' in df.columns:
            df['year'] = pd.to_numeric(df['year'], errors='coerce')
        if 'month' in df.columns:
            df['month'] = pd.to_numeric(df['month'], errors='coerce')

    return {
        'news': news,
        'weather': weather,
        'disaster': disaster,
        'economy': economy,
        'food': food,
        'political': political,
        'disease': disease,
        'health': health,
    }

# ============================================================
# 2. SCORING FUNCTIONS
# ============================================================

def safe_float(val, default=0.0):
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return f
    except:
        return default

def safe_int(val, default=0):
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return int(f)
    except:
        return default

def score_conflict(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    instability = safe_float(df['instability_index'].mean())
    conflict_ratio = safe_float(df['conflict_ratio'].mean())
    war_events = safe_int(df['war_events'].sum())
    protests = safe_int(df['protest_events'].sum())
    sanctions = safe_int(df['sanctions_coercion_events'].sum())
    goldstein = safe_float(df['avg_goldstein_scale'].mean())
    tone = safe_float(df['avg_tone'].mean())

    instability_norm = min(instability / 1.5 * 100, 100)
    conflict_norm = min(conflict_ratio * 200, 100)
    goldstein_norm = min(max(((-goldstein) + 5) / 10 * 100, 0), 100)
    tone_norm = min(max((-tone + 5) / 10 * 100, 0), 100)

    score = instability_norm * 0.35 + conflict_norm * 0.25 + goldstein_norm * 0.20 + tone_norm * 0.20
    return {
        "score": round(max(0, min(score, 100)), 1),
        "details": {"instability_index": round(instability, 4), "conflict_ratio": round(conflict_ratio, 4), 
                    "war_events": war_events, "protest_events": protests, "sanctions_events": sanctions,
                    "goldstein_scale": round(goldstein, 3), "media_tone": round(tone, 3)}
    }

def score_political(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    tension = safe_float(df['political_tension_score'].mean()) if 'political_tension_score' in df.columns else 0
    instability = safe_float(df['instability_index'].mean()) if 'instability_index' in df.columns else 0
    conflict_ratio = safe_float(df['conflict_ratio'].mean()) if 'conflict_ratio' in df.columns else 0
    coop_vs_conf = safe_float(df['cooperation_vs_conflict'].mean()) if 'cooperation_vs_conflict' in df.columns else 0

    score = (min(tension/30*100, 100) * 0.35 + min(instability/1.5*100, 100) * 0.25 + 
             min(conflict_ratio*200, 100) * 0.20 + min(max((-coop_vs_conf+1)/2*100, 0), 100) * 0.20)
    return {"score": round(max(0, min(score, 100)), 1), "details": {"political_tension": round(tension, 3), "instability_index": round(instability, 4), "conflict_ratio": round(conflict_ratio, 4), "cooperation_vs_conflict": round(coop_vs_conf, 3)}}

def score_weather(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    severity = safe_float(df['weather_severity'].mean())
    temp_z = safe_float(df['temp_anomaly_zscore'].mean())
    precip_z = safe_float(df['precip_anomaly_zscore'].mean())
    drought = safe_float(df['drought_index'].mean())
    heat = safe_float(df['heat_stress'].mean())

    score = (min(severity*100, 100)*0.3 + min(abs(temp_z)*30, 100)*0.2 + 
             min(abs(precip_z)*30, 100)*0.2 + min(drought/5*100, 100)*0.2 + min(heat*100, 100)*0.1)
    return {"score": round(max(0, min(score, 100)), 1), "details": {"weather_severity": round(severity, 3), "temp_anomaly_zscore": round(temp_z, 3), "precip_anomaly_zscore": round(precip_z, 3), "drought_index": round(drought, 3), "heat_stress": round(heat, 3)}}

def score_disaster(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    total_events = safe_int(df['Total Events'].sum())
    deaths = safe_int(df['Total Deaths'].sum())
    affected = safe_int(df['Total Affected'].sum())
    damage = safe_float(df['Total Damage (USD, adjusted)'].sum())
    
    score = (min(total_events/30*100, 100)*0.25 + min(np.log1p(deaths)/np.log1p(10000)*100, 100)*0.30 +
             min(np.log1p(affected)/np.log1p(10000000)*100, 100)*0.25 + min(np.log1p(damage)/np.log1p(10000000000)*100, 100)*0.20)
    
    dtype_counts = df['Disaster Type'].value_counts().to_dict() if 'Disaster Type' in df.columns else {}
    return {"score": round(max(0, min(score, 100)), 1), "details": {"total_events": total_events, "deaths": deaths, "affected": affected, "damage_usd": round(damage, 2), "disaster_types": dtype_counts}}

def score_economy(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    inflation = safe_float(df['inflation_cpi_annual_pct'].mean())
    trade_pct = safe_float(df['trade_pct_gdp'].mean())
    price_spikes = safe_int(df['total_price_spikes'].sum())
    hhi = safe_float(df['avg_hhi_concentration'].mean())
    high_risk = safe_int(df['high_risk_dependencies_count'].sum())
    
    score = (min(abs(inflation)/20*100, 100)*0.3 + min(trade_pct/150*100, 100)*0.15 + 
             min(price_spikes/10*100, 100)*0.2 + min(hhi/5000*100, 100)*0.2 + min(high_risk/5*100, 100)*0.15)
    return {"score": round(max(0, min(score, 100)), 1), "details": {"inflation_pct": round(inflation, 2), "trade_pct_gdp": round(trade_pct, 2), "price_spikes": price_spikes, "hhi_concentration": round(hhi, 2), "high_risk_dependencies": high_risk}}

def score_food(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    exports = safe_float(df['food_export_total_value'].sum())
    imports = safe_float(df['food_import_total_value'].sum())
    production = safe_float(df['production'].sum())
    wheat = safe_float(df['wheat_price_avg'].mean())
    rice = safe_float(df['rice_price_avg'].mean())
    
    import_dep = imports / (imports + exports) if (imports+exports) > 0 else 0.5
    avg_price = (wheat + rice) / 2
    
    score = (min(import_dep*100, 100)*0.4 + min(avg_price/500*100, 100)*0.3 + 
             min(max(100 - np.log1p(production)/np.log1p(1000000000)*100, 0), 100)*0.3)
    return {"score": round(max(0, min(score, 100)), 1), "details": {"food_import_dependency": round(import_dep, 3), "avg_food_price": round(avg_price, 2), "total_production": round(production, 0), "food_exports": round(exports, 0), "food_imports": round(imports, 0)}}

def score_disease(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    outbreaks = safe_int(df['num_outbreaks'].sum())
    cases = safe_int(df['total_confirmed_cases'].sum())
    deaths = safe_int(df['total_outbreak_deaths'].sum())
    cfr = safe_float(df['avg_cfr'].mean())
    vacc = safe_float(df['fully_vaccinated_per_hundred'].mean())
    alerts = safe_int(df['who_high_risk_alerts'].sum())
    
    vacc_norm = max(100 - vacc, 0) if vacc > 0 else 50
    score = min(outbreaks/5*100, 100)*0.25 + min(cfr*10, 100)*0.25 + vacc_norm*0.25 + min(alerts/3*100, 100)*0.25
    return {"score": round(max(0, min(score, 100)), 1), "details": {"num_outbreaks": outbreaks, "total_cases": cases, "total_deaths": deaths, "avg_cfr": round(cfr, 3), "vaccination_rate": round(vacc, 1), "who_high_risk_alerts": alerts}}

def score_health(df: pd.DataFrame) -> dict:
    if df.empty: return {"score": 0, "details": {}}
    exp = safe_float(df['health_expenditure_pct_gdp'].mean())
    vacc = safe_float(df['vaccination_coverage_pct'].mean())
    alerts = safe_int(df['active_who_alerts'].sum())
    deaths = safe_int(df['outbreak_deaths'].sum())
    
    exp_norm = min(max(100 - exp*10, 0), 100) if exp > 0 else 70
    vacc_norm = max(100 - vacc, 0) if vacc > 0 else 50
    
    score = exp_norm*0.3 + vacc_norm*0.3 + min(alerts/3*100, 100)*0.2 + min(np.log1p(deaths)/np.log1p(10000)*100, 100)*0.2
    return {"score": round(max(0, min(score, 100)), 1), "details": {"health_expenditure_pct_gdp": round(exp, 2), "vaccination_coverage_pct": round(vacc, 1), "active_who_alerts": alerts, "outbreak_deaths": deaths}}

def compute_composite(scores: dict) -> dict:
    weights = {'conflict': 0.20, 'political': 0.15, 'weather': 0.15, 'disaster': 0.15, 'economy': 0.12, 'food': 0.08, 'disease': 0.08, 'health': 0.07}
    composite = sum(scores[k]['score'] * weights[k] for k in weights)
    
    if composite >= 70: level, color = "CRITICAL", "#dc2626"
    elif composite >= 50: level, color = "HIGH", "#f97316"
    elif composite >= 30: level, color = "MODERATE", "#eab308"
    elif composite >= 15: level, color = "LOW", "#22c55e"
    else: level, color = "MINIMAL", "#16a34a"
    
    domain_scores = {k: scores[k]['score'] for k in weights}
    top = max(domain_scores, key=domain_scores.get)
    threats = {'conflict': "Armed Conflict", 'political': "Political Instability", 'weather': "Extreme Weather", 'disaster': "Natural Disasters", 'economy': "Economic Crisis", 'food': "Food Insecurity", 'disease': "Disease Outbreak", 'health': "Health System Weakness"}
    return {"composite_score": round(composite, 1), "risk_level": level, "color": color, "top_threat": threats[top], "domain_scores": domain_scores}

def get_monthly_conflict(news, pol):
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    res = []
    for m in range(1, 13):
        n = news[news['month']==m] if not news.empty else pd.DataFrame()
        p = pol[pol['month']==m] if not pol.empty else pd.DataFrame()
        res.append({
            "month": months[m-1],
            "wars": safe_int(n['war_events'].sum()) if not n.empty else 0,
            "protests": safe_int(p['protest_events'].sum()) if not p.empty else (safe_int(n['protest_events'].sum()) if not n.empty else 0),
            "sanctions": safe_int(n['sanctions_coercion_events'].sum()) if not n.empty else 0
        })
    return res

def get_monthly_weather(weath):
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    res = []
    for m in range(1, 13):
        w = weath[weath['month']==m] if not weath.empty else pd.DataFrame()
        res.append({
            "month": months[m-1],
            "tempAnomaly": round(safe_float(w['temp_anomaly'].mean()), 1) if not w.empty else 0,
            "precAnomaly": round(safe_float(w['precip_anomaly'].mean()), 1) if not w.empty else 0,
            "drought": round(safe_float(w['drought_index'].mean()*10), 0) if not w.empty else 0
        })
    return res

def get_disaster_breakdown(df):
    if df.empty or 'Disaster Type' not in df.columns: return []
    counts = df['Disaster Type'].value_counts()
    total = counts.sum()
    if total == 0: return []
    colors = {"Flood": "#3b82f6", "Earthquake": "#ef4444", "Drought": "#f59e0b", "Storm": "#06b6d4", "Wildfire": "#f97316"}
    return [{"name": str(k), "value": round(v/total*100, 1), "count": int(v), "color": colors.get(str(k), "#6b7280")} for k, v in counts.items()]

def get_yearly_timeline(code, data):
    years = range(2000, 2025)
    res = []
    for y in years:
        n = data['news'][(data['news']['country_code']==code) & (data['news']['year']==y)]
        w = data['weather'][(data['weather']['country_code']==code) & (data['weather']['year']==y)]
        d = data['disaster'][(data['disaster']['country_code']==code) & (data['disaster']['year']==y)] if 'country_code' in data['disaster'].columns else pd.DataFrame()
        
        inst = round(safe_float(n['instability_index'].mean())*50, 1) if not n.empty else 0
        weath = round(safe_float(w['weather_severity'].mean())*100, 1) if not w.empty else 0
        evts = safe_int(d['Total Events'].sum()) if not d.empty else 0
        res.append({"year": y, "instability": min(inst, 100), "weather": min(weath, 100), "disasters": evts})
    return res

def generate_alerts(results):
    sorted_c = sorted(results.values(), key=lambda x: x['composite_score'], reverse=True)[:15]
    alerts = []
    id_ = 1
    for c in sorted_c:
        sev = "critical" if c['risk_level']=="CRITICAL" else "high" if c['risk_level']=="HIGH" else "moderate"
        dom = max(c['domain_scores'], key=c['domain_scores'].get)
        if dom == 'conflict': text = f"{c['country_name']}: Instability {c['conflict_details'].get('instability_index', 0):.2f}, War events {c['conflict_details'].get('war_events', 0)}"
        elif dom == 'disaster': text = f"{c['country_name']}: {c['disaster_details'].get('total_events', 0)} disasters, {c['disaster_details'].get('deaths', 0):,} deaths"
        elif dom == 'weather': text = f"{c['country_name']}: Severe weather, drought index {c['weather_details'].get('drought_index', 0):.1f}"
        else: text = f"{c['country_name']}: High risk detected in {dom} sector"
        alerts.append({"id": id_, "severity": sev, "text": text, "country": c.get('iso3', '').lower()})
        id_ += 1
    return alerts

def generate_threat_matrix(results):
    high = [c for c in results.values() if c['composite_score'] >= 30] or list(results.values())
    avg = lambda dom: round(np.mean([c['domain_scores'].get(dom, 0) for c in high]))
    c, w, d, e = avg('conflict'), avg('weather'), avg('disease'), avg('economy')
    return [
        {"supply": "Food", "conflict": min(round(c*0.85), 100), "weather": min(round(w*0.95), 100), "pandemic": min(round(d*0.6), 100), "trade": min(round(e*0.8), 100)},
        {"supply": "Medicine", "conflict": min(round(c*0.75), 100), "weather": min(round(w*0.4), 100), "pandemic": min(round(d*1.1), 100), "trade": min(round(e*0.9), 100)},
        {"supply": "Energy", "conflict": min(round(c*0.95), 100), "weather": min(round(w*0.7), 100), "pandemic": min(round(d*0.35), 100), "trade": min(round(e*1.0), 100)},
        {"supply": "Water", "conflict": min(round(c*0.7), 100), "weather": min(round(w*1.1), 100), "pandemic": min(round(d*0.25), 100), "trade": min(round(e*0.4), 100)},
        {"supply": "Fuel", "conflict": min(round(c*0.9), 100), "weather": min(round(w*0.6), 100), "pandemic": min(round(d*0.3), 100), "trade": min(round(e*1.05), 100)}
    ]

# ============================================================
# 8. ISO3 HELPER
# ============================================================

def get_iso3(row):
    """
    Robustly determine ISO3 code for a country row.
    1. Check if 'iso3' column is populated.
    2. If not, use 'country_code' (FIPS) -> ISO2 -> ISO3.
    3. If FIPS mapping fails, use 'country_name' -> ISO3 via pycountry.
    """
    iso3 = row['iso3'] if pd.notna(row['iso3']) and row['iso3'] != "" else None
    if iso3:
        return iso3.upper()
    
    fips = row['country_code']
    if fips in FIPS_TO_ISO2:
        iso2 = FIPS_TO_ISO2[fips]
        try:
            c = pycountry.countries.get(alpha_2=iso2)
            if c: return c.alpha_3
        except:
            pass
            
    name = row['country_name']
    if name:
        try:
            c = pycountry.countries.search_fuzzy(name)[0]
            return c.alpha_3
        except:
            pass
            
    return ""

# ============================================================
# 9. MAIN RUN
# ============================================================

def compute_all_scores(year: int = 2024):
    print(f"Scoring all countries for {year}...")
    data = load_data()
    # Get unique codes from news
    codes = data['news'][data['news']['year']==year]['country_code'].unique()
    
    results = {}
    for code in codes:
        # Get basics
        row = data['news'][(data['news']['country_code']==code) & (data['news']['year']==year)].iloc[0]
        name = row['country_name']
        iso3 = get_iso3(row)
        
        if not iso3:
            print(f"Warning: Could not resolve ISO3 for {name} ({code})")
            # Skip countries without ISO3 as they won't map to UI
            continue
        
        # Slices
        n = data['news'][(data['news']['country_code']==code) & (data['news']['year']==year)]
        w = data['weather'][(data['weather']['country_code']==code) & (data['weather']['year']==year)]
        d = data['disaster'][(data['disaster']['country_code']==code) & (data['disaster']['year']==year)] if 'country_code' in data['disaster'].columns else pd.DataFrame()
        e = data['economy'][(data['economy']['country_name']==name) & (data['economy']['year']==year)]
        f = data['food'][(data['food']['country_name']==name) & (data['food']['year']==year)]
        p = data['political'][(data['political']['country_code']==code) & (data['political']['year']==year)]
        di = data['disease'][(data['disease']['country_name']==name) & (data['disease']['year']==year)]
        h = data['health'][(data['health']['country_name']==name) & (data['health']['year']==year)]
        
        scores = {
            'conflict': score_conflict(n),
            'political': score_political(p),
            'weather': score_weather(w),
            'disaster': score_disaster(d),
            'economy': score_economy(e),
            'food': score_food(f),
            'disease': score_disease(di),
            'health': score_health(h),
        }
        
        comp = compute_composite(scores)
        
        # Geo
        geo = COUNTRY_GEO_ISO3.get(iso3, {"lat": 0, "lng": 0})
        
        # Use ISO3 as the primary key
        key = iso3.lower()
        
        results[key] = {
            "id": key,
            "country_code": code,
            "country_name": name,
            "iso3": iso3,
            "lat": geo['lat'],
            "lng": geo['lng'],
            "composite_score": comp['composite_score'],
            "risk_level": comp['risk_level'],
            "color": comp['color'],
            "top_threat": comp['top_threat'],
            "domain_scores": comp['domain_scores'],
            "active_disasters": safe_int(d['Total Events'].sum()) if not d.empty else 0,
            "conflict_details": scores['conflict']['details'],
            "political_details": scores['political']['details'],
            "weather_details": scores['weather']['details'],
            "disaster_details": scores['disaster']['details'],
            "economy_details": scores['economy']['details'],
            "food_details": scores['food']['details'],
            "disease_details": scores['disease']['details'],
            "health_details": scores['health']['details'],
            "monthly_conflict": get_monthly_conflict(n, p),
            "monthly_weather": get_monthly_weather(w),
            "disaster_breakdown": get_disaster_breakdown(d)
        }

    print("Generating timelines...")
    for k, v in results.items():
        v['timeline'] = get_yearly_timeline(v['country_code'], data)
        
    hotspots = sum(1 for c in results.values() if c['composite_score']>=50)
    conf_ev = safe_int(data['news'][data['news']['year']==year]['war_events'].sum())
    dis_ev = safe_int(data['disaster'][data['disaster']['year']==year]['Total Events'].sum()) if 'Total Events' in data['disaster'].columns else 0
    total_dp = sum(len(df) for df in data.values())
    
    output = {
        "metadata": {"generated_at": datetime.now().isoformat(), "year": year, "countries_scored": len(results)},
        "summary": {"total_countries": len(results), "active_hotspots": hotspots, "total_conflict_events": conf_ev, "total_disasters": dis_ev, "total_data_points": total_dp},
        "alerts": generate_alerts(results),
        "threat_matrix": generate_threat_matrix(results),
        "countries": results
    }

    # Recursively clean NaNs to ensure valid JSON
    def clean_nans(obj):
        if isinstance(obj, float):
            return 0.0 if (np.isnan(obj) or np.isinf(obj)) else obj
        if isinstance(obj, dict):
            return {k: clean_nans(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [clean_nans(x) for x in obj]
        if pd.isna(obj): # Handle other pandas NA types
            return None
        return obj

    output = clean_nans(output)
    
    with open(DATA_DIR / "risk_scores.json", "w") as f:
        json.dump(output, f, indent=2, default=str)
    
    print(f"Done. Scored {len(results)} countries. Saved to risk_scores.json")

if __name__ == "__main__":
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    compute_all_scores(year)
