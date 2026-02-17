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


def extract_text_from_file(file_path: str, filename: str) -> str:
    """Extract text from various document formats including images using Claude Vision"""
    ext = filename.lower().split('.')[-1]
    
    try:
        if ext == 'txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        elif ext == 'pdf':
            text = ""
            with open(file_path, 'rb') as f:
                pdf_reader = pypdf.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        
        elif ext in ['doc', 'docx']:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        
        elif ext in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
            # Use Claude Vision to extract text from image
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured for image OCR")
            
            # Read image and convert to base64
            with open(file_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            # Determine media type
            media_types = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'webp': 'image/webp'
            }
            media_type = media_types.get(ext, 'image/png')
            
            # Use Claude Vision to extract text
            client = Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data
                            }
                        },
                        {
                            "type": "text",
                            "text": "Please extract all text from this image. Return ONLY the extracted text, nothing else. If this appears to be a workflow, task list, or process description, preserve the structure and formatting."
                        }
                    ]
                }]
            )
            
            return message.content[0].text
        
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio to text using Claude (placeholder - would use Whisper API in production)"""
    # For now, return placeholder
    # In production, you'd use OpenAI Whisper API or similar
    return {
        "transcription": "Please describe your workflow tasks manually for now. Audio transcription will be added soon."
    }


@router.post("/extract-tasks")
async def extract_tasks_from_document(file: UploadFile = File(...)):
    """Extract tasks from uploaded document"""
    
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Extract text from document
        text = extract_text_from_file(tmp_path, file.filename)
        return {"text": text}
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/parse-tasks", response_model=ParsedTasksResponse)
async def parse_tasks_from_text(request: ParseTasksRequest):
    """Use AI to parse tasks from free-form text"""
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    
    client = Anthropic(api_key=api_key)
    
    prompt = f"""You are an expert at analyzing workflow descriptions and extracting structured task information.

USER INPUT TEXT:
{request.text}

YOUR JOB:
1. Identify a suitable workflow name (short, descriptive)
2. Create a workflow description (1-2 sentences summarizing what this workflow is about)
3. Extract ALL tasks mentioned in the text
4. For each task, determine:
   - name: Clear, concise task name
   - description: Brief description of what the task involves
   - frequency: daily, weekly, or monthly (make an educated guess)
   - time_per_task: estimated minutes per occurrence
   - category: data_entry, communication, analysis, creative, administrative, or general
   - complexity: low, medium, or high

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{{
  "workflow_name": "name here",
  "workflow_description": "description here",
  "tasks": [
    {{
      "name": "task name",
      "description": "task description",
      "frequency": "daily",
      "time_per_task": 30,
      "category": "general",
      "complexity": "medium"
    }}
  ]
}}

CRITICAL: Return ONLY valid JSON, no explanations or markdown formatting."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])
        
        # Parse JSON
        import json
        parsed = json.loads(response_text)
        
        return ParsedTasksResponse(**parsed)
    
    except Exception as e:
        print(f"Error parsing tasks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse tasks: {str(e)}")
