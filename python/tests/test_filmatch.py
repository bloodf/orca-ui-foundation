"""python3 -m unittest discover -s python/tests (part of npm run check)."""

import json
import os
import sys
import tempfile
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


class RankTest(unittest.TestCase):
    def test_rank_parents_reasons(self):
        ranked = fm.rank_parents({"name": "SnapSpeed Yellow", "material": "PLA", "vendor": {"name": "Snapmaker"}}, U1,
                                 ParentTest.PARENTS, 3)
        self.assertEqual(ranked[0]["name"], "Snapmaker PLA SnapSpeed @U1")
        self.assertEqual(ranked[0]["reasons"], [["material", "PLA"], ["vendor", "Snapmaker"], ["word", "snapspeed"], ["printer", ""]])
        self.assertEqual(ranked[0]["score"], fm.parent_score(ParentTest.PARENTS[3], {"name": "SnapSpeed Yellow", "material": "PLA",
                                                                                    "vendor": {"name": "Snapmaker"}}, U1))
        self.assertEqual(len(ranked), 3)
        self.assertNotIn("Other PLA @X1C", [r["name"] for r in fm.rank_parents({"material": "PLA"}, U1, ParentTest.PARENTS)])
        self.assertIn(["extra_word", "silk"], next(r for r in fm.rank_parents({"material": "PLA"}, U1, ParentTest.PARENTS)
                                                   if r["name"] == "Generic PLA Silk @System")["reasons"])

    def test_rank_presets_reasons_and_confidence(self):
        head = {"type": "PLA", "vendor": "Polymaker", "sub_type": "Matte"}
        ranked = fm.rank_filament_presets(PickTest.NAMES, head)
        self.assertEqual(ranked[0]["name"], fm.pick_filament_preset(PickTest.NAMES, head))
        self.assertEqual(ranked[0]["reasons"], [["material", "PLA"], ["vendor", "Polymaker"], ["printer", ""]])
        bbl = next(r for r in ranked if r["name"] == "Generic PLA @BBL X1C")
        self.assertIn(["other_printer", ""], bbl["reasons"])
        self.assertNotIn("Generic PETG @U1", [r["name"] for r in ranked])
        self.assertTrue(fm.confident(ranked, fm.PRESET_MARGIN))
        self.assertFalse(fm.confident([{"score": 30}, {"score": 25}], fm.PRESET_MARGIN))
        self.assertTrue(fm.confident([{"score": 1}], fm.PRESET_MARGIN))
        self.assertFalse(fm.confident([], fm.PRESET_MARGIN))


class MatchesTest(unittest.TestCase):
    def test_keys(self):
        self.assertEqual(fm.observation_keys(12, "AA BB", "S1", "Polymaker", "PLA", "Matte"),
                         ["spool:12", "tag:aa bb", "sku:s1", "mat:polymaker|pla|matte", "mat:polymaker|pla|"])
        self.assertEqual(fm.observation_keys(material="PETG"), ["mat:|petg|"])
        self.assertEqual(fm.observation_keys(), [])
        self.assertEqual(fm.toolhead_keys({"type": "PLA", "vendor": "Generic"}, {"uid": "X1", "manufacturer": "eSUN"}, 3),
                         ["spool:3", "tag:x1", "mat:esun|pla|"])

    def test_overrides_migrate_to_the_same_picks(self):
        overrides = {"UID:AABB": "Generic PETG @U1", "SKU:S1": "Generic PLA Silk @U1", "polymaker|pla|": "Snapmaker PLA Matte @U1",
                     "junk": "x", "uid:": "y", "sku:s2": ""}
        self.assertEqual(fm.overrides_as_matches(overrides), {"tag:aabb": "Generic PETG @U1", "sku:s1": "Generic PLA Silk @U1",
                                                              "mat:polymaker|pla|": "Snapmaker PLA Matte @U1"})
        store = {"version": 1, "entries": {k: {"default": v} for k, v in fm.overrides_as_matches(overrides).items()}}
        head = {"type": "PLA", "vendor": "Generic"}
        for tag in ({"vendor": "Polymaker", "type": "PLA", "sku": "S1", "uid": "AABB"}, {"vendor": "Polymaker", "type": "PLA", "sku": "S1"},
                    {"vendor": "Polymaker", "type": "PLA"}, {"vendor": "eSUN", "type": "PLA"}):
            old = fm.override_name(PickTest.NAMES, head, tag, overrides)
            new = next((n for n in fm.recall([store], fm.toolhead_keys(head, tag)) if n in PickTest.NAMES), "")
            self.assertEqual(new, old, tag)

    def test_store_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "sub", fm.MATCHES_FILE)
            self.assertEqual(fm.load_matches(path), {"version": 1, "entries": {}})
            fm.remember(path, {"spool:1": "A"}, now=5)
            fm.remember(path, {"spool:1": "B"}, "U1", now=6)
            fm.remember(path, {"tag:x": "C"}, "U1")
            self.assertEqual(fm.load_matches(path)["entries"]["spool:1"], {"default": "A", "printers": {"U1": "B"}, "updated": 6})
            self.assertEqual(fm.recall([fm.load_matches(path)], ["spool:1"], "U1"), ["B", "A"])
            self.assertEqual(fm.recall([fm.load_matches(path)], ["spool:1"], "Kobra"), ["A"])
            other = {"version": 1, "entries": {"spool:1": {"printers": {"U1": "Z"}}}}
            self.assertEqual(fm.recall([other, fm.load_matches(path)], ["tag:x", "spool:1"], "U1"), ["C", "Z", "B", "A"])
            fm.remember(path, {"spool:1": ""}, "U1")
            fm.remember(path, {"spool:1": ""})
            self.assertNotIn("spool:1", fm.load_matches(path)["entries"])
            self.assertEqual([n for n in os.listdir(os.path.dirname(path)) if n != fm.MATCHES_FILE], [])
            with open(path, "w", encoding="utf-8") as f:
                f.write("{broken")
            self.assertEqual(fm.load_matches(path)["entries"], {})
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"version": 2, "entries": {"a": {}}}, f)
            self.assertEqual(fm.load_matches(path)["entries"], {})
            self.assertEqual(fm.recall([None, {"entries": {"k": "bad"}}], ["k"]), [])


