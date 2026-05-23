# GitAnalyzer — FastAPI GitHub Repository Analyzer

A high-fidelity FastAPI application designed to fetch, parse, and visualize public GitHub repository data. It comes with a stunning glassmorphic, dark-mode Web Dashboard featuring interactive visualizations powered by Chart.js.

---

## Features

1. **GitHub REST API Integration**: Parallel asynchronous fetching of repo statistics, languages, commit logs, and contributors.
2. **Glassmorphism Dashboard**: A premium, responsive user interface utilizing modern CSS design methodologies, Outfit & Inter typography, and dynamic animations.
3. **Data Visualizations**:
   - Doughnut charts displaying precise language byte percentages.
   - Smooth curved line/area charts visualizing weekly commit frequency over the last 100 commits.
4. **Resilient Error Architecture**: Custom exception handlers delivering structured, clean JSON responses for rate limits (graceful notifications), nonexistent repositories, or connection errors.

---

## Getting Started

### 1. Prerequisites
- **Python 3.9+** installed on your system.

### 2. Environment Setup

Clone or browse to the project folder, then set up your virtual environment:

```powershell
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On macOS/Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Configuration

Duplicate the `.env.example` file to `.env`:

```env
DEBUG=True
HOST=127.0.0.1
PORT=8000

# Optional: Add a Personal Access Token to avoid GitHub's 60 req/hr rate limit
GITHUB_TOKEN=your_personal_access_token_here
```

> [!NOTE]
> If you do not configure a `GITHUB_TOKEN`, you can still use the analyzer, but you will be restricted to GitHub's rate limit of 60 requests per hour for anonymous calls. Adding a token boosts this limit to 5000 requests per hour.

### 4. Running the Server

Start the development server:

```powershell
python -m app.main
```

The application will start, and you can access the dashboard by navigating to **`http://127.0.0.1:8000`** in your browser. The API interactive Swagger docs are available at **`http://127.0.0.1:8000/docs`**.

---

## Project Structure

- `app/`
  - `main.py`: Initializer and routing orchestrator.
  - `config.py`: Application Pydantic Settings settings.
  - `exception_handlers.py`: Standardizes errors across routers.
  - `routers/`: Directory containing endpoints for APIs and templates.
  - `services/`: Module for GitHub network client integrations.
  - `templates/`: HTML markup files.
  - `static/`: Styling stylesheets, front-end javascript logic, and assets.
- `requirements.txt`: Python dependencies.
- `.env`: Secret and system configurations.
