"""Example knowledge and situations (development material, not evidence).

Numerical reference values are standard figures recalled by the developer (Claude). They were not checked against
the cited sources in this session, so their basis is 'published reference' and no verification record exists for them. Situation
data (grain sizes, elapsed times, measured speeds) are invented and marked 'illustrative'. Every conclusion drawn
from them is therefore labelled illustrative by the program itself. Four unrelated settings use two models:
sediment settling in water, droplet settling in air, radioactive decay and drug elimination.
"""
from .knowledge import (Attribute, DomainCondition, KB, Link, Model, QuantityKind, Requirement, SingleValued,
                        Situation, Value)
from .units import dim

T20 = (20.0, 20.0, "degC")
T10 = (10.0, 10.0, "degC")
P_STD = (101.325, 101.325, "kPa")
NEAR_SEA_LEVEL = (-0.5, 2.0, "km")
LOW_SITE = (0.0, 0.2, "km")
REF = "reference value recalled by the developer; not re-checked in this session"
PUB, DEF, ILL = "published reference", "definition", "illustrative"
VOCAB = "S1 vocabulary (developer)"


def kinds():
    k = lambda i, d, intensive: QuantityKind(i, d, intensive, source=VOCAB)
    return [
        k("radius", dim(L=1), False), k("travel_distance", dim(L=1), False), k("speed", dim(L=1, T=-1), False),
        k("travel_time", dim(T=1), False), k("mass_density", dim(L=-3, M=1), True),
        k("dynamic_viscosity", dim(L=-1, M=1, T=-1), True), k("gravitational_acceleration", dim(L=1, T=-2), True),
        k("remaining_fraction", dim(), False), k("elapsed_time", dim(T=1), False),
        k("decay_rate_constant", dim(T=-1), True), k("half_life", dim(T=1), True),
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
              generality="idealised law", basis=PUB,
              source="Stokes, 'On the effect of the internal friction of fluids on the motion of pendulums', 1851; "
                     "validity bound as in standard fluid-mechanics texts (e.g. Batchelor, An Introduction to Fluid "
                     "Dynamics, 1967)"),
        Model("M-uniform-motion", "Uniform motion: distance = speed x time",
              variables={"t": ("particle", "travel_time"), "d": ("particle", "travel_distance"),
                         "v": ("particle", "speed")},
              forms={"t": "d/v", "d": "v*t", "v": "d/t"},
              requirements=(Requirement("particle", "motion", "steady"),),
              generality="definition", source="kinematics: definition of speed", basis=DEF),
        Model("M-first-order", "First-order kinetics: remaining fraction = exp(-k t)",
              variables={"f": ("population", "remaining_fraction"), "k": ("population", "decay_rate_constant"),
                         "t": ("population", "elapsed_time")},
              forms={"f": "exp(-k*t)", "k": "-ln(f)/t", "t": "-ln(f)/k"},
              requirements=(Requirement("population", "rate_law", "first_order"),),
              generality="functional dependency", basis=PUB,
              source="first-order rate law (Rutherford and Soddy, 'Radioactive change', 1903; any physical-chemistry "
                     "text, e.g. Atkins, Physical Chemistry)"),
        Model("M-half-life", "Half-life of a first-order process: k = ln 2 / T",
              variables={"k": ("population", "decay_rate_constant"), "T": ("population", "half_life")},
              forms={"k": "ln(2)/T", "T": "ln(2)/k"},
              requirements=(Requirement("population", "rate_law", "first_order"),),
              generality="definition", source="definition of half-life for first-order kinetics", basis=DEF),
    ]


