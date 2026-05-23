import re
import asyncio
import httpx
from typing import Dict, Any, Tuple, List
from app.config import settings
from app.exception_handlers import GitHubAPIException

class GitHubService:
    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "FastAPI-GitHub-Analyzer"
        }
        if settings.GITHUB_TOKEN:
            self.headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    def parse_repo_input(self, input_str: str) -> Tuple[str, str]:
        """
        Parses repository input which could be:
        - A full URL: https://github.com/owner/repo or http://github.com/owner/repo
        - A path: owner/repo
        Returns: (owner, repo_name)
        """
        cleaned = input_str.strip()
        # Remove trailing slash or .git
        cleaned = re.sub(r"\.git$", "", cleaned)
        cleaned = cleaned.rstrip("/")

        # Regex for URL match
        url_match = re.search(r"github\.com/([^/]+)/([^/]+)", cleaned, re.IGNORECASE)
        if url_match:
            return url_match.group(1), url_match.group(2)

        # Regex for owner/repo format
        path_match = re.match(r"^([^/]+)/([^/]+)$", cleaned)
        if path_match:
            return path_match.group(1), path_match.group(2)

        raise GitHubAPIException(
            message="Invalid repository format. Please enter a valid URL (e.g., https://github.com/owner/repo) or identifier (e.g., owner/repo).",
            status_code=400
        )

    async def _fetch(self, client: httpx.AsyncClient, endpoint: str) -> Any:
        url = f"{self.BASE_URL}{endpoint}"
        try:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            # Handle rate limit headers specifically
            remaining = response.headers.get("X-RateLimit-Remaining")
            if response.status_code == 403 and remaining == "0":
                raise GitHubAPIException(
                    message="GitHub API rate limit exceeded. Please add a GITHUB_TOKEN in your .env file to continue.",
                    status_code=403
                )

            if response.status_code == 404:
                raise GitHubAPIException(
                    message=f"GitHub resource not found at {endpoint}. Ensure it is a public repository.",
                    status_code=404
                )

            if response.status_code != 200:
                detail = response.json().get("message", "") if response.headers.get("content-type", "").startswith("application/json") else response.text
                raise GitHubAPIException(
                    message=f"GitHub API returned error status: {response.status_code}",
                    status_code=response.status_code,
                    detail=detail
                )

            return response.json()
        except httpx.RequestError as exc:
            raise GitHubAPIException(
                message=f"Failed to connect to GitHub API: {str(exc)}",
                status_code=503
            )

    async def get_repo_analytics(self, repo_input: str) -> Dict[str, Any]:
        """
        Fetches repository details, languages, commits, and contributors concurrently.
        """
        owner, repo = self.parse_repo_input(repo_input)
        
        async with httpx.AsyncClient() as client:
            try:
                # Concurrent requests
                repo_task = self._fetch(client, f"/repos/{owner}/{repo}")
                langs_task = self._fetch(client, f"/repos/{owner}/{repo}/languages")
                commits_task = self._fetch(client, f"/repos/{owner}/{repo}/commits?per_page=100")
                contribs_task = self._fetch(client, f"/repos/{owner}/{repo}/contributors?per_page=10")
                releases_task = self._fetch(client, f"/repos/{owner}/{repo}/releases?per_page=5")

                repo_data, languages, commits, contributors, releases = await asyncio.gather(
                    repo_task, langs_task, commits_task, contribs_task, releases_task,
                    return_exceptions=True
                )

                # Check for exceptions in gather (releases can fail gracefully)
                for res in (repo_data, languages, commits, contributors):
                    if isinstance(res, GitHubAPIException):
                        raise res
                    elif isinstance(res, Exception):
                        # Wrap general exceptions
                        raise GitHubAPIException(
                            message=f"An error occurred while calling the GitHub API: {str(res)}",
                            status_code=500
                        )

                # Fallback for releases if it errored or not found
                if isinstance(releases, Exception):
                    releases = []

                # Format releases
                formatted_releases = []
                if isinstance(releases, list):
                    for r in releases:
                        if isinstance(r, dict):
                            formatted_releases.append({
                                "tag_name": r.get("tag_name"),
                                "name": r.get("name"),
                                "published_at": r.get("published_at"),
                                "html_url": r.get("html_url")
                            })

                # Calculate Health Score
                health_score = self._calculate_health_score(repo_data, commits if isinstance(commits, list) else [])

                # Process commit activity (includes timeline, weekly pulse, hourly activity, and recent commits)
                commit_activity = self._process_commits(commits if isinstance(commits, list) else [])

                # Generate AI Summary
                ai_summary = self._generate_ai_summary(
                    repo_data,
                    languages if isinstance(languages, dict) else {},
                    commit_activity,
                    [
                        {
                            "login": c.get("login"),
                            "contributions": c.get("contributions", 0)
                        }
                        for c in contributors if isinstance(c, dict)
                    ] if isinstance(contributors, list) else [],
                    formatted_releases
                )
                
                # Format response
                return {
                    "repository": {
                        "name": repo_data.get("name"),
                        "full_name": repo_data.get("full_name"),
                        "description": repo_data.get("description"),
                        "owner": {
                            "login": repo_data.get("owner", {}).get("login"),
                            "avatar_url": repo_data.get("owner", {}).get("avatar_url"),
                            "html_url": repo_data.get("owner", {}).get("html_url")
                        },
                        "html_url": repo_data.get("html_url"),
                        "stars": repo_data.get("stargazers_count"),
                        "forks": repo_data.get("forks_count"),
                        "open_issues": repo_data.get("open_issues_count"),
                        "watchers": repo_data.get("watchers_count"),
                        "created_at": repo_data.get("created_at"),
                        "updated_at": repo_data.get("updated_at"),
                        "size_kb": repo_data.get("size"),
                        "license": repo_data.get("license", {}).get("name") if repo_data.get("license") else None
                    },
                    "languages": languages if isinstance(languages, dict) else {},
                    "commit_activity": commit_activity,
                    "contributors": [
                        {
                            "login": c.get("login"),
                            "avatar_url": c.get("avatar_url"),
                            "contributions": c.get("contributions"),
                            "html_url": c.get("html_url")
                        }
                        for c in contributors if isinstance(c, dict)
                    ],
                    "releases": formatted_releases,
                    "health": health_score,
                    "ai_summary": ai_summary
                }
            except Exception as e:
                if isinstance(e, GitHubAPIException):
                    raise e
                raise GitHubAPIException(
                    message=f"Could not aggregate repository data: {str(e)}",
                    status_code=500
                )

    def _calculate_health_score(self, repo_data: Dict[str, Any], commits: List[Any]) -> Dict[str, Any]:
        """
        Calculates a repository health score and compiles an audit checklist.
        """
        score = 40  # Base score
        checklist = []

        # 1. License (Weight: 15)
        license_obj = repo_data.get("license")
        has_license = bool(license_obj)
        if has_license:
            score += 15
            license_name = license_obj.get("name") if isinstance(license_obj, dict) else str(license_obj)
            checklist.append({"item": "License Configured", "status": "success", "details": license_name})
        else:
            checklist.append({"item": "License Configured", "status": "warning", "details": "No open-source license found"})

        # 2. Description (Weight: 10)
        has_desc = bool(repo_data.get("description"))
        if has_desc:
            score += 10
            checklist.append({"item": "Repository Description", "status": "success", "details": "Provides context to visitors"})
        else:
            checklist.append({"item": "Repository Description", "status": "warning", "details": "Missing description"})

        # 3. Community Engagement (Stars & Forks) (Weight: 15)
        stars = repo_data.get("stargazers_count", 0)
        forks = repo_data.get("forks_count", 0)
        if stars >= 500:
            score += 15
            checklist.append({"item": "Community Engagement", "status": "success", "details": f"{stars:,} stars & {forks:,} forks"})
        elif stars >= 50:
            score += 10
            checklist.append({"item": "Community Engagement", "status": "success", "details": f"{stars:,} stars"})
        else:
            checklist.append({"item": "Community Engagement", "status": "info", "details": f"{stars} stars (early stage)"})

        # 4. Development Velocity (Weight: 10)
        commit_volume = len(commits) if isinstance(commits, list) else 0
        if commit_volume >= 80:
            score += 10
            checklist.append({"item": "Commit Velocity", "status": "success", "details": f"{commit_volume} recent commits analyzed"})
        elif commit_volume >= 30:
            score += 5
            checklist.append({"item": "Commit Velocity", "status": "success", "details": f"{commit_volume} recent commits analyzed"})
        else:
            checklist.append({"item": "Commit Velocity", "status": "warning", "details": f"{commit_volume} commits found"})

        # 5. Issue Backlog Ratio (Weight: 10)
        open_issues = repo_data.get("open_issues_count", 0)
        if open_issues == 0:
            score += 10
            checklist.append({"item": "Issue Backlog Size", "status": "success", "details": "No backlog detected"})
        elif stars > 0 and (open_issues / stars) < 0.05:
            score += 10
            checklist.append({"item": "Issue Backlog Size", "status": "success", "details": f"Healthy ratio ({open_issues} open issues)"})
        elif open_issues > 150:
            checklist.append({"item": "Issue Backlog Size", "status": "warning", "details": f"Large backlog ({open_issues} open issues)"})
        else:
            score += 5
            checklist.append({"item": "Issue Backlog Size", "status": "success", "details": f"Moderate backlog ({open_issues} open issues)"})

        # Cap the score between 0 and 100
        score = min(max(score, 0), 100)

        return {
            "score": score,
            "checklist": checklist
        }

    def _process_commits(self, commits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Processes commits to build a timeline, weekly pulse, hourly distribution, and recent commit logs.
        """
        from datetime import datetime

        # Count commits per day for timeline
        daily_counts = {}
        
        # Weekly pulse counts (Sunday to Saturday)
        days_of_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        weekly_counts = {day: 0 for day in days_of_week}
        
        # Hourly counts (0 to 23)
        hourly_counts = [0] * 24
        
        recent_commits = []

        for index, commit in enumerate(commits):
            try:
                commit_info = commit.get("commit", {})
                commit_date_str = commit_info.get("author", {}).get("date", "")
                if commit_date_str:
                    date = commit_date_str.split("T")[0]
                    daily_counts[date] = daily_counts.get(date, 0) + 1
                    
                    # Clean and parse date for advanced metrics
                    clean_date = commit_date_str.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(clean_date)
                    
                    # Calculate day of week (Monday=0, Sunday=6 in python, map to Sunday=0)
                    py_weekday = dt.weekday()
                    day_name = days_of_week[(py_weekday + 1) % 7]
                    weekly_counts[day_name] += 1
                    
                    # Calculate hour of day
                    hourly_counts[dt.hour] += 1
            except Exception:
                continue

            # Parse recent 5 commits
            if len(recent_commits) < 5:
                try:
                    commit_info = commit.get("commit", {})
                    author_obj = commit.get("author") or {}
                    
                    raw_msg = commit_info.get("message", "No commit message")
                    msg = raw_msg.split("\n")[0] if raw_msg else "No commit message"
                    if len(msg) > 75:
                        msg = msg[:72] + "..."

                    recent_commits.append({
                        "sha": commit.get("sha", "")[:7],
                        "message": msg,
                        "author_name": commit_info.get("author", {}).get("name", "Unknown"),
                        "author_avatar_url": author_obj.get("avatar_url") if author_obj else None,
                        "date": commit_info.get("author", {}).get("date", ""),
                        "html_url": commit.get("html_url", "")
                    })
                except Exception:
                    pass

        # Sort dates chronologically for the timeline chart
        sorted_dates = sorted(daily_counts.keys())
        timeline = [{"date": d, "commits": daily_counts[d]} for d in sorted_dates]

        return {
            "total_analyzed": len(commits),
            "timeline": timeline,
            "weekly_pulse": weekly_counts,
            "hourly_activity": hourly_counts,
            "recent_commits": recent_commits
        }

    def _generate_ai_summary(
        self,
        repo_data: Dict[str, Any],
        languages: Dict[str, Any],
        commit_activity: Dict[str, Any],
        contributors: List[Dict[str, Any]],
        releases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates smart semantic AI insights and project summary recommendations.
        """
        # 1. Determine Language Profile
        sorted_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)
        total_bytes = sum(languages.values())
        lang_profile = ""
        if sorted_langs:
            top_lang = sorted_langs[0][0]
            pct = (sorted_langs[0][1] / total_bytes * 100) if total_bytes > 0 else 0
            if pct > 70:
                lang_profile = f"This repository is highly specialized in **{top_lang}** ({pct:.1f}% of codebase)."
            else:
                lang_list = [f"{l} ({v/total_bytes*100:.1f}%)" for l, v in sorted_langs[:3]]
                lang_profile = f"This repository features a multi-language architecture, primarily powered by **{', '.join(lang_list)}**."
        else:
            lang_profile = "No programming languages were detected, suggesting this repository contains documentation, configurations, or assets."

        # 2. Determine Activity & Release Speed
        releases_count = len(releases)
        has_releases = releases_count > 0
        latest_tag = releases[0].get("tag_name", "N/A") if has_releases else "N/A"
        
        commits_timeline = commit_activity.get("timeline", [])
        total_commits_analyzed = commit_activity.get("total_analyzed", 0)
        
        if total_commits_analyzed >= 80:
            activity_speed = "extremely high development activity"
        elif total_commits_analyzed >= 30:
            activity_speed = "moderate development pace"
        else:
            activity_speed = "calm or maintenance-only pace"
            
        release_context = f"with structured versioning (latest release: `{latest_tag}`)" if has_releases else "operating directly on branch heads (no official releases found)"

        # 3. Analyze Commit Hours & Days (Peak times)
        weekly_pulse = commit_activity.get("weekly_pulse", {})
        hourly_activity = commit_activity.get("hourly_activity", [0]*24)
        
        # Peak Day
        peak_day = "Wednesday"
        if weekly_pulse:
            peak_day = max(weekly_pulse, key=weekly_pulse.get)
            
        # Peak Hour Grouping
        night_owl = sum(hourly_activity[0:6])
        morning = sum(hourly_activity[6:12])
        afternoon = sum(hourly_activity[12:18])
        evening = sum(hourly_activity[18:24])
        
        hour_blocks = {
            "Late Night (12 AM - 6 AM)": night_owl,
            "Morning (6 AM - 12 PM)": morning,
            "Afternoon (12 PM - 6 PM)": afternoon,
            "Evening (6 PM - 12 AM)": evening
        }
        peak_period = max(hour_blocks, key=hour_blocks.get)

        # 4. Analyze Contributor Concentration
        total_contrib_commits = sum(c.get("contributions", 0) for c in contributors)
        centralized_warning = ""
        if contributors and total_contrib_commits > 0:
            top_contrib = contributors[0]
            pct = (top_contrib.get("contributions", 0) / total_contrib_commits * 100)
            if pct > 65:
                centralized_warning = f"A single contributor (**{top_contrib.get('login')}**) drives **{pct:.1f}%** of recent commits, indicating high concentration of code ownership and potential single-point-of-failure risk."
            else:
                centralized_warning = "Commit contributions are distributed among multiple active developers, pointing to strong collaborative health."

        # Compile insights paragraph
        summary = (
            f"{lang_profile} The repository exhibits an **{activity_speed}** {release_context}. "
            f"Developer logs show peak activities during the **{peak_period}** block, with **{peak_day}** being the most productive weekday. "
            f"{centralized_warning}"
        )

        # Generate 3 AI Recommendations
        recommendations = []
        if not has_releases:
            recommendations.append("Establish a versioning roadmap and tag stable releases to simplify project installs.")
        if "Late Night" in peak_period:
            recommendations.append("Consider setting up automated CI/CD testing workflows to catch bugs, as team operates heavily during late-night hours.")
        if "single contributor" in centralized_warning:
            recommendations.append("Encourage wider team participation and review processes to reduce dependency on a single developer.")
        else:
            recommendations.append("Maintain clear branch policies and pull request templates to sustain healthy collaborative contributions.")
            
        stars = repo_data.get("stargazers_count", 0)
        open_issues = repo_data.get("open_issues_count", 0)
        if open_issues > 100:
            recommendations.append("Initiate an issue triage sprint to categorize, close stale threads, and reduce backlog load.")
        elif stars < 10:
            recommendations.append("Improve discovery by adding comprehensive repository tags, topics, and code examples to the README.")
        else:
            recommendations.append("Leverage GitHub Discussions or project wikis to document common questions and community feedback.")

        return {
            "summary": summary,
            "recommendations": recommendations[:3]
        }

github_service = GitHubService()
