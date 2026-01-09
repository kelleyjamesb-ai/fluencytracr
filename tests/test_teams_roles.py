import unittest

from src.teams_roles import Directory, Role, Team


class TeamsRolesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = Directory()

    def test_team_crud_and_hierarchy(self) -> None:
        team = Team(team_id="t1", name="Data", parent_team_id=None)
        self.directory.create_team(team)
        self.directory.update_team("t1", parent_team_id="parent")
        teams = {t.team_id: t for t in self.directory.list_teams()}
        self.assertEqual(teams["t1"].parent_team_id, "parent")
        self.directory.delete_team("t1")
        self.assertEqual(self.directory.list_teams(), [])

    def test_role_crud(self) -> None:
        role = Role(role_id="r1", name="Manager")
        self.directory.create_role(role)
        self.directory.update_role("r1", name="Lead")
        roles = {r.role_id: r for r in self.directory.list_roles()}
        self.assertEqual(roles["r1"].name, "Lead")
        self.directory.delete_role("r1")
        self.assertEqual(self.directory.list_roles(), [])

    def test_employee_mappings(self) -> None:
        self.directory.create_team(Team(team_id="t1", name="Eng"))
        self.directory.create_role(Role(role_id="r1", name="Developer"))
        self.directory.map_employee_to_team("e1", "t1")
        self.directory.map_employee_to_role("e1", "r1")
        self.assertEqual(self.directory.list_employee_teams("e1"), {"t1"})
        self.assertEqual(self.directory.list_employee_roles("e1"), {"r1"})


if __name__ == "__main__":
    unittest.main()
