"""python3 -m unittest discover -s python/tests (part of npm run check)."""

import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import filmatch as fm  # noqa: E402

U1 = "Snapmaker U1 (0.4 nozzle)"


class ColourTest(unittest.TestCase):
    def test_norm_colour(self):
        self.assertEqual(fm.norm_colour("ff0000"), "#FF0000")
        self.assertEqual(fm.norm_colour("#00ff00AA"), "#00FF00")
        self.assertIsNone(fm.norm_colour("red"))
        self.assertIsNone(fm.norm_colour(None))

    def test_colour_distance(self):
        self.assertEqual(fm.colour_distance("#000000", "000000"), 0)
        self.assertEqual(fm.colour_distance(None, "#000000"), 765.0)
        self.assertAlmostEqual(fm.colour_distance("#000000", "#FFFFFF"), 764.83, places=2)
        self.assertLess(fm.colour_distance("#FF0000", "#EE1111"), fm.colour_distance("#FF0000", "#00FF00"))

    def test_colour_diff(self):
        self.assertEqual(fm.colour_diff("#000000", "000000ff"), 0)
        self.assertAlmostEqual(fm.colour_diff("#000000", "#FFFFFF"), 441.67, places=2)
        self.assertIsNone(fm.colour_diff("", "#000000"))


class MaterialTest(unittest.TestCase):
    def test_generic_ids_match_orcas_library(self):
        """GENERIC_IDS against OrcaFilamentLibrary at the commit in fixtures/orca_generic_ids.json (made by
        python/generic_ids.py): a family missing from the library, or an id that differs, fails here."""
        with open(os.path.join(HERE, "fixtures", "orca_generic_ids.json"), encoding="utf-8") as f:
            pinned = json.load(f)
        self.assertEqual({k: pinned["ids"].get(k) for k in fm.GENERIC_IDS}, fm.GENERIC_IDS)
        self.assertTrue(set(fm.FILAMENT_FAMILIES.values()) <= set(fm.GENERIC_IDS))

    def test_generic_family(self):
        self.assertEqual(fm.generic_filament_id("PETG"), "OFYPdQJh")
        self.assertEqual(fm.generic_filament_id("pla matte"), "OFmY0l6t")
        self.assertEqual(fm.generic_family("PLA+"), "PLA")
        self.assertEqual(fm.generic_family("PETG HF"), "PETG")
        self.assertEqual(fm.generic_family("PLA-CF Matte"), "PLA-CF")
        self.assertEqual(fm.generic_family("NYLON"), "PA")
        self.assertIsNone(fm.generic_family("PETGX"))
        self.assertEqual(fm.generic_filament_id("WEIRD"), "")
        narrow = {"PLA": "PLA"}
        self.assertIsNone(fm.generic_family("NYLON", narrow))
        self.assertEqual(fm.generic_filament_id("PLA HS", narrow), "OFDSrzZ8")

    def test_material_base_and_key(self):
        self.assertEqual(fm.material_base("PLA-CF"), "PLA")
        self.assertEqual(fm.material_base(" petg+"), "PETG")
        self.assertEqual(fm.material_base(""), "")
        self.assertEqual(fm.material_key("pla+ silk"), "PLA+SILK")
        self.assertEqual(fm.MATERIAL_ALIASES[fm.material_key("Silk PLA")], "PLA")


