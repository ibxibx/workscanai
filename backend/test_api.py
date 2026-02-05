"""
Comprehensive API testing script for WorkScanAI backend
"""
import httpx
import json

BASE_URL = "http://localhost:8000"

def test_health():
    print("Testing health endpoint...")
    r = httpx.get(f"{BASE_URL}/health")
    print(f"✓ Health: {r.status_code} - {r.json()}\n")

def test_create_workflow():
    print("Testing create workflow...")
    workflow_data = {
        "name": "Customer Support Workflow",
        "description": "Daily customer support tasks",
        "tasks": [
            {
                "name": "Email Response",
