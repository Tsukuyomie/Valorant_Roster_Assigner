import os
import random
import asyncio
import itertools
import urllib.parse
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
import numpy as np
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Valorant Advanced Optimization Engine",
    root_path=""
)

# Enable CORS for React Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://valorant-roster-assigner.vercel.app", 
        "http://localhost:5173", 
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Configuration & Constants ---
HENRIK_API_KEY = os.getenv("HENRIK_API_KEY")
API_BASE_URL = "https://api.henrikdev.xyz/valorant/v1/lifetime/matches"

AGENT_ROLES = {
    "Jett": "Duelist", "Reyna": "Duelist", "Raze": "Duelist", "Neon": "Duelist", "Yoru": "Duelist", "Phoenix": "Duelist", "Iso": "Duelist",
    "Omen": "Controller", "Viper": "Controller", "Brimstone": "Controller", "Astra": "Controller", "Harbor": "Controller", "Clove": "Controller",
    "Sova": "Initiator", "Breach": "Initiator", "Skye": "Initiator", "KAY/O": "Initiator", "Fade": "Initiator", "Gekko": "Initiator",
    "Killjoy": "Sentinel", "Cypher": "Sentinel", "Sage": "Sentinel", "Chamber": "Sentinel", "Deadlock": "Sentinel", "Vyse": "Sentinel"
}

MAP_BLUEPRINTS = {
    "Ascent": {"roles": ["Duelist", "Controller", "Initiator", "Initiator", "Sentinel"]},
    "Bind": {"roles": ["Duelist", "Controller", "Controller", "Initiator", "Sentinel"]},
    "Lotus": {"roles": ["Duelist", "Controller", "Initiator", "Sentinel", "Sentinel"]},
    "Haven": {"roles": ["Duelist", "Controller", "Initiator", "Initiator", "Sentinel"]},
    "Split": {"roles": ["Duelist", "Controller", "Initiator", "Sentinel", "Sentinel"]},
    "Icebox": {"roles": ["Duelist", "Controller", "Initiator", "Sentinel", "Sentinel"]},
    "Breeze": {"roles": ["Duelist", "Controller", "Initiator", "Initiator", "Sentinel"]},
    "Sunset": {"roles": ["Duelist", "Controller", "Initiator", "Initiator", "Sentinel"]},
    "Abyss": {"roles": ["Duelist", "Controller", "Initiator", "Initiator", "Sentinel"]},
    "Pearl": {"roles": ["Duelist", "Controller", "Initiator", "Initiator", "Sentinel"]}
}

class PlayerInput(BaseModel):
    name: str
    tag: str

class OptimizationRequest(BaseModel):
    region: str
    map_name: str
    players: List[PlayerInput]

@app.get("/")
async def health_check():
    return {"status": "Backend is ALIVE and running!"}

