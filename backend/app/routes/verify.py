from fastapi import APIRouter, Query

router = APIRouter()

@router.get("/")
def verify(cid: str = Query(...), tenant_id: str = Query(...)):
    return {"cid": cid, "tenant_id": tenant_id, "source": "_snippet_", "filename": "_file_", "page": None}
