import unittest

from src.roster_import import hash_employee_identifier, import_roster
from src.teams_roles import Directory, Role, Team


class RosterImportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = Directory()
        self.directory.create_team(Team(team_id="team-1", name="Data"))
        self.directory.create_role(Role(role_id="role-1", name="Analyst"))

    def test_hash_employee_identifier(self) -> None:
        hashed = hash_employee_identifier("employee@example.com")
        self.assertEqual(len(hashed), 64)
        self.assertNotEqual(hashed, "employee@example.com")

    def test_import_idempotent(self) -> None:
        csv_content = "employee_id,team_id,role_id\nemp-1,team-1,role-1\n"
        import_roster(csv_content, self.directory)
        import_roster(csv_content, self.directory)
        hashed = hash_employee_identifier("emp-1")
        self.assertEqual(self.directory.list_employee_teams(hashed), {"team-1"})
        self.assertEqual(self.directory.list_employee_roles(hashed), {"role-1"})


if __name__ == "__main__":
    unittest.main()
