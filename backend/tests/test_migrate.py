"""Regression tests for safe parsing of versioned YDB migration files."""
import unittest
from pathlib import Path

from backend.migrate import migration_statements


class MigrationStatementsTests(unittest.TestCase):
    def test_initial_migration_contains_only_sql(self):
        sql_file = Path(__file__).resolve().parents[1] / "migrations" / "0001_customer_intake.sql"
        statements = migration_statements(sql_file.read_text(encoding="utf-8"))
        self.assertEqual(len(statements), 6)
        self.assertTrue(all(sql.startswith("CREATE TABLE") for sql in statements))
        self.assertTrue(all("Versioned, manual migration" not in sql for sql in statements))

    def test_skips_comment_only_chunks(self):
        source = (
            "-- Header comment\n"
            "-- migrate:statement\n"
            "-- Comment without SQL\n"
            "-- migrate:statement\n"
            "CREATE TABLE example (id Utf8, PRIMARY KEY(id));\n"
        )
        self.assertEqual(len(migration_statements(source)), 1)
        self.assertTrue(migration_statements(source)[0].startswith("CREATE TABLE example"))

    def test_requires_statement_marker(self):
        with self.assertRaisesRegex(ValueError, "migration_missing_statement_marker"):
            migration_statements("CREATE TABLE example (id Utf8);")

    def test_rejects_comment_only_migration(self):
        with self.assertRaisesRegex(ValueError, "migration_has_no_sql_statements"):
            migration_statements("-- migrate:statement\n-- nothing to execute\n")

    def test_all_versioned_migrations_have_executable_statements(self):
        migration_dir = Path(__file__).resolve().parents[1] / "migrations"
        migrations = sorted(migration_dir.glob("*.sql"))
        self.assertEqual([path.name for path in migrations], [
            "0001_customer_intake.sql", "0002_participant_intake.sql",
            "0003_participant_drafts.sql",
        ])
        for path in migrations:
            statements = migration_statements(path.read_text(encoding="utf-8"))
            self.assertTrue(statements, path.name)
            self.assertTrue(all(statement.endswith(";") for statement in statements), path.name)


if __name__ == "__main__":
    unittest.main()
