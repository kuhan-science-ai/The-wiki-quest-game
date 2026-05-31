import os
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from models import WikiPageResponse, TransitionValidationRequest, TransitionValidationResponse
from services import WikiQuestService

app = FastAPI(
    title="WikiQuest: Potato Edition API",
    description="Backend API for the WikiQuest text RPG gamified Wikipedia browser",
    version="1.0.0"
)

# Configure CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the client origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the WikiQuest: Potato Edition API. Adventure awaits!"}

@app.get("/api/wiki/{page_title}", response_model=WikiPageResponse)
async def get_wiki_page(page_title: str):
    """
    Scrapes a Wikipedia page summary and parses it with the AI Dungeon Master.
    """
    try:
        # Fetch summary data from Wikimedia
        summary_data = await WikiQuestService.fetch_wikipedia_summary(page_title)
        
        # Extract fields
        title = summary_data.get("title", page_title)
        extract_html = summary_data.get("extract_html", f"<p>{summary_data.get('extract', '')}</p>")
        extract_text = summary_data.get("extract", "")
        
        # Fetch related pages to append as portals, guaranteeing clickable hyperlinks
        try:
            related = await WikiQuestService.fetch_wikipedia_related(page_title)
            if related:
                portals_html = '<div class="mt-6 pt-4 border-t border-slate-800/80"><h4 class="text-xs font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1">🔮 Discovered Portal Links:</h4><div class="flex flex-wrap gap-2">'
                for r_page in related[:8]: # top 8 related pages
                    r_title = r_page.get("title", "")
                    r_display = r_page.get("displaytitle", r_title).replace("_", " ")
                    portals_html += f'<a href="./{r_title}" class="inline-block px-3 py-1.5 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/30 hover:border-purple-500 rounded-lg text-purple-400 font-bold text-xs transition-colors">{r_display}</a>'
                portals_html += '</div></div>'
                extract_html += portals_html
        except Exception as rel_err:
            print(f"Failed to append related links: {rel_err}")
            
        # Run AI parsing
        parsed_page = await WikiQuestService.parse_page_with_dm(title, extract_html, extract_text)
        return parsed_page
        
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process page: {str(e)}")

@app.post("/api/validate-transition", response_model=TransitionValidationResponse)
async def validate_transition(request: TransitionValidationRequest):
    """
    Validates a link transition to verify anti-cheat and generate narrative.
    """
    try:
        validation_result = await WikiQuestService.validate_transition(request)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate transition: {str(e)}")

if __name__ == "__main__":
    # Start the server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
