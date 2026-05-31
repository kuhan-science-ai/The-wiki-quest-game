from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class HiddenItem(BaseModel):
    triggerKeyword: str = Field(description="Keyword in the page text/links that triggers looting this item")
    itemName: str = Field(description="Name of the looted video game style item")
    rarity: str = Field(description="Rarity of the item: Common, Uncommon, Rare, Epic, Legendary")
    effect: Dict[str, int] = Field(description="Character stat boost, e.g. {'STR': 5} or {'INT': 3}. Can modify STR, INT, CHA, or CON")

class WikiPageResponse(BaseModel):
    title: str
    html: str
    text: str
    attributeZone: str = Field(description="The attribute zone this article maps to: CON, INT, STR, or CHA")
    xpReward: int = Field(description="An integer score between 10 and 100 based on the text depth and complexity")
    hiddenItems: List[HiddenItem] = Field(default_factory=list, description="List of up to 2 items hidden in the article links")
    loreSnippet: str = Field(description="A witty, 1-sentence description contextualizing the article like a video game item/location description")

class TransitionValidationRequest(BaseModel):
    fromPage: str
    toPage: str
    deviceMetadata: Dict[str, str] = Field(description="Contains details like userAgent, clientTimestamp, lastActionTimestamp")
    gpsLocation: Dict[str, float] = Field(description="Contains latitude and longitude, or simulated coordinates")
    currentStats: Dict[str, int] = Field(description="Current stats of the player: level, xp, STR, INT, CHA, CON")

class TransitionValidationResponse(BaseModel):
    isValid: bool = Field(description="Whether the transition is verified as legit and not spoofed")
    reason: str = Field(description="Detailed reason explaining the decision")
    dmNarration: str = Field(description="Dungeon Master narrative explaining what happened (e.g. anti-cheat catch or standard path traversal)")
