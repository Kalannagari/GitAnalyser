from fastapi import APIRouter, Query, status
from app.services.github_service import github_service

router = APIRouter(
    prefix="/api/v1",
    tags=["analysis"]
)

@router.get("/analyze", status_code=status.HTTP_200_OK)
async def analyze_repository(
    repo_url: str = Query(..., description="GitHub repository URL (e.g., https://github.com/owner/repo) or identifier (e.g., owner/repo)")
):
    """
    Analyzes a GitHub repository and returns metadata, languages, recent commit history, and contributors.
    """
    analysis_result = await github_service.get_repo_analytics(repo_url)
    return {
        "success": True,
        "data": analysis_result
    }
