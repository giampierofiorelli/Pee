"""Example knowledge and situations (development material, not evidence).

Numerical values are standard reference figures recalled by the developer (Claude). They were not re-checked
against the cited sources in this session; citations identify the kind of source, not a verified page. Situation
records (grain sizes, elapsed times, measured speeds) are illustrative. Four unrelated settings use two models:
sediment settling in water, droplet settling in air, radioactive decay, and drug elimination.
"""
from .knowledge import (Attribute, DomainCondition, KB, Link, Model, QuantityKind, Requirement, SingleValued,
                        Situation, Value)
from .units import dim

T20 = (20.0, 20.0, "degC")
T10 = (10.0, 10.0, "degC")
P_STD = (101.325, 101.325, "kPa")
REF = "reference value recalled by the developer; not re-checked in this session"


def kinds():
    return [
        QuantityKind("radius", dim(L=1), False),
        QuantityKind("travel_distance", dim(L=1), False),
        QuantityKind("speed", dim(L=1, T=-1), False),
        QuantityKind("travel_time", dim(T=1), False),
        QuantityKind("mass_density", dim(L=-3, M=1), True),
        QuantityKind("dynamic_viscosity", dim(L=-1, M=1, T=-1), True),
        QuantityKind("gravitational_acceleration", dim(L=1, T=-2), True),
        QuantityKind("remaining_fraction", dim(), False),
        QuantityKind("elapsed_time", dim(T=1), False),
        QuantityKind("decay_rate_constant", dim(T=-1), True),
        QuantityKind("half_life", dim(T=1), True),
    ]


def models():
    return [
        Model("M-stokes", "Stokes drag: steady settling of a small rigid sphere in a Newtonian fluid",
              variables={"v": ("particle", "speed"), "r": ("particle", "radius"),
                         "rho_p": ("particle", "mass_density"), "rho_f": ("fluid", "mass_density"),
                         "mu": ("fluid", "dynamic_viscosity"), "g": ("field", "gravitational_acceleration")},
              forms={"v": "2*(rho_p - rho_f)*g*r^2/(9*mu)",
                     "r": "sqrt(9*mu*v/(2*(rho_p - rho_f)*g))",
                     "mu": "2*(rho_p - rho_f)*g*r^2/(9*v)"},
              requirements=(Requirement("particle", "shape", "sphere"), Requirement("particle", "rigidity", "rigid"),
                            Requirement("fluid", "rheology", "newtonian"), Requirement("particle", "motion", "steady")),
              conditions=(DomainCondition("rho_f*v*2*r/mu", "<", 0.1, 1.0,
                                          "particle Reynolds number; creeping-flow bound usually stated between 0.1 "
                                          "and 1, kept as an uncertain bound"),),
              generality="idealised law",
              source="Stokes, 'On the effect of the internal friction of fluids on the motion of pendulums', 1851; "
                     "validity bound as in standard fluid-mechanics texts (e.g. Batchelor, An Introduction to Fluid "
                     "Dynamics, 1967)"),
        Model("M-uniform-motion", "Uniform motion: distance = speed x time",
              variables={"t": ("particle", "travel_time"), "d": ("particle", "travel_distance"),
                         "v": ("particle", "speed")},
              forms={"t": "d/v", "d": "v*t", "v": "d/t"},
              requirements=(Requirement("particle", "motion", "steady"),),
              generality="definition", source="kinematics: definition of speed", ground="G4 definition"),
        Model("M-first-order", "First-order kinetics: remaining fraction = exp(-k t)",
              variables={"f": ("population", "remaining_fraction"), "k": ("population", "decay_rate_constant"),
                         "t": ("population", "elapsed_time")},
              forms={"f": "exp(-k*t)", "k": "-ln(f)/t", "t": "-ln(f)/k"},
              requirements=(Requirement("population", "rate_law", "first_order"),),
              generality="functional dependency",
              source="first-order rate law (Rutherford and Soddy, 'Radioactive change', 1903; any physical-chemistry "
                     "text, e.g. Atkins, Physical Chemistry)"),
        Model("M-half-life", "Half-life of a first-order process: k = ln 2 / T",
              variables={"k": ("population", "decay_rate_constant"), "T": ("population", "half_life")},
              forms={"k": "ln(2)/T", "T": "ln(2)/k"},
              requirements=(Requirement("population", "rate_law", "first_order"),),
              generality="definition", source="definition of half-life for first-order kinetics",
              ground="G4 definition"),
    ]


