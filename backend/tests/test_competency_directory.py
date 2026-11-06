"""Guard the competence directory against non-unique or swapped seed keys."""
from pathlib import Path
import re
import unittest


class CompetencySeedTests(unittest.TestCase):
    def test_migration_seeds_unique_competency_codes(self):
        source = (
            Path(__file__).resolve().parents[1]
            / "migrations"
            / "0002_participant_intake.sql"
        ).read_text(encoding="utf-8")
        statement = source.split("UPSERT INTO competency_directory ", 1)[1].split(
            "-- migrate:statement", 1
        )[0]
        self.assertIn(
            "(competency_code, category_code, category_name, competency_name, active)",
            statement,
        )
        rows = re.findall(
            r'\("([A-Z]+-\d{2})",\s*"([A-Z]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(?:true|false)\)',
            statement,
        )
        self.assertEqual(len(rows), 70, "All expected competence seeds must be parsed")
        codes = [row[0] for row in rows]
        self.assertEqual(len(codes), len(set(codes)), "Competency codes must be unique")
        self.assertTrue(
            all(competency_code.startswith(category_code + "-")
                for competency_code, category_code, _, _ in rows)
        )
        self.assertIn(("CON-01", "CON", "Общестроительные работы", "Демонтажные работы"), rows)


if __name__ == "__main__":
    unittest.main()