class ParentTest(unittest.TestCase):
    PARENTS = [
        {"name": "Generic PLA @System", "vendor": "Generic", "type": "PLA", "printers": []},
        {"name": "Generic PLA @U1 0.4 nozzle", "vendor": "Generic", "type": "PLA", "printers": [U1]},
        {"name": "Generic PLA Silk @System", "vendor": "Generic", "type": "PLA", "printers": []},
        {"name": "Snapmaker PLA SnapSpeed @U1", "vendor": "Snapmaker", "type": "PLA", "printers": [U1]},
        {"name": "Generic PETG @System", "vendor": "Generic", "type": "PETG", "printers": []},
        {"name": "Generic PA @System", "vendor": "Generic", "type": "PA", "printers": []},
        {"name": "Other PLA @X1C", "vendor": "Other", "type": "PLA", "printers": ["Bambu Lab X1 Carbon"]},
    ]

    def pick(self, name, material, vendor, target=U1):
        return fm.best_parent({"name": name, "material": material, "vendor": {"name": vendor}}, target, self.PARENTS)

    def test_best_parent(self):
        self.assertEqual(self.pick("Yellow", "PLA", "3D Procer"), "Generic PLA @U1 0.4 nozzle")
        self.assertEqual(self.pick("SnapSpeed Yellow", "PLA", "Snapmaker"), "Snapmaker PLA SnapSpeed @U1")
        self.assertEqual(self.pick("Silk Gold", "Silk PLA", "eSUN", "Sovol SV06"), "Generic PLA Silk @System")
        self.assertEqual(self.pick("", "PETG+", "", "Sovol SV06"), "Generic PETG @System")
        self.assertEqual(self.pick("", "Nylon", "", "Sovol SV06"), "Generic PA @System")
        self.assertEqual(self.pick("", "ABS", ""), "")
        self.assertIsNone(fm.parent_score(self.PARENTS[-1], {"material": "PLA"}, U1))
        self.assertEqual(fm.type_score("PLA", "PLA+"), 6)
        self.assertEqual(fm.type_score("PLA-CF", "PLA"), 1)
        self.assertEqual(fm.type_score("PETG", "PLA"), -1)


class PickTest(unittest.TestCase):
    NAMES = ["Generic PLA @U1", "Generic PLA Silk @U1", "Polymaker PLA @U1", "Snapmaker PLA Matte @U1",
             "Snapmaker PLA SnapSpeed @U1", "Generic PLA-CF @U1", "Generic PLA @BBL X1C", "Generic PETG @U1"]

    def test_pick(self):
        pick, names = fm.pick_filament_preset, self.NAMES
        head = {"type": "PLA", "vendor": "Generic", "sub_type": "Basic"}
        self.assertEqual(pick(names, head), "Generic PLA @U1")
        self.assertEqual(pick(names, {**head, "sub_type": "Silk"}), "Generic PLA Silk @U1")
        self.assertEqual(pick(names, {**head, "type": "PLA-CF"}), "Generic PLA-CF @U1")
        self.assertEqual(pick(names, head, {"vendor": "Snapmaker", "type": "PLA", "sub_type": "SnapSpeed"}),
                         "Snapmaker PLA SnapSpeed @U1")
        self.assertEqual(pick(names, head, {"manufacturer": "Polymaker", "type": "PLA"}), "Polymaker PLA @U1")
        self.assertEqual(pick(names, {"type": "ABS"}), "")
        self.assertEqual(pick(names, head, printer_hint="BBL X1C"), "Generic PLA @BBL X1C")

    def test_overrides_preference_and_colour(self):
        pick, names = fm.pick_filament_preset, self.NAMES
        head = {"type": "PLA", "vendor": "Generic"}
        tag = {"vendor": "Polymaker", "type": "PLA", "sku": "S1", "uid": "AABB"}
        self.assertEqual(pick(names, head, tag, {"uid:aabb": "Generic PETG @U1", "SKU:S1": "Generic PLA Silk @U1"}),
                         "Generic PETG @U1")
        self.assertEqual(pick(names, head, tag, {"polymaker|pla|": "Snapmaker PLA Matte @U1"}), "Snapmaker PLA Matte @U1")
        self.assertEqual(pick(names, head, tag, {"SKU:S1": "Missing"}), "Polymaker PLA @U1")
        self.assertEqual(pick(names, head, preference=lambda n, h, t: "Generic PETG @U1"), "Generic PETG @U1")
        twins = ["Generic PLA Red @U1", "Generic PLA Blu @U1"]
        colours = {"Generic PLA Red @U1": "#FF0000", "Generic PLA Blu @U1": "#0000FF"}
        self.assertEqual(pick(twins, {**head, "colour": "#0011EE"}, colours=colours), "Generic PLA Blu @U1")
        self.assertEqual(pick(twins, head, colours=colours), "Generic PLA Blu @U1")   # no colour: shorter, then name


if __name__ == "__main__":
    unittest.main()
