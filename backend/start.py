"""
Simple script to start the FastAPI backend server
Run: python start.py
"""
import uvicorn

if __name__ == "__main__":
    print("Starting WorkScanAI Backend Server...")
    print("Server will be available at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    print("Press CTRL+C to stop")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