# --- 2. Data Ingestion Engine ---
async def fetch_single_player_mastery(
    client: httpx.AsyncClient, region: str, name: str, tag: str, target_map: str
):
    safe_name = urllib.parse.quote(name.strip())
    safe_tag = urllib.parse.quote(tag.strip())
    url = f"{API_BASE_URL}/{region}/{safe_name}/{safe_tag}"
    headers = {"Authorization": HENRIK_API_KEY}
    params = {"size": 100}

    try:
        await asyncio.sleep(random.uniform(0.1, 0.4))
        response = await client.get(url, headers=headers, params=params, timeout=20.0)

        if response.status_code != 200:
            print(f"❌ API Error for {name}#{tag}: Status {response.status_code}")
            return f"{name}#{tag}", {}

        data = response.json().get("data", [])
        if not data:
            return f"{name}#{tag}", {}

        records = []
        for idx, match in enumerate(data):
            meta = match.get("meta", {})
            match_map = meta.get("map", {}).get("name", "")
            
            if match_map.lower() != target_map.lower():
                continue

            stats = match.get("stats", {})
            player_team = stats.get("team")
            if not player_team: continue

            teams = match.get("teams", {})
            player_score = teams.get(player_team.lower(), 0)
            enemy_team = "blue" if player_team.lower() == "red" else "red"
            enemy_score = teams.get(enemy_team, 0)
            
            won = 1 if player_score > enemy_score else 0
            kills = stats.get("kills", 0)
            deaths = stats.get("deaths", 0)
            combat_score = stats.get("score", 0)

            agent_name = stats.get("character", {}).get("name", "").title()
            if agent_name == "Kay/O": agent_name = "KAY/O"

            recency_weight = 0.95 ** idx 

            if agent_name:
                records.append({
                    "agent": agent_name,
                    "win": won,
                    "kills": kills,
                    "deaths": deaths,
                    "combat_score": combat_score,
                    "weight": recency_weight
                })

        if not records:
            return f"{name}#{tag}", {}

        df = pd.DataFrame(records)
        df["weighted_win"] = df["win"] * df["weight"]
        
        summary = df.groupby("agent").agg(
            matches=("win", "count"),
            weighted_wins=("weighted_win", "sum"),
            total_weight=("weight", "sum"),
            total_kills=("kills", "sum"),
            total_deaths=("deaths", "sum"),
            avg_combat_score=("combat_score", "mean")
        ).reset_index()

        summary["win_rate"] = summary["weighted_wins"] / summary["total_weight"]
        summary["kd_ratio"] = summary["total_kills"] / summary["total_deaths"].replace(0, 1)

        summary["raw_score"] = (
            (summary["win_rate"] * 50) + 
            (summary["kd_ratio"] * 15) + 
            (summary["avg_combat_score"] * 0.1) + 
            (summary["matches"] * 2)
        )

        max_val = summary["raw_score"].max()
        summary["mastery_score"] = (summary["raw_score"] / max_val * 100 if max_val > 0 else 0).astype(int)

        print(f"✅ Harvested stats for {name}#{tag} on {target_map}")
        return f"{name}#{tag}", dict(zip(summary["agent"], summary["mastery_score"]))

    except Exception as e:
        print(f"🚨 Exception pulling data for {name}#{tag}: {str(e)}")
        return f"{name}#{tag}", {}

# --- 3. Dynamic Optimization Logic Engine ---
@app.post("/api/optimize")
async def optimize_roster(request: OptimizationRequest):
    num_players = len(request.players)
    if num_players not in [1, 2, 3, 5]:
        raise HTTPException(status_code=400, detail="Supported party sizes are 1, 2, 3, or 5.")

    blueprint = MAP_BLUEPRINTS.get(request.map_name)
    if not blueprint:
        raise HTTPException(status_code=400, detail="Map blueprint setup not configured.")

    player_profiles = {}

    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_single_player_mastery(client, request.region, p.name, p.tag, request.map_name)
            for p in request.players
        ]
        results = await asyncio.gather(*tasks)
        for player_id, mastery_map in results:
            player_profiles[player_id] = mastery_map

    best_score = -1
    best_roster = []
    player_keys = list(player_profiles.keys())

    # Map the given players onto 'num_players' distinct composition slots
    for slot_indices in itertools.permutations(range(5), num_players):
        current_team_score = 0
        current_roster = []

        for i, player_id in enumerate(player_keys):
            slot_idx = slot_indices[i]
            target_role = blueprint["roles"][slot_idx]
            
            best_agent_for_role = "No Data / Unplayed"
            highest_role_score = -1 
            
            for played_agent, score in player_profiles[player_id].items():
                if AGENT_ROLES.get(played_agent) == target_role and score > highest_role_score:
                    highest_role_score = score
                    best_agent_for_role = played_agent
            
            current_team_score += highest_role_score if highest_role_score != -1 else 0
            current_roster.append({
                "player": player_id,
                "role": target_role,
                "agent": best_agent_for_role,
                "score": highest_role_score if highest_role_score != -1 else 0,
            })

        if current_team_score > best_score:
            best_score = current_team_score
            best_roster = current_roster

    return {
        "map": request.map_name,
        "total_score": best_score,
        "roster": best_roster
    }
