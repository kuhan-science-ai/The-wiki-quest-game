import os
import re
import json
import time
import httpx
import google.generativeai as genai
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from models import WikiPageResponse, HiddenItem, TransitionValidationResponse

load_dotenv()

# Setup Gemini Config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class WikiQuestService:
    @staticmethod
    async def fetch_wikipedia_summary(page_title: str) -> Dict[str, Any]:
        """
        Queries the official Wikimedia REST API to fetch summary JSON (which includes HTML and text).
        """
        # Clean title for Wikipedia API
        sanitized_title = page_title.strip().replace(" ", "_")
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{sanitized_title}"
        
        headers = {
            "User-Agent": "WikiQuestPotatoEdition/1.0 (contact@example.com) HTTPX/0.24"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            if response.status_code == 404:
                raise ValueError(f"Wikipedia page '{page_title}' not found.")
            response.raise_for_status()
            return response.json()

    @staticmethod
    def get_mock_dm_parse(title: str, text: str) -> WikiPageResponse:
        """
        Generates simulated RPG values if no LLM API key is present.
        """
        # Determine attribute zone based on keywords in title/text
        text_lower = (title + " " + text).lower()
        
        if any(w in text_lower for w in ["war", "battle", "empire", "soldier", "conquest", "history", "king", "army", "general"]):
            zone = "STR"
        elif any(w in text_lower for w in ["science", "theory", "discovery", "physics", "math", "chemistry", "space", "study", "university"]):
            zone = "INT"
        elif any(w in text_lower for w in ["art", "music", "pop", "film", "actor", "celebrity", "writer", "literature", "game", "culture"]):
            zone = "CHA"
        else:
            zone = "CON"  # Agriculture, nature, standard potato things
            
        # Calculate XP reward based on length of text
        xp = min(100, max(10, int(len(text) / 20)))
        
        # Generate some hidden items
        items = []
        words = re.findall(r'\b\w{5,10}\b', text)
        keywords = list(set([w for w in words if w.lower() not in ["about", "their", "there", "would", "which", "other"]]))
        
        if len(keywords) > 0:
            items.append(HiddenItem(
                triggerKeyword=keywords[0],
                itemName=f"{title} Scepter" if zone == "CHA" else f"{title} Shield" if zone == "STR" else f"Tome of {title}" if zone == "INT" else f"Organic {title}",
                rarity="Common" if xp < 40 else "Uncommon" if xp < 70 else "Rare",
                effect={zone: 2 if xp < 45 else 4}
            ))
            
        if len(keywords) > 1 and len(text) > 400:
            items.append(HiddenItem(
                triggerKeyword=keywords[1],
                itemName=f"Legacy of {title}",
                rarity="Epic" if xp > 80 else "Rare",
                effect={"STR" if zone != "STR" else "INT": 5}
            ))
            
        lore = f"You step into the zone of '{title}', where the air smells of ancient facts and starchy secrets."
        
        return WikiPageResponse(
            title=title,
            html=f"<p>{text}</p>",
            text=text,
            attributeZone=zone,
            xpReward=xp,
            hiddenItems=items,
            loreSnippet=lore
        )

    @classmethod
    async def parse_page_with_dm(cls, title: str, html: str, text: str) -> WikiPageResponse:
        """
        Sends the page details to the LLM (Gemini or OpenAI) to parse it into the RPG format.
        """
        if not GEMINI_API_KEY and not OPENAI_API_KEY:
            return cls.get_mock_dm_parse(title, text)
            
        prompt = f"""
        You are the Dungeon Master for 'WikiQuest: Potato Edition', a web-based text RPG where Wikipedia is the map.
        Analyze the following Wikipedia page summary and parse it into an RPG region.
        
        Page Title: {title}
        Page Summary: {text}
        
        Follow these strict instructions to populate the response:
        1. 'attributeZone': Map the page to one of:
           - 'CON' (Agriculture, nature, plants, biological structures, raw materials)
           - 'INT' (Science, technology, research, mathematics, philosophy)
           - 'STR' (War, military history, conquerors, physics, physical power, conflicts)
           - 'CHA' (Art, music, movies, popular culture, actors, literature, persuasion)
        2. 'xpReward': An integer from 10 to 100 based on the length/depth of the text.
        3. 'hiddenItems': Generate up to 2 items that are hidden in the page links or key terms. Each item must have:
           - 'triggerKeyword': A specific word from the summary text or title.
           - 'itemName': A witty, themed name (e.g. 'Starchy Crown' or 'Sword of Solanum').
           - 'rarity': Common, Uncommon, Rare, Epic, or Legendary.
           - 'effect': A dictionary specifying a stat boost (e.g. {{"STR": 3}} or {{"INT": 5}} or {{"CON": 4}} or {{"CHA": 2}}).
        4. 'loreSnippet': A witty, 1-sentence description contextualizing the article like a video game item or dungeon description.
        """
        
        try:
            if GEMINI_API_KEY:
                # Use Google Generative AI SDK with structured outputs
                model = genai.GenerativeModel(model_name=MODEL_NAME)
                response = model.generate_content(
                    prompt,
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": WikiPageResponse
                    }
                )
                
                # Parse JSON string from response
                data = json.loads(response.text)
                # Populate HTML and Text from the scraper
                data["title"] = title
                data["html"] = html
                data["text"] = text
                return WikiPageResponse(**data)
            
            elif OPENAI_API_KEY:
                # Fallback to OpenAI API with JSON mode
                from openai import OpenAI
                client = OpenAI(api_key=OPENAI_API_KEY)
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": "You are a dungeon master that outputs structured JSON conforming to the requested schema."},
                        {"role": "user", "content": prompt}
                    ]
                )
                data = json.loads(completion.choices[0].message.content)
                data["title"] = title
                data["html"] = html
                data["text"] = text
                return WikiPageResponse(**data)
                
        except Exception as e:
            print(f"Error calling LLM: {e}. Falling back to mock parsing.")
            return cls.get_mock_dm_parse(title, text)

    @classmethod
    async def validate_transition(cls, req: TransitionValidationRequest) -> TransitionValidationResponse:
        """
        Verifies if a player transition between two pages is valid.
        Uses time elapsed, location data, and context continuity.
        """
        # Extract timings
        client_ts = float(req.deviceMetadata.get("clientTimestamp", time.time()))
        last_action_ts = float(req.deviceMetadata.get("lastActionTimestamp", 0.0))
        
        # Calculate time delta in seconds
        time_elapsed = client_ts - last_action_ts
        
        # 1. Simple Client Check: Fast click (under 0.3 seconds) is likely programmatic spoofing
        if last_action_ts > 0 and time_elapsed < 0.3:
            return TransitionValidationResponse(
                isValid=False,
                reason="Temporal Anomalies Detected",
                dmNarration="The chronometers of your portal detect a warp speed of {:.2f}s. A mortal hands cannot click links this quickly. Cheat flag raised!".format(time_elapsed)
            )
            
        # 2. Geography teleportation check (simulated GPS jump)
        # If coordinates jump significantly between standard updates (which should be stationary)
        # Note: In a mock dashboard environment, GPS coordinates might be static. If they jump wildly:
        lat1 = req.gpsLocation.get("latitude", 0.0)
        lon1 = req.gpsLocation.get("longitude", 0.0)
        
        # Let's say we have previous coordinates in device metadata
        lat0 = float(req.deviceMetadata.get("prev_latitude", lat1))
        lon0 = float(req.deviceMetadata.get("prev_longitude", lon1))
        
        # Check distance jump
        import math
        distance = math.sqrt((lat1 - lat0)**2 + (lon1 - lon0)**2) * 111.0 # crude km calculation
        if distance > 100.0 and time_elapsed < 10.0:
            return TransitionValidationResponse(
                isValid=False,
                reason="Coordinate Discrepancy",
                dmNarration=f"You teleported {distance:.1f} km in {time_elapsed:.1f} seconds! The Dungeon Master's eye detects spatial displacement."
            )
            
        # 3. LLM/Context Validation:
        # Cross reference the continuity between fromPage and toPage using the LLM.
        if not GEMINI_API_KEY and not OPENAI_API_KEY:
            # Mock validator:
            # Let's check if the toPage title can be found inside the fromPage or a related keyword
            # Since we don't have the full fromPage, we can just say standard transitions are valid unless time is too low.
            return TransitionValidationResponse(
                isValid=True,
                reason="Transition verified by proxy heuristics.",
                dmNarration=f"You stepped carefully from '{req.fromPage}' and entered the realm of '{req.toPage}'."
            )
            
        prompt = f"""
        You are the automated security scanner and Dungeon Master for 'WikiQuest: Potato Edition'.
        A user has requested a portal jump (hyperlink transition):
        - From Article: {req.fromPage}
        - To Article: {req.toPage}
        - Travel Duration: {time_elapsed:.2f} seconds
        - Current Player Stats: {req.currentStats}
        
        Verify if this transition is likely a legitimate click path (i.e. is '{req.toPage}' a logical concept that would be linked directly or indirectly in the '{req.fromPage}' Wikipedia page?).
        If they warped to an unrelated page in a fraction of a second, flag it as cheating.
        
        Return a JSON object matching the schema:
        {{
            "isValid": boolean,
            "reason": "Explain why this transition is valid or invalid",
            "dmNarration": "A witty, RPG-style narration of the transition (e.g. describing the path they walked, or writing an epic condemnation if they cheated)"
        }}
        """
        
        try:
            if GEMINI_API_KEY:
                model = genai.GenerativeModel(model_name=MODEL_NAME)
                response = model.generate_content(
                    prompt,
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": TransitionValidationResponse
                    }
                )
                data = json.loads(response.text)
                return TransitionValidationResponse(**data)
            elif OPENAI_API_KEY:
                from openai import OpenAI
                client = OpenAI(api_key=OPENAI_API_KEY)
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": "You are a security DM that checks transitions and outputs structured JSON."},
                        {"role": "user", "content": prompt}
                    ]
                )
                data = json.loads(completion.choices[0].message.content)
                return TransitionValidationResponse(**data)
        except Exception as e:
            print(f"Error in validation LLM: {e}")
            return TransitionValidationResponse(
                isValid=True,
                reason="LLM validation failed; bypassed to heuristics.",
                dmNarration=f"You step through the portal from '{req.fromPage}' to '{req.toPage}' under the protection of a fallback shield."
            )
