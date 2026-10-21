"""Units and dimensions (S0 4.7, Op5, C2).

A unit is data: a factor and an offset to the coherent SI unit, and a dimension vector over the base dimensions
length, mass, time, temperature and amount of substance. The offset is used only to convert absolute values
(degrees Celsius). Unknown units have no dimension and are refused at acquisition.
"""

BASE = ("m", "kg", "s", "K", "mol")


def dim(L=0, M=0, T=0, K=0, N=0):
    return (float(L), float(M), float(T), float(K), float(N))


NONE = dim()

UNITS = {
    "1": (1.0, 0.0, NONE),
    "m": (1.0, 0.0, dim(L=1)), "cm": (1e-2, 0.0, dim(L=1)), "mm": (1e-3, 0.0, dim(L=1)),
    "um": (1e-6, 0.0, dim(L=1)), "km": (1e3, 0.0, dim(L=1)),
    "s": (1.0, 0.0, dim(T=1)), "min": (60.0, 0.0, dim(T=1)), "h": (3600.0, 0.0, dim(T=1)),
    "d": (86400.0, 0.0, dim(T=1)), "a": (365.25 * 86400.0, 0.0, dim(T=1)),
    "kg": (1.0, 0.0, dim(M=1)), "g": (1e-3, 0.0, dim(M=1)), "mg": (1e-6, 0.0, dim(M=1)),
    "K": (1.0, 0.0, dim(K=1)), "degC": (1.0, 273.15, dim(K=1)),
    "Pa": (1.0, 0.0, dim(L=-1, M=1, T=-2)), "kPa": (1e3, 0.0, dim(L=-1, M=1, T=-2)),
    "Pa s": (1.0, 0.0, dim(L=-1, M=1, T=-1)), "mPa s": (1e-3, 0.0, dim(L=-1, M=1, T=-1)),
    "kg/m3": (1.0, 0.0, dim(L=-3, M=1)), "g/cm3": (1e3, 0.0, dim(L=-3, M=1)),
    "m/s": (1.0, 0.0, dim(L=1, T=-1)), "mm/s": (1e-3, 0.0, dim(L=1, T=-1)),
    "m/s2": (1.0, 0.0, dim(L=1, T=-2)),
    "1/s": (1.0, 0.0, dim(T=-1)), "1/h": (1 / 3600.0, 0.0, dim(T=-1)), "1/a": (1 / (365.25 * 86400.0), 0.0, dim(T=-1)),
    "mol/L": (1e3, 0.0, dim(L=-3, N=1)), "mg/L": (1e-3, 0.0, dim(L=-3, M=1)),
}


def known(unit):
    return unit in UNITS


def dims_of(unit):
    return UNITS[unit][2]


def to_si(lo, hi, unit):
    f, off, _ = UNITS[unit]
    return lo * f + off, hi * f + off


def from_si(lo, hi, unit):
    f, off, _ = UNITS[unit]
    return (lo - off) / f, (hi - off) / f


def same_dims(a, b, tol=1e-9):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def si_label(d):
    parts = [f"{b}^{e:g}" if e != 1 else b for b, e in zip(BASE, d) if e]
    return " ".join(parts) or "1"