def facts():
    return [
        SingleValued("SV-shape", "shape", "a body has one shape at a time"),
        SingleValued("SV-rate-law", "rate_law", "rate-law orders exclude one another for one process"),
        Value("V-quartz-density", "quartz", "mass_density", 2.64, 2.66, "g/cm3",
              source="mineralogy reference (e.g. Deer, Howie and Zussman, An Introduction to the Rock-Forming "
                     "Minerals, 3rd ed., 2013); " + REF),
        Attribute("A-quartz-rigid", "quartz", "rigidity", "rigid", material=True, source="solid mineral; " + REF),
        Value("V-water-density-20C", "water", "mass_density", 998.1, 998.3, "kg/m3", {"temperature": T20},
              source="IAPWS-95 tabulations; " + REF),
        Value("V-water-viscosity-20C", "water", "dynamic_viscosity", 1.001, 1.002, "mPa s", {"temperature": T20},
              source="IAPWS 2008 viscosity formulation; " + REF),
        Attribute("A-water-newtonian", "water", "rheology", "newtonian", material=True, source="fluid mechanics texts"),
        Value("V-air-density-20C", "air", "mass_density", 1.203, 1.205, "kg/m3",
              {"temperature": T20, "pressure": P_STD}, source="dry air, ideal-gas tables; " + REF),
        Value("V-air-viscosity-20C", "air", "dynamic_viscosity", 1.81e-5, 1.82e-5, "Pa s", {"temperature": T20},
              source="dry air (Sutherland correlation tables); " + REF),
        Attribute("A-air-newtonian", "air", "rheology", "newtonian", material=True, source="fluid mechanics texts"),
        Value("V-g-earth", "Earth surface", "gravitational_acceleration", 9.78, 9.84, "m/s2",
              source="range from equator to poles near sea level (geodesy); " + REF),
        Attribute("A-cloud-droplet-sphere", "cloud droplet", "shape", "sphere",
                  source="small droplets are held spherical by surface tension (cloud physics texts)"),
        Link("L-droplet-water", "cloud droplet", "made_of", "water"),
        Attribute("A-fibre-shape", "microplastic fibre", "shape", "fibre", source="definition of a fibre"),
        Link("L-cs-radionuclide", "Cs-137", "subkind_of", "radionuclide"),
        Attribute("A-radionuclide-first-order", "radionuclide", "rate_law", "first_order", material=True,
                  source="law of radioactive decay (Rutherford and Soddy, 1903)"),
        Value("V-cs137-half-life", "Cs-137", "half_life", 29.99, 30.17, "a",
              source="evaluated nuclear data, 30.08(9) a (ENSDF/NNDC); " + REF),
        Value("V-caffeine-half-life", "caffeine", "half_life", 3.0, 7.0, "h", {"subject_group": "healthy adult"},
              source="commonly reported adult range; illustrative; " + REF),
        Attribute("A-caffeine-first-order", "caffeine", "rate_law", "first_order", material=True,
                  conditions={"subject_group": "healthy adult"},
                  source="linear elimination at usual intake (pharmacology texts); illustrative"),
        Attribute("A-ethanol-zero-order", "ethanol", "rate_law", "zero_order", material=True,
                  conditions={"blood_concentration_regime": "above enzyme saturation"},
                  source="Widmark, 'Die theoretischen Grundlagen ... der gerichtlich-medizinischen "
                         "Alkoholbestimmung', 1932 (linear decline of blood alcohol)"),
    ]