class OfdTest(unittest.TestCase):
    INDEX = os.path.join(HERE, "fixtures", "ofd_index.json")

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        with open(self.INDEX, "rb") as f:
            self.body = f.read()
        self.calls = []

    def tearDown(self):
        import shutil
        shutil.rmtree(self.dir, ignore_errors=True)

    def get(self, status=200, fail=None):
        def get(url, headers):
            self.calls.append((url, dict(headers)))
            if fail:
                raise fail
            return status, (self.body if status == 200 else b""), {"ETag": 'W/"abc"', "Last-Modified": "Sun, 22 Nov 2026 02:11:23 GMT"}
        return get

    def test_profiles_are_checked(self):
        with open(self.INDEX, encoding="utf-8") as f:
            doc = json.load(f)
        profiles = fm.ofd_profiles(doc)
        self.assertEqual(len(profiles), len(doc["profiles"]) - 2)   # the ".." path and the entry without fields
        self.assertEqual(fm.ofd_profiles({**doc, "preset_version": "3.0"}), [])
        self.assertEqual(fm.ofd_profiles([]), [])

    def test_fetch_cache_and_offline(self):
        first = fm.ofd_index(self.dir, now=1000, get=self.get())
        self.assertEqual((first["fetched"], first["stale"], first["error"]), (1000, False, ""))
        self.assertEqual(first["version"], "2026.11.22")
        self.assertEqual(self.calls, [(fm.OFD_BASE + fm.OFD_INDEX, {})])
        self.assertEqual(len(fm.ofd_index(self.dir, now=2000, get=self.get())["profiles"]), len(first["profiles"]))
        self.assertEqual(len(self.calls), 1)   # within a day: no request
        later = fm.ofd_index(self.dir, now=1000 + fm.OFD_TTL, get=self.get(304))
        self.assertEqual(self.calls[-1][1], {"If-None-Match": 'W/"abc"', "If-Modified-Since": "Sun, 22 Nov 2026 02:11:23 GMT"})
        self.assertEqual((later["fetched"], later["stale"]), (1000 + fm.OFD_TTL, False))
        offline = fm.ofd_index(self.dir, now=5 * fm.OFD_TTL, get=self.get(fail=OSError("no network")))
        self.assertEqual((offline["stale"], offline["error"], len(offline["profiles"])), (True, "no network", len(first["profiles"])))
        self.body = b"<html>not json</html>"
        broken = fm.ofd_index(self.dir, force=True, now=6 * fm.OFD_TTL, get=self.get())
        self.assertTrue(broken["error"])
        self.assertEqual(len(broken["profiles"]), len(first["profiles"]))   # the last good index stays
        calls = len(self.calls)
        self.assertEqual(len(fm.ofd_index(self.dir, now=9 * fm.OFD_TTL, get=self.get(), offline=True)["profiles"]), len(first["profiles"]))
        self.assertEqual(len(self.calls), calls)
        empty = fm.ofd_index(tempfile.mkdtemp(), now=1, get=self.get(fail=OSError("no network")))
        self.assertEqual((empty["profiles"], empty["fetched"], empty["stale"]), ([], 0, False))

    def test_rank(self):
        profiles = fm.ofd_index(self.dir, now=1, get=self.get())["profiles"]
        ranked = fm.rank_ofd(profiles, "Polymaker", "PLA", "Panchroma Matte Red")
        self.assertEqual(ranked[0]["name"], "Polymaker Dual Panchroma Matte PLA (OFD)")
        self.assertEqual(ranked[0]["reasons"], [["material", "PLA"], ["vendor", "Polymaker"], ["word", "matte"], ["word", "panchroma"]])
        self.assertTrue(all(r["source"] == "ofd" and r["path"].endswith(".json") for r in ranked))
        self.assertLessEqual(len(ranked), 5)
        self.assertEqual({r["brand"] for r in fm.rank_ofd(profiles, "eSUN", "PLA+", limit=0)}, {"eSUN 3D"})
        self.assertEqual(fm.rank_ofd(profiles, "Polymaker", "TPU"), [])
        self.assertEqual(fm.rank_ofd(profiles, "", "PLA"), [])   # no manufacturer: nothing to propose
        self.assertEqual(fm.rank_ofd(profiles, "Bambu", "Nylon")[0]["material"], "PA6")


if __name__ == "__main__":
    unittest.main()