def facts():
    return [
        SingleValued("SV-shape", "shape", source="a body has one shape at a time"),
        SingleValued("SV-rate-law", "rate_law", source="rate-law orders exclude one another for one process"),
        Value("V-quartz-density", "quartz", "mass_density", 2.64, 2.66, "g/cm3", {}, "invariant", "material",
              invariance="thermal expansion and compression change quartz density far less than the interval width "
                         "at near-surface conditions",
              basis=PUB, source="mineralogy reference (e.g. Deer, Howie and Zussman, An Introduction to the "
                                "Rock-Forming Minerals, 3rd ed., 2013); " + REF),
        Attribute("A-quartz-rigid", "quartz", "rigidity", "rigid", {}, "invariant", "material",
                  invariance="a crystalline solid at ordinary stresses", basis=PUB, source="mineralogy; " + REF),
        Value("V-water-density-20C", "water", "mass_density", 998.1, 998.3, "kg/m3", {"temperature": T20},
              "conditional", "material", basis=PUB, source="IAPWS-95 tabulations; " + REF),
        Value("V-water-viscosity-20C", "water", "dynamic_viscosity", 1.001, 1.002, "mPa s", {"temperature": T20},
              "conditional", "material", basis=PUB, source="IAPWS 2008 viscosity formulation; " + REF),
        Attribute("A-water-newtonian", "water", "rheology", "newtonian", {}, "invariant", "material",
                  invariance="liquid water is Newtonian across ordinary conditions", basis=PUB,
                  source="fluid mechanics texts"),
        Value("V-air-density-20C", "air", "mass_density", 1.203, 1.205, "kg/m3",
              {"temperature": T20, "pressure": P_STD}, "conditional", "material", basis=PUB,
              source="dry air, ideal-gas tables; " + REF),
        Value("V-air-viscosity-20C", "air", "dynamic_viscosity", 1.81e-5, 1.82e-5, "Pa s", {"temperature": T20},
              "conditional", "material", basis=PUB, source="dry air (Sutherland correlation tables); " + REF),
        Attribute("A-air-newtonian", "air", "rheology", "newtonian", {}, "invariant", "material",
                  invariance="gases are Newtonian at ordinary conditions", basis=PUB, source="fluid mechanics texts"),
        Value("V-g-earth", "Earth surface", "gravitational_acceleration", 9.78, 9.84, "m/s2",
              {"altitude": NEAR_SEA_LEVEL}, "conditional", "individual", basis=PUB,
              source="range from equator to poles at low altitude (geodesy); " + REF),
        Attribute("A-cloud-droplet-sphere", "cloud droplet", "shape", "sphere", {}, "invariant", "kind",
                  invariance="at cloud-droplet sizes surface tension keeps droplets spherical", basis=PUB,
                  source="cloud physics texts"),
        Link("L-droplet-water", "cloud droplet", "made_of", "water", source="cloud droplets are liquid water",
             basis=DEF),
        Attribute("A-fibre-shape", "microplastic fibre", "shape", "fibre", {}, "invariant", "kind",
                  invariance="definition of a fibre", basis=DEF, source="definition of a fibre"),
        Link("L-cs-radionuclide", "Cs-137", "subkind_of", "radionuclide", source="nuclear physics", basis=DEF),
        Attribute("A-radionuclide-first-order", "radionuclide", "rate_law", "first_order", {}, "invariant",
                  "material", invariance="each nucleus decays with a constant probability per unit time", basis=PUB,
                  source="law of radioactive decay (Rutherford and Soddy, 1903)"),
        Value("V-cs137-half-life", "Cs-137", "half_life", 29.99, 30.17, "a", {}, "invariant", "material",
              invariance="beta-decay constants are insensitive to chemical and thermal environment", basis=PUB,
              source="evaluated nuclear data, 30.08(9) a (ENSDF/NNDC); " + REF),
        Value("V-caffeine-half-life-adults", "caffeine elimination", "half_life", 3.0, 7.0, "h",
              {"subject_group": "healthy adult"}, "conditional", "population", basis=ILL,
              source="commonly reported spread across healthy adults; illustrative"),
        Attribute("A-caffeine-first-order", "caffeine elimination", "rate_law", "first_order",
                  {"subject_group": "healthy adult"}, "conditional", "kind", basis=ILL,
                  source="linear elimination at usual intake (pharmacology texts); illustrative"),
        Attribute("A-ethanol-zero-order", "ethanol elimination", "rate_law", "zero_order",
                  {"blood_concentration_regime": "above enzyme saturation"}, "conditional", "kind", basis=PUB,
                  source="Widmark, 'Die theoretischen Grundlagen ... der gerichtlich-medizinischen "
                         "Alkoholbestimmung', 1932 (linear decline of blood alcohol)"),
        # identities of the individuals in the example situations (illustrative)
        Link("L-S1-quartz", "silt grain S1", "made_of", "quartz", source="example individual", basis=ILL),
        Link("L-C1-quartz", "sand grain C1", "made_of", "quartz", source="example individual", basis=ILL),
        Link("L-F2-quartz", "sand grain F2", "made_of", "quartz", source="example individual", basis=ILL),
        Link("L-P9-quartz", "grain P9", "made_of", "quartz", source="example individual", basis=ILL),
        Link("L-D1-droplet", "droplet D1", "instance_of", "cloud droplet", source="example individual", basis=ILL),
        Link("L-F1-fibre", "fibre F1", "instance_of", "microplastic fibre", source="example individual", basis=ILL),
        Link("L-K-cs", "Cs-137 in soil sample K", "made_of", "Cs-137", source="example individual", basis=ILL),
        Link("L-P-caffeine", "caffeine in subject P", "instance_of", "caffeine elimination",
             source="example individual", basis=ILL),
        Link("L-P2-caffeine", "caffeine in subject P2", "instance_of", "caffeine elimination",
             source="example individual", basis=ILL),
        Link("L-N-caffeine", "caffeine in neonate N", "instance_of", "caffeine elimination",
             source="example individual", basis=ILL),
        Link("L-Q-ethanol", "ethanol in subject Q", "instance_of", "ethanol elimination",
             source="example individual", basis=ILL),
    ]


