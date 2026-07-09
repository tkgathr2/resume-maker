"""Regression tests for the Team C security fixes on the résumé router.

Covers: Claude API error translation, transaction rollback on partial
failure, IDOR ownership checks, and Pydantic input validation.
"""

from unittest.mock import patch

import httpx
import pytest
from anthropic import APITimeoutError, RateLimitError

from app.models import Resume


def _make_resume_payload(**overrides):
    payload = {
        "title": "My Resume",
        "content_json": {"summary": "hello"},
        "status": "draft",
    }
    payload.update(overrides)
    return payload


def _rate_limit_error() -> RateLimitError:
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(429, request=request)
    return RateLimitError("rate limited", response=response, body=None)


def _timeout_error() -> APITimeoutError:
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    return APITimeoutError(request=request)


class TestResumeGenerateErrorHandling:
    """Issue #1/#2: Claude API errors must map to proper HTTP codes and the
    résumé row must not survive a failed review (no orphaned draft rows)."""

    def test_rate_limit_returns_429_and_rolls_back(self, client, auth_headers, db_session):
        with patch("app.utils.claude.review_resume", side_effect=_rate_limit_error()):
            response = client.post(
                "/resumes/generate", json=_make_resume_payload(), headers=auth_headers
            )

        assert response.status_code == 429
        assert db_session.query(Resume).count() == 0

    def test_timeout_returns_503_and_rolls_back(self, client, auth_headers, db_session):
        with patch("app.utils.claude.review_resume", side_effect=_timeout_error()):
            response = client.post(
                "/resumes/generate", json=_make_resume_payload(), headers=auth_headers
            )

        assert response.status_code == 503
        assert db_session.query(Resume).count() == 0

    def test_unexpected_error_returns_500_and_rolls_back(
        self, client, auth_headers, db_session
    ):
        with patch("app.utils.claude.review_resume", side_effect=RuntimeError("boom")):
            response = client.post(
                "/resumes/generate", json=_make_resume_payload(), headers=auth_headers
            )

        assert response.status_code == 500
        assert db_session.query(Resume).count() == 0

    def test_success_persists_resume_and_review(self, client, auth_headers, db_session):
        with patch("app.utils.claude.review_resume", return_value="Looks good"):
            response = client.post(
                "/resumes/generate", json=_make_resume_payload(), headers=auth_headers
            )

        assert response.status_code == 201
        assert db_session.query(Resume).count() == 1


class TestResumeIdor:
    """Issue #3: a user must not be able to read/update/delete/list another
    user's résumés by guessing IDs."""

    def _create_resume_for(self, db_session, user_id, title="Owned"):
        resume = Resume(user_id=user_id, title=title, content_json={}, status="draft")
        db_session.add(resume)
        db_session.commit()
        db_session.refresh(resume)
        return resume

    def _other_user_headers(self, db_session):
        from app.models import User
        from app.utils.jwt import create_access_token

        other = User(email="other@example.com", name="Other", google_id="other_google_id")
        db_session.add(other)
        db_session.commit()
        db_session.refresh(other)
        token = create_access_token(user_id=other.id, email=other.email)
        return other, {"Authorization": f"Bearer {token}"}

    def test_get_other_users_resume_is_404(self, client, test_user, db_session):
        resume = self._create_resume_for(db_session, test_user.id)
        _, other_headers = self._other_user_headers(db_session)

        response = client.get(f"/resumes/{resume.id}", headers=other_headers)
        assert response.status_code == 404

    def test_update_other_users_resume_is_404(self, client, test_user, db_session):
        resume = self._create_resume_for(db_session, test_user.id)
        _, other_headers = self._other_user_headers(db_session)

        response = client.put(
            f"/resumes/{resume.id}", json={"title": "Hijacked"}, headers=other_headers
        )
        assert response.status_code == 404

    def test_delete_other_users_resume_is_404(self, client, test_user, db_session):
        resume = self._create_resume_for(db_session, test_user.id)
        _, other_headers = self._other_user_headers(db_session)

        response = client.delete(f"/resumes/{resume.id}", headers=other_headers)
        assert response.status_code == 404

    def test_list_other_users_resumes_is_403(self, client, test_user, auth_headers, db_session):
        self._create_resume_for(db_session, test_user.id)
        other, _ = self._other_user_headers(db_session)

        # test_user (auth_headers) tries to list `other`'s résumés.
        response = client.get(f"/resumes/user/{other.id}", headers=auth_headers)
        assert response.status_code == 403

    def test_list_own_resumes_ok(self, client, test_user, auth_headers, db_session):
        self._create_resume_for(db_session, test_user.id)
        response = client.get(f"/resumes/user/{test_user.id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestResumeInputValidation:
    """Issue #5: size limits and enum constraints on résumé input."""

    def test_empty_title_rejected(self, client, auth_headers):
        response = client.post(
            "/resumes/generate",
            json=_make_resume_payload(title=""),
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_title_too_long_rejected(self, client, auth_headers):
        response = client.post(
            "/resumes/generate",
            json=_make_resume_payload(title="a" * 256),
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_invalid_status_rejected(self, client, auth_headers):
        response = client.post(
            "/resumes/generate",
            json=_make_resume_payload(status="not_a_real_status"),
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_oversized_content_json_rejected(self, client, auth_headers):
        huge = {"blob": "x" * 60_000}
        response = client.post(
            "/resumes/generate",
            json=_make_resume_payload(content_json=huge),
            headers=auth_headers,
        )
        assert response.status_code == 422
