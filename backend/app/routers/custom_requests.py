import os
import re
import smtplib
import uuid
import logging
from email.message import EmailMessage
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import EmailStr
from dotenv import load_dotenv
from ..deps import current_user_id

load_dotenv()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB per file
MAX_FILES = 5

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/custom-requests", tags=["custom"])

# Extensii permise pentru upload (whitelist)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".stl", ".obj", ".step", ".stp"}

@router.post("")
async def create_custom_request(
    email: EmailStr = Form(...),
    description: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    user_id: int = Depends(current_user_id),
):
    if files and len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maxim {MAX_FILES} fisiere permise per cerere")

    req_id = uuid.uuid4().hex

    saved_paths = []
    if files:
        folder = os.path.join(UPLOAD_DIR, f"custom_{req_id}")
        os.makedirs(folder, exist_ok=True)
        try:
            for uf in files:
                original_name = uf.filename or ""
                safe_name = os.path.basename(original_name.replace('\\', '/'))
                if not safe_name or safe_name in ('.', '..'):
                    safe_name = f"file_{uuid.uuid4().hex}"

                # Verifica extensia fata de whitelist
                ext = os.path.splitext(safe_name)[1].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Tip fisier nepermis: {ext}. Permise: {', '.join(ALLOWED_EXTENSIONS)}"
                    )

                name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
                path = os.path.join(folder, name)
                content = b""
                async for chunk in uf:
                    content += chunk
                    if len(content) > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Fisierul '{safe_name}' depaseste limita de {MAX_FILE_SIZE // (1024*1024)} MB"
                        )

                with open(path, "wb") as out:
                    out.write(content)
                saved_paths.append(path)

        except HTTPException:
            import shutil
            shutil.rmtree(folder, ignore_errors=True)
            raise

    host = os.getenv("SMTP_HOST"); user = os.getenv("SMTP_USER"); pwd = os.getenv("SMTP_PASS")
    port = int(os.getenv("SMTP_PORT", "587"))
    sender = os.getenv("SMTP_FROM", "no-reply@example.com")
    admins = (os.getenv("ADMIN_EMAILS") or "").split(",")
    sent = False
    if host and user and pwd and admins and admins[0]:
        try:
            msg = EmailMessage()
            msg["Subject"] = f"Custom product request #{req_id[:8]}"
            msg["From"] = sender
            msg["To"] = ", ".join([a.strip() for a in admins if a.strip()])
            body = f"From: {email}\nDescription: {description or ''}\nFiles: {len(saved_paths)}"
            msg.set_content(body)
            for p in saved_paths[:MAX_FILES]:
                with open(p, "rb") as fh:
                    data = fh.read()
                msg.add_attachment(data, maintype="application", subtype="octet-stream", filename=os.path.basename(p))
            with smtplib.SMTP(host, port) as s:
                s.starttls()
                s.login(user, pwd)
                s.send_message(msg)
            sent = True
        except Exception as e:
            logger.error("Failed to send custom request email: %s", e)
            sent = False

    return {"id": req_id, "saved_files": len(saved_paths), "email_sent": sent}
