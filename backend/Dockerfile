# ── Backend Dockerfile ──────────────────────────────────────────────────────
# Python 3.11 slim — small base image, production-ready
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by some Python packages
# (reportlab and others need these C libraries)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first — Docker caches this layer separately.
# If requirements.txt hasn't changed, Docker skips pip install on rebuild.
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create a directory for the SQLite database file
# (In production this will be replaced by PostgreSQL, but SQLite
#  works fine for the Docker dev environment)
RUN mkdir -p /data

# Expose the port FastAPI runs on
EXPOSE 8000

# Start the server
# --host 0.0.0.0 makes it reachable from outside the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
