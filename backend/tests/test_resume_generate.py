"""Tests for the resume generation endpoint."""

import pytest
from unittest.mock import patch
from datetime import datetime


class TestResumeGenerate:
    """Test suite for POST /api/resume/generate endpoint."""

    def test_generate_resume_success(self, client, auth_headers):
        """Test successful resume generation with normal input."""
        payload = {
            "title": "My First Resume",
            "content": """
            Name: John Doe
            Email: john@example.com
            Phone: 090-1234-5678

            Summary: Experienced software engineer with 5 years of experience

            Skills:
            - Python
            - FastAPI
            - PostgreSQL
            - AWS

            Experience:
            - Senior Engineer at TechCorp (2020-present)
            - Backend Developer at StartupXYZ (2018-2020)
            """
        }

        with patch("app.utils.claude.generate_resume") as mock_gen_resume:
            with patch("app.utils.claude.review_resume") as mock_review:
                # Mock the Claude functions
                mock_gen_resume.return_value = {
                    "name": "John Doe",
                    "email": "john@example.com",
                    "phone": "090-1234-5678",
                    "summary": "Experienced software engineer",
                    "skills": ["Python", "FastAPI", "PostgreSQL"],
                    "experience": []
                }
                mock_review.return_value = "Good resume structure. Consider adding more details."

                response = client.post(
                    "/api/resume/generate",
                    json=payload,
                    headers=auth_headers,
                )

        assert response.status_code == 201
        data = response.json()
        assert "resume_id" in data
        assert data["title"] == "My First Resume"
        assert "review_text" in data
        assert "content_json" in data

    def test_generate_resume_missing_auth(self, client):
        """Test that missing authentication returns 401."""
        payload = {
            "title": "My Resume",
            "content": "John Doe, john@example.com"
        }

        response = client.post("/api/resume/generate", json=payload)

        assert response.status_code == 401
        assert "authentication" in response.json()["detail"].lower()

    def test_generate_resume_empty_title(self, client, auth_headers):
        """Test that empty title returns 400 Bad Request."""
        payload = {
            "title": "",
            "content": "John Doe, john@example.com"
        }

        response = client.post(
            "/api/resume/generate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "title cannot be empty" in response.json()["detail"]

    def test_generate_resume_empty_content(self, client, auth_headers):
        """Test that empty content returns 400 Bad Request."""
        payload = {
            "title": "My Resume",
            "content": "   "
        }

        response = client.post(
            "/api/resume/generate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "content cannot be empty" in response.json()["detail"]

    def test_generate_resume_pii_detection(self, client, auth_headers):
        """Test that sensitive PII is detected and rejected."""
        payload = {
            "title": "Resume",
            "content": "My name is John, my マイナンバー is 123-45-6789"
        }

        response = client.post(
            "/api/resume/generate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "PII" in response.json()["detail"]
