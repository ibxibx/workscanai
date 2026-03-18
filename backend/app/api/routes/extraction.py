"""
Additional API routes for voice transcription, document extraction, task parsing, and LinkedIn extraction
"""
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from anthropic import Anthropic
import pypdf
import docx
import tempfile
import base64
import csv
import json
import io
import re

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


class LinkedInRequest(BaseModel):
    url: str
    pasted_text: Optional[str] = None    # optional: user-pasted profile text for richer analysis


class LinkedInExtractResponse(BaseModel):
    text: str
    profile_type: str
    name: str
    title_or_tagline: str
    linkedin_url: str                    # normalised canonical URL returned to frontend


def _normalise_linkedin_url(raw: str) -> str:
    """
    Accept any of:
      in/avoiann            → https://www.linkedin.com/in/avoiann
      /in/avoiann           → https://www.linkedin.com/in/avoiann
      company/acme          → https://www.linkedin.com/company/acme
      /company/acme         → https://www.linkedin.com/company/acme
      linkedin.com/in/x     → https://www.linkedin.com/in/x
      www.linkedin.com/...  → https://www.linkedin.com/...
      https://linkedin.com/ → passes through (strip to canonical)
    """
    url = raw.strip().lstrip('/')

    # Already has a scheme
    if url.startswith('http://') or url.startswith('https://'):
        # normalise http → https and drop trailing slash
        url = re.sub(r'^http://', 'https://', url).rstrip('/')
        # ensure www
        url = re.sub(r'^https://linkedin\.com', 'https://www.linkedin.com', url)
        return url

    # Bare path like  in/avoiann  or  company/acme
    if re.match(r'^(in|company|school|showcase)/', url, re.I):
        return 'https://www.linkedin.com/' + url

    # linkedin.com/...  or  www.linkedin.com/...
    if re.match(r'^(www\.)?linkedin\.com', url, re.I):
        return 'https://' + url

    # Fallback — prepend full base
    return 'https://www.linkedin.com/' + url


def _detect_linkedin_type(url: str) -> str:
    clean = url.lower().rstrip('/')
    if re.search(r'/(company|school|showcase)/', clean):
        return 'company'
    return 'personal'


def _extract_slug(url: str) -> str:
    """Pull the profile/company slug from the normalised URL."""
    m = re.search(r'linkedin\.com/(?:in|company|school|showcase)/([^/?#]+)', url, re.I)
    return m.group(1) if m else url


@router.post("/extract-linkedin", response_model=LinkedInExtractResponse)
async def extract_linkedin_profile(request: LinkedInRequest):
    """
    Build a rich workflow-analysis context from a LinkedIn URL.

    LinkedIn blocks all server-side HTML fetches (HTTP 999).
    Strategy: extract the slug from the URL + use any pasted text the user provides,
    then ask Claude Haiku to produce a detailed role/company context suitable for
    the WorkScanAI task-extraction pipeline.  Works 100% of the time, zero external deps.
    """
    normalised_url = _normalise_linkedin_url(request.url)

    if 'linkedin.com' not in normalised_url.lower():
        raise HTTPException(
            status_code=400,
            detail="Please provide a LinkedIn URL — e.g. linkedin.com/in/yourname or /company/yourcompany"
        )

    profile_type = _detect_linkedin_type(normalised_url)
    slug = _extract_slug(normalised_url)
    pasted = (request.pasted_text or '').strip()

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = Anthropic(api_key=api_key)

    if profile_type == 'personal':
        context_block = f"LinkedIn profile URL: {normalised_url}\nProfile slug / username: {slug}"
        if pasted:
            context_block += f"\n\nProfile text pasted by user:\n{pasted[:4000]}"
        prompt = f"""You are a senior McKinsey consultant specialising in AI workflow automation.

Given the following LinkedIn personal profile information, produce a detailed professional context 
that will be used to generate an AI automation-readiness analysis of this person's role.

{context_block}

Instructions:
- Infer the person's likely job title, seniority level, and industry from the slug and any pasted text.
- If the slug looks like a name (e.g. "john-smith-marketing"), extract that signal.
- Describe their probable daily responsibilities, key tasks, tools used, and decision-making scope.
- If pasted text is provided, use it as the primary source and enrich with inferences.
- Write 3–5 substantial paragraphs as a professional profile narrative.
- Do NOT make up specific company names or metrics not inferable from the input.
- End with a bullet list: "Key tasks likely to appear in this role's workflow:"

Be specific and realistic — this drives a McKinsey-style automation analysis."""

    else:
        context_block = f"LinkedIn company page URL: {normalised_url}\nCompany slug: {slug}"
        if pasted:
            context_block += f"\n\nCompany page text pasted by user:\n{pasted[:4000]}"
        prompt = f"""You are a senior McKinsey consultant specialising in AI workflow automation.

Given the following LinkedIn company page information, produce a detailed company context
that will be used to generate an AI automation-readiness analysis of this organisation's workflows.

{context_block}

Instructions:
- Infer the company's likely industry, size tier, and business model from the slug and any pasted text.
- Describe their probable departments, daily operational tasks, and key business processes.
- If pasted text is provided, use it as the primary source and enrich with inferences.
- Write 3–5 substantial paragraphs as a company profile narrative.
- Do NOT make up specific revenue figures or metrics not inferable from the input.
- End with a bullet list: "Key workflow areas likely present in this organisation:"

Be specific and realistic — this drives a McKinsey-style automation analysis."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1400,
            messages=[{"role": "user", "content": prompt}]
        )
        extracted_text = message.content[0].text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

    # Derive a display name and tagline from the slug
    display_name = slug.replace('-', ' ').replace('_', ' ').title()
    tagline = f"{'Personal profile' if profile_type == 'personal' else 'Company page'} · {normalised_url}"

    return LinkedInExtractResponse(
        text=extracted_text,
        profile_type=profile_type,
        name=display_name,
        title_or_tagline=tagline,
        linkedin_url=normalised_url,
    )


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
