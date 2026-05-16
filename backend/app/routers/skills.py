import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from app.deps import get_current_user, get_service_client
from app.models.schemas import SkillCreateReq, SkillUpdateReq

router = APIRouter(prefix="/api/skills", tags=["skills"])


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


# ── CRUD ────────────────────────────────────────────────

@router.get("")
async def list_skills(user: dict = Depends(get_current_user)):
    """Return the user's own skills plus all public skills."""
    svc = get_service_client()
    own = (
        svc.table("skills")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    public = (
        svc.table("skills")
        .select("*")
        .eq("is_public", True)
        .neq("user_id", user["id"])
        .order("usage_count", desc=True)
        .execute()
    )
    return {"own": own.data or [], "public": public.data or []}


@router.get("/search")
async def search_skills(
    q: str = "",
    user: dict = Depends(get_current_user),
):
    svc = get_service_client()
    query = svc.table("skills").select("*")
    if q:
        query = query.or_(
            f"name.ilike.%{q}%,description.ilike.%{q}%,slug.ilike.%{q}%"
        )
    query = query.or_(
        f"user_id.eq.{user['id']},is_public.eq.true"
    )
    result = query.order("usage_count", desc=True).limit(20).execute()
    return result.data or []


@router.get("/{skill_id}")
async def get_skill(skill_id: str, user: dict = Depends(get_current_user)):
    svc = get_service_client()
    result = (
        svc.table("skills")
        .select("*")
        .eq("id", skill_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill = result.data
    if not skill["is_public"] and skill["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return skill


@router.post("")
async def create_skill(body: SkillCreateReq, user: dict = Depends(get_current_user)):
    svc = get_service_client()
    slug = _slugify(body.name)
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid skill name")

    existing = (
        svc.table("skills")
        .select("id")
        .eq("user_id", user["id"])
        .eq("slug", slug)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail=f"Skill '@{slug}' already exists")

    row = {
        "user_id": user["id"],
        "name": body.name.strip(),
        "slug": slug,
        "description": (body.description or "").strip() or None,
        "prompt": body.prompt.strip(),
        "category": body.category or "custom",
        "is_public": body.is_public or False,
        "tags": body.tags or [],
    }
    result = svc.table("skills").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create skill")
    return result.data[0]


@router.patch("/{skill_id}")
async def update_skill(
    skill_id: str, body: SkillUpdateReq, user: dict = Depends(get_current_user)
):
    svc = get_service_client()
    existing = (
        svc.table("skills")
        .select("*")
        .eq("id", skill_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Skill not found or not yours")

    updates = {}
    if body.name is not None:
        updates["name"] = body.name.strip()
        updates["slug"] = _slugify(body.name)
    if body.description is not None:
        updates["description"] = body.description.strip() or None
    if body.prompt is not None:
        updates["prompt"] = body.prompt.strip()
    if body.category is not None:
        updates["category"] = body.category
    if body.is_public is not None:
        updates["is_public"] = body.is_public
    if body.tags is not None:
        updates["tags"] = body.tags

    if not updates:
        return existing.data

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    svc.table("skills").update(updates).eq("id", skill_id).execute()

    return {**existing.data, **updates}


@router.delete("/{skill_id}")
async def delete_skill(skill_id: str, user: dict = Depends(get_current_user)):
    svc = get_service_client()
    existing = (
        svc.table("skills")
        .select("id")
        .eq("id", skill_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Skill not found or not yours")

    svc.table("skills").delete().eq("id", skill_id).execute()
    return {"message": "Skill deleted"}


# ── Resolve @skill slugs → prompts for the AI engine ──

@router.post("/resolve")
async def resolve_skills(
    slugs: list[str],
    user: dict = Depends(get_current_user),
):
    """Given a list of slugs, return their prompts."""
    if not slugs:
        return []
    svc = get_service_client()
    result = (
        svc.table("skills")
        .select("slug, name, prompt")
        .in_("slug", slugs)
        .or_(f"user_id.eq.{user['id']},is_public.eq.true")
        .execute()
    )
    # Bump usage count
    for skill in result.data or []:
        svc.table("skills").update(
            {"usage_count": skill.get("usage_count", 0) + 1}
        ).eq("slug", skill["slug"]).execute()

    return result.data or []

@router.post("/install")
async def install_skill(body: dict, user: dict = Depends(get_current_user)):
    url = body.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Simple logic to simulate "installing" from skills.sh or github
    # In a real app, we would fetch the metadata from the URL
    import httpx
    async with httpx.AsyncClient() as client:
        try:
            # If it's github, try to get the SKILL.md
            if "github.com" in url:
                raw_url = url.replace("github.com", "raw.githubusercontent.com").rstrip("/") + "/main/SKILL.md"
                resp = await client.get(raw_url)
                if resp.status_code == 200:
                    content = resp.text
                    # Extract name/description from frontmatter
                    name_match = re.search(r"name:\s*(.*)", content)
                    desc_match = re.search(r"description:\s*(.*)", content)
                    name = name_match.group(1) if name_match else url.split("/")[-1]
                    desc = desc_match.group(1) if desc_match else "Imported skill"
                    prompt = content

                    return await create_skill(
                        SkillCreateReq(name=name, description=desc, prompt=prompt),
                        user
                    )
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Failed to fetch skill: {str(e)}")

    raise HTTPException(status_code=400, detail="Could not install skill from this URL")
