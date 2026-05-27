import os
import random  # <-- ADD THIS LINE HERE
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

# Load the hidden variables from your .env file
load_dotenv()

app = FastAPI(
    title="Valorant Advanced Optimization Engine",
    root_path=""
)

# --- 1. Configuration & Constants ---
# Safely pull the key from the environment instead of hardcoding it
HENRIK_API_KEY = os.getenv("HENRIK_API_KEY") 

if not HENRIK_API_KEY:
    print("CRITICAL WARNING: API Key is missing. Check your .env file or Render variables.")

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

# --- 2. Input Data Models ---
class PlayerInput(BaseModel):
    name: str
    tag: str

class OptimizationRequest(BaseModel):
    region: str
    map_name: str
    players: List[PlayerInput]

# --- 3. Asynchronous Data Ingestion Engine ---
async def fetch_single_player_mastery(
    client: httpx.AsyncClient, region: str, name: str, tag: str, target_map: str
):
    safe_name = urllib.parse.quote(name.strip())
    safe_tag = urllib.parse.quote(tag.strip())
    url = f"{API_BASE_URL}/{region}/{safe_name}/{safe_tag}"
    headers = {"Authorization": HENRIK_API_KEY}
    # Removed the 'map' parameter here to avoid case-sensitive API drops.
    params = {"mode": "competitive"}

    try:
        await asyncio.sleep(random.uniform(0.1, 0.8))
        response = await client.get(url, headers=headers, params=params, timeout=15.0)

        if response.status_code != 200:
            print(f"API Error for {name}#{tag}: {response.status_code}")
            return f"{name}#{tag}", {}

        data = response.json().get("data", [])
        if not data:
            return f"{name}#{tag}", {}

        records = []
        for match in data:
            meta = match.get("meta", {})
            match_map = meta.get("map", {}).get("name", "")
            
            # Manual python map filtering (case-insensitive)
            if match_map.lower() != target_map.lower():
                continue

            stats = match.get("stats", {})
            player_team = stats.get("team", "")
            teams = match.get("teams", {})

            # Bulletproof team score extraction (handles red vs Red, blue vs Blue)
            player_score = teams.get(player_team.lower(), 0)
            enemy_team = "blue" if player_team.lower() == "red" else "red"
            enemy_score = teams.get(enemy_team, 0)
            won = 1 if player_score > enemy_score else 0

            # Bulletproof agent name extraction
            agent_name = stats.get("character", {}).get("name", "").title()
            # Edge case fix for KAY/O
            if agent_name == "Kay/O": agent_name = "KAY/O"

            records.append({ "agent": agent_name, "win": won })

        if not records:
            return f"{name}#{tag}", {}

        df = pd.DataFrame(records)
        summary = (
            df.groupby("agent")
            .agg(matches_played=("win", "count"), wins=("win", "sum"))
            .reset_index()
        )

        summary["mastery_score"] = (
            (summary["matches_played"] * 10) + (summary["wins"] * 25)
        ).astype(int)

        mastery_map = dict(zip(summary["agent"], summary["mastery_score"]))
        return f"{name}#{tag}", mastery_map

    except Exception as e:
        print(f"Exception while pulling data for {name}#{tag}: {str(e)}")
        return f"{name}#{tag}", {}

# --- 4. Core API Optimization Endpoint ---
@app.post("/api/optimize")
async def optimize_roster(request: OptimizationRequest):
    if len(request.players) != 5:
        raise HTTPException(status_code=400, detail="Exactly 5 players are required.")

    blueprint = MAP_BLUEPRINTS.get(request.map_name)
    if not blueprint:
        raise HTTPException(
            status_code=400, detail=f"Strategic blueprint for {request.map_name} not found."
        )

    player_profiles = {}

    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_single_player_mastery(
                client, request.region, player.name, player.tag, request.map_name
            )
            for player in request.players
        ]
        results = await asyncio.gather(*tasks)

        for player_identifier, mastery_map in results:
            player_profiles[player_identifier] = mastery_map

    best_score = -1
    best_roster = []
    player_keys = list(player_profiles.keys())

    for permutation in itertools.permutations(player_keys):
        current_team_score = 0
        current_roster = []

        for index, player_id in enumerate(permutation):
            target_role = blueprint["roles"][index]
            
            best_agent_for_role = "No Data / Unplayed"
            highest_role_score = -1 
            
            for played_agent, score in player_profiles[player_id].items():
                if AGENT_ROLES.get(played_agent) == target_role and score > highest_role_score:
                    highest_role_score = score
                    best_agent_for_role = played_agent
            
            current_team_score += highest_role_score if highest_role_score != -1 else 0
            current_roster.append(
                {
                    "player": player_id,
                    "role": target_role,
                    "agent": best_agent_for_role,
                    "score": highest_role_score if highest_role_score != -1 else 0,
                }
            )

        if current_team_score > best_score:
            best_score = current_team_score
            best_roster = current_roster

    return {
        "map": request.map_name,
        "total_score": best_score,
        "roster": best_roster,
    }

app.add_middleware(
    CORSMiddleware,
    # Ensure there is absolutely NO trailing slash at the end of the Vercel URL here
    allow_origins=[
        "https://valorant-roster-assigner.vercel.app", 
        "http://localhost:5173", 
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
