"""Source information supplied to the program (from the owner's structured statements). Not produced by rules."""
from .model import Statement

SUBJECT = "reviewed compressor-based dehumidifier"
REVIEW = "reformulated review (supplied)"
REVIEWER = "reviewer"
RATER = "rater not established"


def review_statements():
    S = SUBJECT
    return [
        Statement("s01", S, "category", REVIEW, "described", text="compressor-based dehumidifier"),
        Statement("s02", S, "quantity", RATER, "rated", "extraction_rate", (20, 20), "L/day",
                  conditions={"temperature_C": 30, "rh_percent": 80}, unknowns=("rating standard", "rating holder")),
        Statement("s03", S, "quantity", RATER, "rated", "extraction_rate", (12, 12), "L/day",
                  conditions={"temperature_C": 27, "rh_percent": 60}, unknowns=("rating standard", "rating holder")),
        Statement("s04", S, "quantity", REVIEWER, "measured", "room_temperature", (21.5, 21.5), "°C",
                  conditions={"setting": "home test", "elapsed_h": 0}),
        Statement("s05", S, "quantity", REVIEWER, "measured", "room_rh", (76, 76), "%RH",
                  conditions={"setting": "home test", "elapsed_h": 0}),
        Statement("s06", S, "quantity", REVIEWER, "measured", "room_rh", (67, 67), "%RH",
                  conditions={"setting": "home test", "elapsed_h": 1},
                  unknowns=("room temperature at 1 h", "room volume", "operating mode")),
        Statement("s07", S, "quantity", REVIEWER, "measured", "room_rh", (61, 61), "%RH",
                  conditions={"setting": "home test", "elapsed_h": 2},
                  unknowns=("room temperature at 2 h", "room volume", "operating mode")),
        Statement("s08", S, "quantity", REVIEWER, "measured", "sound_level", (34.2, 38.7), "dB(A)",
                  conditions={"mode": "normal"}, unknowns=("distance", "instrument")),
        Statement("s09", S, "function", REVIEW, "described", conditions={"mode": "night"},
                  attributes={"fan_speed": "reduced", "lights": "off", "audible_signals": "off"}),
        Statement("s10", S, "gap", REVIEW, "declared", "sound_level", conditions={"mode": "night"},
                  text="no night-mode noise measurement supplied"),
        Statement("s11", S, "function", REVIEW, "described", conditions={"mode": "smart_laundry"},
                  attributes={"airflow": "increased"}),
        Statement("s12", S, "quantity", REVIEW, "reported", "sound_level", (46, 46), "dB(A)", approximate=True,
                  conditions={"mode": "smart_laundry"}, unknowns=("measuring holder", "distance")),
        Statement("s13", S, "evaluation", REVIEWER, "judged", conditions={"mode": "normal"},
                  attributes={"predicate": "relatively quiet", "target_quantity": "sound_level",
                              "criterion": None, "level": None, "goal": None, "comparator": None}),
    ]


VARIANT_SUBJECT = "unit-Z (unfamiliar label)"


def variant_statements():
    S = VARIANT_SUBJECT
    return [
        Statement("v01", S, "quantity", "maker", "rated", "moisture_flux", (1.4, 1.4), "kg/h",
                  conditions={"temperature_C": 35, "rh_percent": 70}),
        Statement("v02", S, "quantity", "maker", "rated", "moisture_flux", (0.9, 0.9), "kg/h",
                  conditions={"temperature_C": 25, "rh_percent": 70}),
        Statement("v03", S, "quantity", "tester", "measured", "acoustic_emission", (41, 41), "dB(A)",
                  conditions={"mode": "standard"}),
        Statement("v04", S, "function", "maker", "described", conditions={"mode": "eco"},
                  attributes={"compressor": "cycled"}),
        Statement("v05", S, "quantity", "maker", "rated", "unconditioned_capacity", (30, 30), "L/day",
                  unknowns=("test conditions",)),
    ]
