import unittest

from src.access_control import (
    EMPLOYEE_LEVEL_ENDPOINTS,
    RequestContext,
    enforce_aggregation_defaults,
    enforce_role_access,
)
from src.api import handle_dashboard_request


class AccessControlTests(unittest.TestCase):
    def test_aggregation_defaults_to_org(self) -> None:
        self.assertEqual(
            enforce_aggregation_defaults({}),
            {"aggregation": "org"},
        )

    def test_aggregation_rejects_employee_level(self) -> None:
        with self.assertRaises(ValueError):
            enforce_aggregation_defaults({"aggregation": "employee"})

    def test_exec_role_blocked_from_employee_endpoints(self) -> None:
        for endpoint in EMPLOYEE_LEVEL_ENDPOINTS:
            request = RequestContext(role="exec", endpoint=endpoint, query={})
            with self.assertRaises(PermissionError):
                enforce_role_access(request)

    def test_manager_role_blocked_from_employee_endpoints(self) -> None:
        for endpoint in EMPLOYEE_LEVEL_ENDPOINTS:
            request = RequestContext(role="manager", endpoint=endpoint, query={})
            with self.assertRaises(PermissionError):
                enforce_role_access(request)

    def test_manager_role_blocked_from_org_aggregation(self) -> None:
        request = RequestContext(
            role="manager",
            endpoint="/api/dashboard",
            query={"aggregation": "org"},
        )
        with self.assertRaises(PermissionError):
            enforce_role_access(request)

    def test_handle_dashboard_request_enforces_rules(self) -> None:
        request = RequestContext(
            role="manager",
            endpoint="/api/dashboard",
            query={"aggregation": "team"},
        )
        response = handle_dashboard_request(request)
        self.assertEqual(response["aggregation"], "team")


if __name__ == "__main__":
    unittest.main()
