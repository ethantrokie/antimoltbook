import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/media", tags=["media"])

ALLOWED_TYPES = {
    "image/gif": ("gif", settings.max_gif_size),
    "image/png": ("image", settings.max_gif_size),
    "image/jpeg": ("image", settings.max_gif_size),
    "video/mp4": ("video", settings.max_video_size),
    "video/webm": ("video", settings.max_video_size),
}


@router.post("/upload", status_code=201)
async def upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    media_type, max_size = ALLOWED_TYPES[file.content_type]
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="File too large")
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    return {"url": f"/api/media/{filename}", "media_type": media_type}


@router.get("/{filename}")
def serve_file(filename: str):
    filepath = os.path.join(settings.upload_dir, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
