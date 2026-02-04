"""
Test script for WorkScanAI API
"""
import httpx
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    response = httpx.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_create_workflow():
    """Test creating a workflow"""
    print("\n=== Testing Create Workflow ===")
    
    workflow_data = {
        "name": "Customer Support Workflow",
        "description": "Daily customer support tasks",
        "tasks": [
            {
                "name": "Respond to customer emails",
                "description": "Check and respond to customer inquiries",
                "frequency": "daily",
                "time_per_task": 30,
                "category": "communication",
                "complexity": "medium"
            },
            {
                "name": "Update CRM records",
