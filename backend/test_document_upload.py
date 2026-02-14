"""
COMPLETE DOCUMENT UPLOAD DIAGNOSTIC TEST
Run this from: backend folder with venv activated
"""
import requests
import tempfile
import os
import sys

def test_document_upload():
    print('='*60)
    print('WORKSCANAI DOCUMENT UPLOAD DIAGNOSTIC')
    print('='*60)
    
    # Step 1: Health check
    print('\n[1/5] Checking if backend is running...')
    try:
        response = requests.get('http://localhost:8000/health')
        if response.status_code == 200:
            print('✅ Backend is running')
        else:
            print(f'❌ Backend returned status {response.status_code}')
            return False
    except Exception as e:
        print(f'❌ Cannot connect to backend: {e}')
        print('   Make sure backend is running: python start.py')
        return False
    
    # Step 2: Test document extraction
    print('\n[2/5] Testing document extraction (/api/extract-tasks)...')
    
    test_content = """Marketing Team Workflow

Our team needs help with social media management.

Tasks:
1. Write social media posts - 30 minutes daily
2. Schedule posts across platforms - 15 minutes daily
3. Respond to comments and messages - 45 minutes daily
4. Generate weekly performance reports - 2 hours weekly
5. Research trending topics - 1 hour daily
"""
    
    # Create temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(test_content)
        temp_path = f.name
    
    try:
        # Upload file
        with open(temp_path, 'rb') as f:
            files = {'file': ('test_tasks.txt', f, 'text/plain')}
            response = requests.post('http://localhost:8000/api/extract-tasks', files=files)
        
        print(f'   Status Code: {response.status_code}')
        
        if response.status_code != 200:
            print(f'❌ FAILED! Error response:')
            print(f'   {response.text}')
            return False
        
        data = response.json()
        extracted_text = data.get('text', '')
        
        print(f'✅ Text extracted successfully!')
        print(f'   Length: {len(extracted_text)} characters')
        print(f'   Preview: {extracted_text[:150]}...')
        
    except Exception as e:
        print(f'❌ Exception during extraction: {e}')
        return False
    finally:
        os.unlink(temp_path)
    
    # Step 3: Test task parsing
    print('\n[3/5] Testing task parsing (/api/parse-tasks)...')
    
    try:
        parse_response = requests.post(
            'http://localhost:8000/api/parse-tasks',
            json={'text': extracted_text},
            headers={'Content-Type': 'application/json'}
        )
        
        print(f'   Status Code: {parse_response.status_code}')
        
        if parse_response.status_code != 200:
            print(f'❌ FAILED! Error response:')
            print(f'   {parse_response.text}')
            return False
        
        parsed = parse_response.json()
        
        print(f'✅ Tasks parsed successfully!')
        print(f'   Workflow name: "{parsed.get("workflow_name")}"')
        print(f'   Description: "{parsed.get("workflow_description", "")[:50]}..."')
        print(f'   Tasks found: {len(parsed.get("tasks", []))}')
        
        # Show tasks
        for i, task in enumerate(parsed.get('tasks', []), 1):
            print(f'   Task {i}: {task["name"]} ({task["frequency"]}, {task["time_per_task"]}min)')
        
    except Exception as e:
        print(f'❌ Exception during parsing: {e}')
        import traceback
        traceback.print_exc()
        return False
    
    # Step 4: Test workflow creation
    print('\n[4/5] Testing workflow creation (/api/workflows)...')
    
    try:
        workflow_data = {
            'name': parsed.get('workflow_name', 'Test Workflow'),
            'description': parsed.get('workflow_description', ''),
            'tasks': parsed.get('tasks', [])
        }
        
        create_response = requests.post(
            'http://localhost:8000/api/workflows',
            json=workflow_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f'   Status Code: {create_response.status_code}')
        
        if create_response.status_code != 201:
            print(f'❌ FAILED! Error response:')
            print(f'   {create_response.text}')
            return False
        
        workflow = create_response.json()
        workflow_id = workflow['id']
        
        print(f'✅ Workflow created successfully!')
        print(f'   ID: {workflow_id}')
        print(f'   Name: {workflow["name"]}')
        print(f'   Tasks: {len(workflow["tasks"])}')
        
    except Exception as e:
        print(f'❌ Exception during workflow creation: {e}')
        import traceback
        traceback.print_exc()
        return False
    
    # Step 5: Test analysis
    print('\n[5/5] Testing analysis (/api/analyze)...')
    
    try:
        analyze_response = requests.post(
            'http://localhost:8000/api/analyze',
            json={'workflow_id': workflow_id, 'hourly_rate': 50},
            headers={'Content-Type': 'application/json'}
        )
        
        print(f'   Status Code: {analyze_response.status_code}')
        
        if analyze_response.status_code != 200:
            print(f'❌ FAILED! Error response:')
            print(f'   {analyze_response.text}')
            return False
        
        analysis = analyze_response.json()
        
        print(f'✅ Analysis completed successfully!')
        print(f'   Automation Score: {analysis["automation_score"]:.1f}/100')
        print(f'   Hours Saved/Year: {analysis["hours_saved"]:.1f}')
        print(f'   Annual Savings: ${analysis["annual_savings"]:,.2f}')
        
    except Exception as e:
        print(f'❌ Exception during analysis: {e}')
        import traceback
        traceback.print_exc()
        return False
    
    print('\n' + '='*60)
    print('🎉 ALL TESTS PASSED! DOCUMENT UPLOAD WORKS!')
    print('='*60)
    return True

if __name__ == '__main__':
    success = test_document_upload()
    sys.exit(0 if success else 1)