def records():
    """Situation-specific records (illustrative observations of the entities in the situations)."""
    rec = "situation record (illustrative)"
    return [
        Link("L-S1-quartz", "silt grain S1", "made_of", "quartz"),
        Value("V-silt-radius", "silt grain S1", "radius", 4.5, 5.5, "um", source=rec, ground="G1 record"),
        Value("V-silt-distance", "silt grain S1", "travel_distance", 1.0, 1.0, "m", source=rec, ground="G1 record"),
        Link("L-C1-quartz", "sand grain C1", "made_of", "quartz"),
        Value("V-coarse-radius", "sand grain C1", "radius", 0.24, 0.26, "mm", source=rec, ground="G1 record"),
        Link("L-F2-quartz", "sand grain F2", "made_of", "quartz"),
        Value("V-fine-radius", "sand grain F2", "radius", 49.0, 51.0, "um", source=rec, ground="G1 record"),
        Link("L-D1-droplet", "droplet D1", "instance_of", "cloud droplet"),
        Value("V-droplet-radius", "droplet D1", "radius", 4.5, 5.5, "um", source=rec, ground="G1 record"),
        Link("L-F1-fibre", "fibre F1", "instance_of", "microplastic fibre"),
        Value("V-fibre-radius", "fibre F1", "radius", 4.5, 5.5, "um", source=rec, ground="G1 record"),
        Link("L-P9-quartz", "grain P9", "made_of", "quartz"),
        Value("V-P9-speed", "grain P9", "speed", 0.5, 0.6, "mm/s", {"temperature": T20},
              source="settling-tube observation (illustrative)", ground="G1 record"),
        Link("L-K-cs", "Cs-137 in soil sample K", "made_of", "Cs-137"),
        Value("V-K-elapsed", "Cs-137 in soil sample K", "elapsed_time", 40.0, 40.0, "a", source=rec, ground="G1 record"),
        Link("L-P-caffeine", "caffeine in subject P", "made_of", "caffeine"),
        Value("V-P-elapsed", "caffeine in subject P", "elapsed_time", 12.0, 12.0, "h", source=rec, ground="G1 record"),
        Link("L-N-caffeine", "caffeine in neonate N", "made_of", "caffeine"),
        Value("V-N-elapsed", "caffeine in neonate N", "elapsed_time", 12.0, 12.0, "h", source=rec, ground="G1 record"),
        Link("L-Q-ethanol", "ethanol in subject Q", "made_of", "ethanol"),
        Value("V-Q-elapsed", "ethanol in subject Q", "elapsed_time", 2.0, 2.0, "h", source=rec, ground="G1 record"),
    ]


def build_kb():
    return KB(kinds() + models() + facts() + records())


def later_acquisitions():
    """Knowledge acquired after the first run, answering the needs the program reported for silt at 10 degC."""
    return [
        Value("V-water-density-10C", "water", "mass_density", 999.6, 999.8, "kg/m3", {"temperature": T10},
              source="IAPWS-95 tabulations; " + REF),
        Value("V-water-viscosity-10C", "water", "dynamic_viscosity", 1.305, 1.307, "mPa s", {"temperature": T10},
              source="IAPWS 2008 viscosity formulation; " + REF),
    ]


def _assume(entity, sit, **attrs):
    return tuple(Attribute(f"assume-{sit}-{k}", entity, k, v, source=f"assumption of situation {sit}",
                           ground="G5 assumption") for k, v in attrs.items())


def situations():
    settle = lambda sid, grain, conds, **extra: Situation(
        sid, {"particle": grain, "fluid": "water", "field": "Earth surface"}, conds,
        _assume(grain, sid, shape="sphere", motion="steady", **extra))
    air = {"particle": "droplet D1", "fluid": "air", "field": "Earth surface"}
    s = [
        settle("silt_20C", "silt grain S1", {"temperature": T20}),
        settle("coarse_sand_20C", "sand grain C1", {"temperature": T20}),
        settle("fine_sand_20C", "sand grain F2", {"temperature": T20}),
        settle("silt_10C", "silt grain S1", {"temperature": T10}),
        settle("silt_no_temperature", "silt grain S1", {}),
        settle("grain_sizing", "grain P9", {"temperature": T20}),
        Situation("fog_droplet", air, {"temperature": T20, "pressure": P_STD},
                  _assume("droplet D1", "fog_droplet", rigidity="rigid", motion="steady")),
        Situation("fog_droplet_no_pressure", air, {"temperature": T20},
                  _assume("droplet D1", "fog_droplet_no_pressure", rigidity="rigid", motion="steady")),
        Situation("microfibre", {"particle": "fibre F1", "fluid": "water", "field": "Earth surface"},
                  {"temperature": T20}, _assume("fibre F1", "microfibre", motion="steady", rigidity="rigid")),
        Situation("cs137_soil", {"population": "Cs-137 in soil sample K"}),
        Situation("caffeine_adult", {"population": "caffeine in subject P"}, {"subject_group": "healthy adult"}),
        Situation("caffeine_neonate", {"population": "caffeine in neonate N"}, {"subject_group": "neonate"}),
        Situation("ethanol_saturated", {"population": "ethanol in subject Q"},
                  {"blood_concentration_regime": "above enzyme saturation"}),
    ]
    return {x.id: x for x in s}
