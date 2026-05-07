import unittest
from datetime import datetime, timezone

from src.tool_inventory import ToolInventory, ToolRecord


class ToolInventoryTests(unittest.TestCase):
    def test_add_and_list_tools_scoped(self) -> None:
        inventory = ToolInventory()
        record = ToolRecord(
            org_id="org-1",
            team_id="team-1",
            tool_class="llm_chat",
            tool_name="ChatTool",
            recorded_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
        inventory.add_tool(record)
        self.assertEqual(len(inventory.list_tools(org_id="org-1")), 1)
        self.assertEqual(len(inventory.list_tools(team_id="team-1")), 1)

    def test_requires_timestamp_timezone(self) -> None:
        inventory = ToolInventory()
        record = ToolRecord(
            org_id="org-1",
            team_id="team-1",
            tool_class="research",
            tool_name="ResearchBot",
            recorded_at=datetime(2024, 1, 1),
        )
        with self.assertRaises(ValueError):
            inventory.add_tool(record)


if __name__ == "__main__":
    unittest.main()
