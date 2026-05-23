from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("github_analyzer")

class GitHubAPIException(Exception):
    """Exception raised for errors during GitHub API interactions."""
    def __init__(self, message: str, status_code: int = 400, detail: str = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)

def register_exception_handlers(app: FastAPI):
    @app.exception_handler(GitHubAPIException)
    async def github_api_exception_handler(request: Request, exc: GitHubAPIException):
        logger.error(f"GitHub API Error: {exc.message} | Status: {exc.status_code} | Details: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": "GitHubAPIError",
                "message": exc.message,
                "detail": exc.detail
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.error(f"Validation Error: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "ValidationError",
                "message": "Invalid request parameter values.",
                "detail": exc.errors()
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception("An unexpected error occurred.")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "InternalServerError",
                "message": "An unexpected error occurred on the server.",
                "detail": str(exc) if app.debug else "Please contact the system administrator."
            }
        )
