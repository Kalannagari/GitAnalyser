# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Create the FastAPI runner
FROM python:3.11-slim
WORKDIR /workspace

# Set environment variables to optimize Python runtime behavior inside Docker
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8000

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend code
COPY app/ ./app/

# Copy React compiled build files into workspace
COPY --from=frontend-builder /frontend/dist/ ./frontend/dist/

# Expose API/Web port
EXPOSE 8000

# Run the FastAPI server via python module execution
CMD ["python", "-m", "app.main"]
