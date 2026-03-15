"""
Additional API routes for voice transcription, document extraction, and task parsing
"""
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import os
from anthropic import Anthropic
import pypdf
import docx
import tempfile
import base64
import csv
import json
import io

router = APIRouter()


class ParseTasksRequest(BaseModel):
    text: str


class TaskExtract(BaseModel):
    name: str
    description: str
    frequency: str
    time_per_task: int
    category: str
    complexity: str


class ParsedTasksResponse(BaseModel):
    workflow_name: str
    workflow_description: str
    tasks: List[TaskExtract]


# All supported image media types for Claude Vision
IMAGE_MEDIA_TYPES = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/png',    # convert via re-encode
    'tiff': 'image/png',
    'tif': 'image/png',
    'heic': 'image/jpeg',
    'heif': 'image/jpeg',
    'avif': 'image/png',
    'svg': 'image/png',
    'ico': 'image/png',
}

# All supported text/document formats
TEXT_EXTENSIONS = {
    'txt', 'md', 'markdown', 'rst', 'rtf',
    'csv', 'tsv',
    'json', 'jsonl',
    'xml', 'html', 'htm',
    'yaml', 'yml',
    'log',
}


def extract_text_from_file(file_path: str, filename: str) -> str:
    """Extract text from 20+ document and image formats"""
    ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''

    try:
        # ── Plain text variants ────────────────────────────────────────────
        if ext in TEXT_EXTENSIONS:
            if ext in ('csv', 'tsv'):
                delimiter = '\t' if ext == 'tsv' else ','
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    reader = csv.reader(f, delimiter=delimiter)
                    rows = list(reader)
                lines = []
                if rows:
                    lines.append(' | '.join(str(c) for c in rows[0]))  # header
                    for row in rows[1:]:
                        lines.append(' | '.join(str(c) for c in row))
                return '\n'.join(lines)

            if ext == 'json':
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    data = json.load(f)
                return json.dumps(data, indent=2, ensure_ascii=False)

            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                return f.read()

        # ── PDF ───────────────────────────────────────────────────────────
        elif ext == 'pdf':
            text = ""
            with open(file_path, 'rb') as f:
                pdf_reader = pypdf.PdfReader(f)
                for page in pdf_reader.pages:
                    text += (page.extract_text() or '') + "\n"
            return text.strip() or "[PDF had no extractable text — may be scanned]"

        # ── Word documents ────────────────────────────────────────────────
        elif ext in ('doc', 'docx'):
            doc = docx.Document(file_path)
            parts = []
            for para in doc.paragraphs:
                if para.text.strip():
                    parts.append(para.text)
            for table in doc.tables:
                for row in table.rows:
                    parts.append(' | '.join(c.text.strip() for c in row.cells if c.text.strip()))
            return '\n'.join(parts)

        # ── ODT (LibreOffice) ─────────────────────────────────────────────
        elif ext == 'odt':
            try:
                from odf.opendocument import load as odf_load
                from odf.text import P
                from odf.element import Element
                doc = odf_load(file_path)
                texts = []
                for elem in doc.text.getElementsByType(P):
                    t = elem.plaintext() if hasattr(elem, 'plaintext') else str(elem)
                    if t.strip():
                        texts.append(t.strip())
                return '\n'.join(texts) if texts else "[ODT: no text extracted]"
            except ImportError:
                # Fallback: read raw XML
                import zipfile, re as _re
                with zipfile.ZipFile(file_path) as z:
                    with z.open('content.xml') as f:
                        raw = f.read().decode('utf-8', errors='replace')
                return _re.sub(r'<[^>]+>', ' ', raw)

        # ── Excel ─────────────────────────────────────────────────────────
        elif ext in ('xls', 'xlsx', 'xlsm', 'xlsb', 'ods'):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                parts = []
                for sheet_name in wb.sheetnames:
                    ws = wb[sheet_name]
                    parts.append(f"=== Sheet: {sheet_name} ===")
                    for row in ws.iter_rows(values_only=True):
                        if any(c is not None for c in row):
                            parts.append(' | '.join(str(c) if c is not None else '' for c in row))
                return '\n'.join(parts)
            except Exception:
                # Try xlrd for older xls
                try:
                    import xlrd
                    wb = xlrd.open_workbook(file_path)
                    parts = []
                    for sheet in wb.sheets():
                        parts.append(f"=== Sheet: {sheet.name} ===")
                        for rx in range(sheet.nrows):
                            parts.append(' | '.join(str(sheet.cell_value(rx, cx)) for cx in range(sheet.ncols)))
                    return '\n'.join(parts)
                except Exception as e:
                    raise ValueError(f"Could not read spreadsheet: {e}")

        # ── PowerPoint ────────────────────────────────────────────────────
        elif ext in ('ppt', 'pptx'):
            try:
                from pptx import Presentation
                prs = Presentation(file_path)
                parts = []
                for i, slide in enumerate(prs.slides, 1):
                    parts.append(f"=== Slide {i} ===")
                    for shape in slide.shapes:
                        if hasattr(shape, 'text') and shape.text.strip():
                            parts.append(shape.text.strip())
                return '\n'.join(parts)
            except ImportError:
                raise ValueError("pptx support requires python-pptx — install it on the server")

        # ── Images — all formats via Claude Vision ────────────────────────
        elif ext in IMAGE_MEDIA_TYPES:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured for image OCR")

            # For formats Claude Vision doesn't natively support, convert to PNG first
            native_formats = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if ext not in native_formats:
                try:
                    from PIL import Image as PILImage
                    img = PILImage.open(file_path).convert('RGB')
                    converted_path = file_path + '_converted.png'
                    img.save(converted_path, 'PNG')
                    read_path = converted_path
                    media_type = 'image/png'
                except ImportError:
                    read_path = file_path
                    media_type = IMAGE_MEDIA_TYPES.get(ext, 'image/png')
            else:
                read_path = file_path
                media_type = IMAGE_MEDIA_TYPES[ext]

            with open(read_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')

            client = Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": image_data}
                        },
                        {
                            "type": "text",
                            "text": "Extract ALL text from this image. Return ONLY the extracted text, preserving structure. If this is a workflow, task list, or process diagram, preserve all labels and steps."
                        }
                    ]
                }]
            )
            return message.content[0].text

        else:
            raise ValueError(f"Unsupported file type: .{ext}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    return {"transcription": "Please describe your workflow tasks manually for now."}


@router.post("/extract-tasks")
async def extract_tasks_from_document(file: UploadFile = File(...)):
    """Extract text from uploaded document — supports 20+ formats"""
    ext = (file.filename or '').rsplit('.', 1)[-1].lower()
    suffix = f".{ext}" if ext else ""

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = extract_text_from_file(tmp_path, file.filename or "upload")
        return {"text": text}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        converted = tmp_path + '_converted.png'
        if os.path.exists(converted):
            os.remove(converted)


@router.post("/parse-tasks", response_model=ParsedTasksResponse)
async def parse_tasks_from_text(request: ParseTasksRequest):
    """Use AI to parse tasks from free-form text with McKinsey-grade extraction"""

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = Anthropic(api_key=api_key)

    prompt = f"""You are a senior McKinsey consultant specializing in workflow analysis and AI automation strategy.

USER INPUT:
{request.text}

Extract a structured, exhaustive task inventory from this input. Be a rigorous analyst:
- Decompose vague activities into atomic, measurable tasks
- Infer frequencies and time estimates from context clues
- Distinguish operational tasks from strategic ones
- Do not collapse distinct activities into one task

Respond ONLY with this exact JSON (no markdown, no code fences, no commentary):
{{
  "workflow_name": "Concise professional name (3-6 words)",
  "workflow_description": "One sharp sentence: who does what and why. Business-analyst tone.",
  "tasks": [
    {{
      "name": "Action-verb task name (e.g. 'Reconcile monthly expense reports')",
      "description": "What exactly happens, what inputs/outputs are involved, who is accountable",
      "frequency": "daily|weekly|monthly",
      "time_per_task": 30,
      "category": "data_entry|communication|analysis|creative|administrative|general",
      "complexity": "low|medium|high"
    }}
  ]
}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])

        parsed = json.loads(response_text)
        return ParsedTasksResponse(**parsed)

    except Exception as e:
        print(f"Error parsing tasks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse tasks: {str(e)}")
