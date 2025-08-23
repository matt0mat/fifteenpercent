"""
Document synthesis endpoints (OpenAI version).

POST /synth/document
Body:
{
  "topic": "string",
  "num_sections": 5,
  "temperature": 0.7
}

Response:
{
  "topic": "string",
  "num_sections": 5,
  "outline": ["...", "..."],
  "content_md": "# Document: ...\n\n## ...",
  "provider": "openai|builtin",
}
"""

from __future__ import annotations

import os
import time
import logging
from typing import List

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
log = logging.getLogger("synth")

# ---------- Models ----------

class SynthRequest(BaseModel):
    topic: str = Field(..., min_length=3)
    num_sections: int = Field(5, ge=1, le=20)
    temperature: float = Field(0.7, ge=0.0, le=1.0)


class SynthResponse(BaseModel):
    topic: str
    num_sections: int
    outline: List[str]
    content_md: str
    provider: str


# ---------- OpenAI config ----------

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENAI_URL = "https://api.openai.com/v1/chat/completions" if OPENAI_API_KEY else None

# ---------- Helpers ----------

def _parse_numbered_list(text: str) -> List[str]:
    """Extract lines like '1. Foo' or '1) Foo' as section titles."""
    lines: List[str] = []
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        # accept "1. Title" or "1) Title"
        if s[:2].isdigit() or (s and s[0].isdigit()):
            if s.find(".") == 1 or s.find(")") == 1:
                title = s[2:].strip(" \t-•")
                if title:
                    lines.append(title)
    if not lines:
        # fallback: any non-empty line
        lines = [l.strip("-• ").strip() for l in text.splitlines() if l.strip()]
    return lines


async def _openai_chat(prompt: str, *, max_tokens: int, temperature: float) -> str:
    """
    Call OpenAI Chat Completions and return the assistant text.
    Retries with exponential backoff; raises on final failure.
    """
    assert OPENAI_URL and OPENAI_API_KEY

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_MODEL,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": "You are a precise technical writer that outputs clean Markdown."},
            {"role": "user", "content": prompt},
        ],
    }

    backoff = 0.5
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(5):
            try:
                r = await client.post(OPENAI_URL, headers=headers, json=payload)
                r.raise_for_status()
                j = r.json()
                return j["choices"][0]["message"]["content"]  # type: ignore[index]
            except Exception as e:
                if attempt == 4:
                    raise
                log.warning("OpenAI call failed (attempt %s): %s", attempt + 1, e)
                time.sleep(backoff)
                backoff *= 2


async def _outline_openai(topic: str, n: int, temperature: float) -> List[str]:
    prompt = f"""Create a numbered outline with exactly {n} main sections.
Each line must start with '1.' '2.' etc. No intro/outro, no explanations.

Topic: {topic}
"""
    text = await _openai_chat(prompt, max_tokens=400, temperature=temperature)
    return _parse_numbered_list(text)


async def _section_openai(topic: str, section_title: str, temperature: float) -> str:
    prompt = f"""Write a detailed, realistic section for a document.

Overall Topic: {topic}
Section Title: {section_title}

Constraints:
- Use specific, realistic details and example data points.
- Mix short paragraphs and bullet points; include a small table if helpful.
- Output *Markdown only*. Do NOT repeat the section title in the body."""
    return await _openai_chat(prompt, max_tokens=3000, temperature=temperature)


def _outline_builtin(topic: str, n: int) -> List[str]:
    """Deterministic, offline outline if no OpenAI key present."""
    seeds = [
        "Executive Summary",
        "Problem Space & User Personas",
        "Current State Assessment",
        "Data & Constraints",
        "Proposed Solution",
        "Architecture & Components",
        "Implementation Plan",
        "Risks & Mitigations",
        "KPIs & Measurement",
        "Rollout & Training",
        "Budget & Timeline",
        "Appendix",
    ]
    if n <= len(seeds):
        out = seeds[:n]
    else:
        out = seeds + [f"Additional Considerations {i}" for i in range(n - len(seeds))]
    out[0] = f"{out[0]} — {topic}"
    return out


def _section_builtin(topic: str, section_title: str) -> str:
    """Deterministic, offline section body (markdown)."""
    return f"""**Context.** This section covers *{section_title}* in the scope of **{topic}**.

- Key assumptions: clearly listed for auditability
- Inputs and data sources: documents, spreadsheets, APIs
- Expected outputs: dashboards, SOPs, or public artifacts

| Item | Example |
| --- | --- |
| Owner | Team Alpha |
| Review Cadence | Weekly |
| Status | Draft |

> Note: This is offline fallback content. Connect a provider key to generate richer prose.
"""


# ---------- Endpoint ----------

@router.post("/document", response_model=SynthResponse)
async def synthesize_document(req: SynthRequest) -> SynthResponse:
    """
    Build a multi-section markdown document and an outline in one call.
    - Uses OpenAI if OPENAI_API_KEY is set, otherwise a deterministic builtin writer.
    """
    provider = "builtin"
    try:
        if OPENAI_API_KEY:
            provider = "openai"
            outline = await _outline_openai(req.topic, req.num_sections, req.temperature)
            if not outline:
                raise RuntimeError("Empty outline from provider")

            parts: List[str] = [f"# Document: {req.topic}\n"]
            for title in outline:
                body = await _section_openai(req.topic, title, req.temperature)
                parts.append(f"## {title}\n\n{body.strip()}\n")
            content_md = "\n".join(parts)
        else:
            outline = _outline_builtin(req.topic, req.num_sections)
            parts = [f"# Document: {req.topic}\n"]
            for title in outline:
                parts.append(f"## {title}\n\n{_section_builtin(req.topic, title)}\n")
            content_md = "\n".join(parts)

        return SynthResponse(
            topic=req.topic,
            num_sections=req.num_sections,
            outline=outline,
            content_md=content_md,
            provider=provider,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"synthesis_failed: {e}") from e
