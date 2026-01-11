import unittest

from src.exceptions import AlreadyExistsError, NotFoundError
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

    def test_create_duplicate_team_raises_error(self) -> None:
        """Creating a duplicate team should raise AlreadyExistsError."""
        team = Team(team_id="t1", name="Team 1")
        self.directory.create_team(team)
        with self.assertRaises(AlreadyExistsError):
            self.directory.create_team(team)

    def test_create_duplicate_role_raises_error(self) -> None:
        """Creating a duplicate role should raise AlreadyExistsError."""
        role = Role(role_id="r1", name="Role 1")
        self.directory.create_role(role)
        with self.assertRaises(AlreadyExistsError):
            self.directory.create_role(role)

    def test_update_nonexistent_team_raises_error(self) -> None:
        """Updating a non-existent team should raise NotFoundError."""
        with self.assertRaises(NotFoundError):
            self.directory.update_team("nonexistent", name="New Name")

    def test_update_nonexistent_role_raises_error(self) -> None:
        """Updating a non-existent role should raise NotFoundError."""
        with self.assertRaises(NotFoundError):
            self.directory.update_role("nonexistent", name="New Name")

    def test_delete_nonexistent_team_raises_error(self) -> None:
        """Deleting a non-existent team should raise NotFoundError."""
        with self.assertRaises(NotFoundError):
            self.directory.delete_team("nonexistent")

    def test_delete_nonexistent_role_raises_error(self) -> None:
        """Deleting a non-existent role should raise NotFoundError."""
        with self.assertRaises(NotFoundError):
            self.directory.delete_role("nonexistent")

    def test_update_team_remove_parent(self) -> None:
        """Test explicitly setting parent_team_id to None."""
        self.directory.create_team(Team("parent", "Parent Team"))
        self.directory.create_team(Team("child", "Child Team", parent_team_id="parent"))

        # Remove parent
        updated = self.directory.update_team("child", parent_team_id=None)
        self.assertIsNone(updated.parent_team_id)

    def test_update_team_keep_current_values(self) -> None:
        """Test omitting parameters keeps current values."""
        self.directory.create_team(Team("t1", "Original", parent_team_id="parent"))

        # Update only name
        updated = self.directory.update_team("t1", name="New Name")
        self.assertEqual(updated.name, "New Name")
        self.assertEqual(updated.parent_team_id, "parent")  # Unchanged

    def test_map_employee_to_nonexistent_team_raises_error(self) -> None:
        """Mapping employee to non-existent team should raise NotFoundError."""
        with self.assertRaises(NotFoundError):
            self.directory.map_employee_to_team("e1", "nonexistent")

    def test_map_employee_to_nonexistent_role_raises_error(self) -> None:
        """Mapping employee to non-existent role should raise NotFoundError."""
        with self.assertRaises(NotFoundError):
            self.directory.map_employee_to_role("e1", "nonexistent")


if __name__ == "__main__":
    unittest.main()
