import unittest

from src.exceptions import ValidationError
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

    def test_import_invalid_team_raises_error(self) -> None:
        """Importing with invalid team_id should raise ValidationError."""
        csv_content = "employee_id,team_id,role_id\nemp-1,invalid-team,role-1\n"
        with self.assertRaises(ValidationError) as ctx:
            import_roster(csv_content, self.directory)
        self.assertIn("team_id 'invalid-team' not found", str(ctx.exception))

    def test_import_invalid_role_raises_error(self) -> None:
        """Importing with invalid role_id should raise ValidationError."""
        csv_content = "employee_id,team_id,role_id\nemp-1,team-1,invalid-role\n"
        with self.assertRaises(ValidationError) as ctx:
            import_roster(csv_content, self.directory)
        self.assertIn("role_id 'invalid-role' not found", str(ctx.exception))

    def test_import_multiple_errors_collected(self) -> None:
        """Multiple errors should be collected and reported together."""
        csv_content = """employee_id,team_id,role_id
emp-1,invalid-team,role-1
emp-2,team-1,invalid-role
emp-3,bad-team,bad-role
"""
        with self.assertRaises(ValidationError) as ctx:
            import_roster(csv_content, self.directory)
        error_msg = str(ctx.exception)
        # Should mention multiple errors
        self.assertIn("3", error_msg)  # Number of rows with errors
        # Should contain specific error details
        self.assertIn("invalid-team", error_msg)
        self.assertIn("invalid-role", error_msg)
        self.assertIn("bad-team", error_msg)
        self.assertIn("bad-role", error_msg)


if __name__ == "__main__":
    unittest.main()
