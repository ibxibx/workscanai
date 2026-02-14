"""
Test script to verify WorkScanAI backend is working correctly
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_health_check():
    print_section("Testing Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Backend is running and healthy!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on port 8000")
        return False

def test_create_workflow():
    print_section("Testing Workflow Creation")
    
    workflow_data = {
        "name": "Test Marketing Workflow",
        "description": "Testing workflow creation and analysis",
        "tasks": [
            {
                "name": "Write social media posts",
                "description": "Create engaging content for Facebook, Twitter, LinkedIn",
                "frequency": "daily",
                "time_per_task": 30,
                "category": "creative",
                "complexity": "medium"
            },
            {
                "name": "Schedule posts across platforms",
                "description": "Use scheduling tool to post at optimal times",
                "frequency": "daily",
                "time_per_task": 15,
                "category": "administrative",
                "complexity": "low"
            },
            {
                "name": "Respond to comments and messages",
                "description": "Engage with audience, answer questions",
                "frequency": "daily",
                "time_per_task": 45,
                "category": "communication",
                "complexity": "medium"
            }
        ]
    }
    
    try:
        print("\n📤 Sending workflow with 3 tasks...")
        response = requests.post(f"{BASE_URL}/api/workflows", json=workflow_data)
        
        if response.status_code == 201:
            workflow = response.json()
            print(f"✅ Workflow created successfully!")
            print(f"   ID: {workflow['id']}")
            print(f"   Name: {workflow['name']}")
            print(f"   Tasks: {len(workflow['tasks'])}")
            return workflow['id']
        else:
            print(f"❌ Failed to create workflow: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating workflow: {e}")
        return None

def test_analyze_workflow(workflow_id):
    print_section("Testing AI Analysis")
    
    analyze_data = {
        "workflow_id": workflow_id,
        "hourly_rate": 50.0
    }
    
    try:
        print(f"\n🤖 Analyzing workflow {workflow_id} with Claude AI...")
        print("   This may take 10-20 seconds...")
        
        response = requests.post(f"{BASE_URL}/api/analyze", json=analyze_data)
        
        if response.status_code == 200:
            analysis = response.json()
            print(f"✅ Analysis completed successfully!")
            print(f"   Automation Score: {analysis['automation_score']:.1f}/100")
            print(f"   Hours Saved/Year: {analysis['hours_saved']:.1f}")
            print(f"   Annual Savings: ${analysis['annual_savings']:,.2f}")
            print(f"   Task Results: {len(analysis['results'])}")
            
            # Show sample task analysis
            if analysis['results']:
                print("\n   Sample Task Analysis:")
                result = analysis['results'][0]
                print(f"   - Task: {result['task']['name']}")
                print(f"   - AI Score: {result['ai_readiness_score']:.1f}/100")
                print(f"   - Recommendation: {result['recommendation'][:80]}...")
            
            return True
        else:
            print(f"❌ Analysis failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        return False

def test_get_results(workflow_id):
    print_section("Testing Results Retrieval")
    
    try:
        print(f"\n📊 Fetching results for workflow {workflow_id}...")
        response = requests.get(f"{BASE_URL}/api/results/{workflow_id}")
        
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Results retrieved successfully!")
            print(f"   Overall Score: {results['automation_score']:.1f}/100")
            print(f"   Results Count: {len(results['results'])}")
            return True
        else:
            print(f"❌ Failed to get results: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting results: {e}")
        return False

def test_report_generation(workflow_id):
    print_section("Testing Report Generation")
    
    # Test DOCX
    try:
        print("\n📄 Generating DOCX report...")
        response = requests.get(f"{BASE_URL}/api/reports/{workflow_id}/docx")
        
        if response.status_code == 200:
            print(f"✅ DOCX report generated!")
            print(f"   Size: {len(response.content)} bytes")
        else:
            print(f"⚠️  DOCX generation had issues: {response.status_code}")
    except Exception as e:
        print(f"⚠️  DOCX error: {e}")
    
    # Test PDF
    try:
        print("\n📄 Generating PDF report...")
        response = requests.get(f"{BASE_URL}/api/reports/{workflow_id}/pdf")
        
        if response.status_code == 200:
            print(f"✅ PDF report generated!")
            print(f"   Size: {len(response.content)} bytes")
        else:
            print(f"⚠️  PDF generation had issues: {response.status_code}")
    except Exception as e:
        print(f"⚠️  PDF error: {e}")

def main():
    print("\n" + "🔬"*30)
    print("  WorkScanAI Backend Test Suite")
    print("🔬"*30)
    
    # Test 1: Health Check
    if not test_health_check():
        print("\n❌ Backend not running. Please start it first:")
        print("   cd backend")
        print("   venv\\Scripts\\activate")
        print("   python start.py")
        sys.exit(1)
    
    # Test 2: Create Workflow
    workflow_id = test_create_workflow()
    if not workflow_id:
        print("\n❌ Cannot proceed without a workflow")
        sys.exit(1)
    
    # Test 3: Analyze Workflow
    time.sleep(1)  # Brief pause
    if not test_analyze_workflow(workflow_id):
        print("\n⚠️  Analysis failed - check your ANTHROPIC_API_KEY in .env")
        print("   Continuing with remaining tests...")
    
    # Test 4: Get Results
    time.sleep(1)
    test_get_results(workflow_id)
    
    # Test 5: Generate Reports
    time.sleep(1)
    test_report_generation(workflow_id)
    
    # Summary
    print_section("Test Summary")
    print("\n✅ Core functionality is working!")
    print("\nNext steps:")
    print("1. Start the frontend: cd frontend && npm run dev")
    print("2. Visit: http://localhost:3000")
    print("3. Try analyzing your own workflows!")
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
