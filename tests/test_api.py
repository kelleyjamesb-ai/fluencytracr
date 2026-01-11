import unittest

from src.access_control import RequestContext
from src.api import handle_dashboard_request
from src.exceptions import AccessDeniedError, ValidationError


class APITests(unittest.TestCase):
    def test_exec_role_blocked_from_employee_endpoint(self) -> None:
        """Exec roles should not access employee-level endpoints."""
        request = RequestContext(
            role="exec",
            endpoint="/api/employees",
            query={"aggregation": "org"},
        )
        with self.assertRaises(AccessDeniedError):
            handle_dashboard_request(request)

    def test_exec_role_blocked_from_employee_detail_endpoint(self) -> None:
        """Exec roles should not access employee detail endpoint."""
        request = RequestContext(
            role="exec",
            endpoint="/api/employee-detail",
            query={"aggregation": "org"},
        )
        with self.assertRaises(AccessDeniedError):
            handle_dashboard_request(request)

    def test_invalid_aggregation_scope_raises_error(self) -> None:
        """Invalid aggregation scope should raise ValidationError."""
        request = RequestContext(
            role="manager",
            endpoint="/api/metrics",
            query={"aggregation": "individual"},
        )
        with self.assertRaises(ValidationError) as ctx:
            handle_dashboard_request(request)
        self.assertIn("individual", str(ctx.exception))

    def test_valid_org_aggregation_succeeds(self) -> None:
        """Valid org-level aggregation should succeed."""
        request = RequestContext(
            role="manager",
            endpoint="/api/metrics",
            query={"aggregation": "org"},
        )
        result = handle_dashboard_request(request)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["aggregation"], "org")

    def test_valid_team_aggregation_succeeds(self) -> None:
        """Valid team-level aggregation should succeed."""
        request = RequestContext(
            role="manager",
            endpoint="/api/metrics",
            query={"aggregation": "team"},
        )
        result = handle_dashboard_request(request)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["aggregation"], "team")

    def test_default_aggregation_is_org(self) -> None:
        """When no aggregation specified, defaults to org level."""
        request = RequestContext(
            role="analyst",
            endpoint="/api/metrics",
            query={},
        )
        result = handle_dashboard_request(request)
        self.assertEqual(result["aggregation"], "org")

    def test_non_exec_role_can_access_employee_endpoint(self) -> None:
        """Non-exec roles should be able to access employee endpoints."""
        request = RequestContext(
            role="manager",
            endpoint="/api/employees",
            query={"aggregation": "org"},
        )
        result = handle_dashboard_request(request)
        self.assertEqual(result["status"], "ok")


if __name__ == "__main__":
    unittest.main()
