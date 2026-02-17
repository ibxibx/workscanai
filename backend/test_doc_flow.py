"""
Document Upload Flow Diagnostic
Run from backend folder: python test_doc_flow.py
"""
import requests
import tempfile
import os

print("="*60)
print("DOCUMENT UPLOAD FLOW TEST")
print("="*60)

# Step 1: Create test document
test_content = """Marketing Team Tasks

We need to automate our daily work.

Tasks:
1. Write social media posts - 30 minutes daily
2. Schedule posts across platforms - 15 minutes daily
3. Respond to comments - 45 minutes daily
4. Generate weekly reports - 2 hours weekly
"""

print("\n[1] Creating test document...")
with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
    f.write(test_content)
    temp_path = f.name
print(f"✅ Created: {temp_path}")

try:
    # Step 2: Extract text
    print("\n[2] Uploading to /api/extract-tasks...")
    with open(temp_path, 'rb') as f:
        files = {'file': ('tasks.txt', f, 'text/plain')}
        response = requests.post('http://localhost:8000/api/extract-tasks', files=files)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        extracted_text = data.get('text', '')
        print(f"✅ Extracted {len(extracted_text)} characters")
        print(f"Preview: {extracted_text[:150]}...")
    else:
        print(f"❌ Failed: {response.text}")
        exit(1)
    
    # Step 3: Parse tasks
    print("\n[3] Parsing tasks from text...")
    parse_response = requests.post(
        'http://localhost:8000/api/parse-tasks',
        json={'text': extracted_text}
    )
    
    print(f"Status: {parse_response.status_code}")
    if parse_response.status_code == 200:
        parsed = parse_response.json()
        print(f"✅ Workflow name: {parsed.get('workflow_name')}")
        print(f"✅ Tasks found: {len(parsed.get('tasks', []))}")
        
        # Show each task
        for i, task in enumerate(parsed.get('tasks', []), 1):
            print(f"\n   Task {i}:")
            print(f"   - Name: {task['name']}")
            print(f"   - Frequency: {task['frequency']}")
            print(f"   - Time: {task['time_per_task']} min")
            print(f"   - Category: {task['category']}")
            print(f"   - Complexity: {task['complexity']}")
    else:
        print(f"❌ Failed: {parse_response.text}")
        exit(1)
    
    # Step 4: Create workflow
    print("\n[4] Creating workflow...")
    workflow_data = {
        'name': parsed.get('workflow_name', 'Test Workflow'),
        'description': parsed.get('workflow_description', ''),
        'tasks': parsed.get('tasks', [])
    }
    
    print(f"Sending {len(workflow_data['tasks'])} tasks...")
    
    create_response = requests.post(
        'http://localhost:8000/api/workflows',
        json=workflow_data
    )
    
    print(f"Status: {create_response.status_code}")
    if create_response.status_code == 201:
        workflow = create_response.json()
        print(f"✅ Workflow ID: {workflow['id']}")
        print(f"✅ Name: {workflow['name']}")
        print(f"✅ Tasks created: {len(workflow['tasks'])}")
    else:
        print(f"❌ Failed: {create_response.text}")
        exit(1)
    
    # Step 5: Analyze
    print("\n[5] Analyzing workflow...")
    analyze_response = requests.post(
        'http://localhost:8000/api/analyze',
        json={'workflow_id': workflow['id'], 'hourly_rate': 50}
    )
    
    print(f"Status: {analyze_response.status_code}")
    if analyze_response.status_code == 200:
        analysis = analyze_response.json()
        print(f"✅ Automation Score: {analysis['automation_score']}/100")
        print(f"✅ Annual Savings: ${analysis['annual_savings']}")
    else:
        print(f"❌ Failed: {analyze_response.text}")
        exit(1)
    
    print("\n" + "="*60)
    print("🎉 DOCUMENT UPLOAD FLOW WORKS!")
    print("="*60)

finally:
    os.unlink(temp_path)
