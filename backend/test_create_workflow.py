import httpx
import json

# Sample workflow data
workflow_data = {
    "name": "Customer Support Workflow",
    "description": "Daily customer support tasks",
    "tasks": [
        {
            "name": "Answer customer emails",
            "description": "Respond to customer inquiries via email",
            "frequency": "daily",
            "time_per_task": 45,
            "category": "communication",
            "complexity": "medium"
        },
        {
            "name": "Update tickets in CRM",
            "description": "Log customer interactions in the CRM system",
            "frequency": "daily",
            "time_per_task": 30,
            "category": "data_entry",
            "complexity": "low"
        },
        {
            "name": "Generate daily report",
            "description": "Create summary of daily support activities",
            "frequency": "daily",
            "time_per_task": 20,
            "category": "analysis",
            "complexity": "medium"
        }
    ]
}

# Create workflow
print("Creating workflow...")
response = httpx.post(
    "http://localhost:8000/api/workflows",
    json=workflow_data,
    timeout=30.0
)

print(f"Status Code: {response.status_code}")
print(f"Response:\n{json.dumps(response.json(), indent=2)}")

# Save workflow ID for analysis
workflow_id = response.json()["id"]
print(f"\n✅ Workflow created with ID: {workflow_id}")
