import os, smtplib, uuid
from email.message import EmailMessage
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv

load_dotenv()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/custom-requests", tags=["custom"])

@router.post("")
async def create_custom_request(
    email: str = Form(...),
    description: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
):
    req_id = str(uuid.uuid4())[:8]
    saved_paths = []
    if files:
        folder = os.path.join(UPLOAD_DIR, f"custom_{req_id}")
        os.makedirs(folder, exist_ok=True)
        for uf in files:
            name = uf.filename or f"file_{uuid.uuid4().hex}"
            path = os.path.join(folder, name)
            with open(path, "wb") as out:
                out.write(await uf.read())
            saved_paths.append(path)

    host = os.getenv("SMTP_HOST"); user = os.getenv("SMTP_USER"); pwd = os.getenv("SMTP_PASS")
    port = int(os.getenv("SMTP_PORT", "587"))
    sender = os.getenv("SMTP_FROM", "no-reply@example.com")
    admins = (os.getenv("ADMIN_EMAILS") or "").split(",")
    sent = False
    if host and user and pwd and admins and admins[0]:
        try:
            msg = EmailMessage()
            msg["Subject"] = f"Custom product request #{req_id}"
            msg["From"] = sender
            msg["To"] = ", ".join([a.strip() for a in admins if a.strip()])
            body = f"From: {email}\nDescription: {description or ''}\nFiles: {len(saved_paths)}"
            msg.set_content(body)
            for p in saved_paths[:5]:
                with open(p, "rb") as fh:
                    data = fh.read()
                msg.add_attachment(data, maintype="application", subtype="octet-stream", filename=os.path.basename(p))
            with smtplib.SMTP(host, port) as s:
                s.starttls()
                s.login(user, pwd)
                s.send_message(msg)
            sent = True
        except Exception:
            sent = False

    return {"id": req_id, "saved_files": saved_paths, "email_sent": sent}