def build_kb():
    return KB(kinds() + models() + facts())


def later_acquisitions():
    """Knowledge acquired after the first run, answering the needs the program reported for silt at 10 degC."""
    return [
        Value("V-water-density-10C", "water", "mass_density", 999.6, 999.8, "kg/m3", {"temperature": T10},
              "conditional", "material", basis=PUB, source="IAPWS-95 tabulations; " + REF),
        Value("V-water-viscosity-10C", "water", "dynamic_viscosity", 1.305, 1.307, "mPa s", {"temperature": T10},
              "conditional", "material", basis=PUB, source="IAPWS 2008 viscosity formulation; " + REF),
    ]


def given(i, bearer, kind, lo, hi, unit):
    return Value(i, bearer, kind, lo, hi, unit, {}, "invariant", "individual", invariance="datum of this situation",
                 basis=ILL, source="situation datum (illustrative)")


def _assume(entity, sit, **attrs):
    return tuple(Attribute(f"assume-{sit}-{k}", entity, k, v, {}, "invariant", "individual",
                           invariance="holds within this situation", source=f"assumption of situation {sit}",
                           basis="assumption") for k, v in attrs.items())


def situations():
    def settle(sid, grain, conds, givens):
        return Situation(sid, {"particle": grain, "fluid": "water", "field": "Earth surface"}, conds, givens,
                         _assume(grain, sid, shape="sphere", motion="steady"))
    silt = (given("G-silt-radius", "silt grain S1", "radius", 4.5, 5.5, "um"),
            given("G-silt-distance", "silt grain S1", "travel_distance", 1.0, 1.0, "m"))
    site20 = {"temperature": T20, "altitude": LOW_SITE}
    air = {"particle": "droplet D1", "fluid": "air", "field": "Earth surface"}
    drop = (given("G-droplet-radius", "droplet D1", "radius", 4.5, 5.5, "um"),)
    s = [
        settle("silt_20C", "silt grain S1", site20, silt),
        settle("coarse_sand_20C", "sand grain C1", site20,
               (given("G-coarse-radius", "sand grain C1", "radius", 0.24, 0.26, "mm"),)),
        settle("fine_sand_20C", "sand grain F2", site20,
               (given("G-fine-radius", "sand grain F2", "radius", 49.0, 51.0, "um"),)),
        settle("silt_10C", "silt grain S1", {"temperature": T10, "altitude": LOW_SITE}, silt),
        settle("silt_no_temperature", "silt grain S1", {"altitude": LOW_SITE}, silt),
        settle("grain_sizing", "grain P9", site20,
               (given("G-P9-speed", "grain P9", "speed", 0.5, 0.6, "mm/s"),)),
        Situation("fog_droplet", air, dict(site20, pressure=P_STD), drop,
                  _assume("droplet D1", "fog_droplet", rigidity="rigid", motion="steady")),
        Situation("fog_droplet_no_pressure", air, site20, drop,
                  _assume("droplet D1", "fog_droplet_no_pressure", rigidity="rigid", motion="steady")),
        Situation("microfibre", {"particle": "fibre F1", "fluid": "water", "field": "Earth surface"}, site20,
                  (given("G-fibre-radius", "fibre F1", "radius", 4.5, 5.5, "um"),),
                  _assume("fibre F1", "microfibre", motion="steady", rigidity="rigid")),
        Situation("cs137_soil", {"population": "Cs-137 in soil sample K"}, {},
                  (given("G-K-elapsed", "Cs-137 in soil sample K", "elapsed_time", 40.0, 40.0, "a"),)),
        Situation("caffeine_adult", {"population": "caffeine in subject P"}, {"subject_group": "healthy adult"},
                  (given("G-P-elapsed", "caffeine in subject P", "elapsed_time", 12.0, 12.0, "h"),
                   given("G-P-half-life", "caffeine in subject P", "half_life", 4.8, 5.2, "h"))),
        Situation("caffeine_adult_unmeasured", {"population": "caffeine in subject P2"},
                  {"subject_group": "healthy adult"},
                  (given("G-P2-elapsed", "caffeine in subject P2", "elapsed_time", 12.0, 12.0, "h"),)),
        Situation("caffeine_neonate", {"population": "caffeine in neonate N"}, {"subject_group": "neonate"},
                  (given("G-N-elapsed", "caffeine in neonate N", "elapsed_time", 12.0, 12.0, "h"),)),
        Situation("ethanol_saturated", {"population": "ethanol in subject Q"},
                  {"blood_concentration_regime": "above enzyme saturation"},
                  (given("G-Q-elapsed", "ethanol in subject Q", "elapsed_time", 2.0, 2.0, "h"),)),
    ]
    return {x.id: x for x in s}
