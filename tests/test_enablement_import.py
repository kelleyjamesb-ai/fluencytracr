import json
import unittest

from src.enablement_import import EnablementStore, import_enablement


class EnablementImportTests(unittest.TestCase):
    def test_import_csv_rejects_invalid_rows(self) -> None:
        store = EnablementStore()
        csv_content = (
            "event_type,occurred_at,org_id,team_id,role_id\n"
            "assessment_pre,2024-01-01T00:00:00Z,org-1,team-1,role-1\n"
            "assessment_post,invalid-date,org-1,team-1,role-1\n"
            ",2024-01-01T00:00:00Z,org-1,team-1,role-1\n"
        )
        result = import_enablement(csv_content, content_type="csv", store=store)
        self.assertEqual(len(result["errors"]), 2)
        self.assertEqual(len(result["stored"]), 1)
        self.assertEqual(len(store.events), 1)

    def test_import_json_indexes_by_org_and_role(self) -> None:
        store = EnablementStore()
        payload = json.dumps(
            [
                {
                    "event_type": "session_attended",
                    "occurred_at": "2024-01-01T00:00:00+00:00",
                    "org_id": "org-2",
                    "team_id": "team-1",
                    "role_id": "role-1",
                }
            ]
        )
        result = import_enablement(payload, content_type="json", store=store)
        self.assertEqual(result["errors"], [])
        self.assertEqual(len(result["stored"]), 1)
        self.assertEqual(len(store.by_org["org-2"]), 1)
        self.assertEqual(len(store.by_role["role-1"]), 1)


if __name__ == "__main__":
    unittest.main()
