"""Koordinaten: WGS84 (GPS) <-> LUREF / Luxembourg TM (EPSG:2169) <-> Unreal-Weltkoordinaten.

Unreal: 1 Einheit = 1 cm, linkshaendiges System, Z nach oben.
Abbildung: X = Ost, Y = Sued (also -Nord), Z = Hoehe. Ursprung = WORLD_ORIGIN (Naehe Place d'Armes),
damit die Zahlen klein bleiben (Gleitkomma-Genauigkeit). Fuer 51 km^2 reicht das ohne Large World
Coordinates; UE5 hat LWC trotzdem standardmaessig aktiv.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from pyproj import Transformer

EPSG_WGS84 = 4326
EPSG_LUREF = 2169

# Naehe Place d'Armes, gerundet. Aenderung verschiebt die gesamte Welt -> nur mit Migration aendern!
WORLD_ORIGIN_WGS84 = (49.6116, 6.1300)


@lru_cache(maxsize=None)
def _to_luref() -> Transformer:
    return Transformer.from_crs(EPSG_WGS84, EPSG_LUREF, always_xy=True)


@lru_cache(maxsize=None)
def _to_wgs84() -> Transformer:
    return Transformer.from_crs(EPSG_LUREF, EPSG_WGS84, always_xy=True)


def wgs84_to_luref(lat: float, lon: float) -> tuple[float, float]:
    """Gibt (Ost, Nord) in Metern zurueck."""
    e, n = _to_luref().transform(lon, lat)
    return e, n


def luref_to_wgs84(east: float, north: float) -> tuple[float, float]:
    """Gibt (lat, lon) zurueck."""
    lon, lat = _to_wgs84().transform(east, north)
    return lat, lon


@dataclass(frozen=True)
class UnrealPoint:
    x: float  # cm, Ost
    y: float  # cm, Sued
    z: float  # cm, Hoehe


def world_origin_luref() -> tuple[float, float]:
    return wgs84_to_luref(*WORLD_ORIGIN_WGS84)


def luref_to_unreal(east: float, north: float, height_m: float = 0.0,
                    base_height_m: float = 0.0) -> UnrealPoint:
    e0, n0 = world_origin_luref()
    return UnrealPoint((east - e0) * 100.0, -(north - n0) * 100.0, (height_m - base_height_m) * 100.0)


def unreal_to_luref(p: UnrealPoint, base_height_m: float = 0.0) -> tuple[float, float, float]:
    e0, n0 = world_origin_luref()
    return e0 + p.x / 100.0, n0 - p.y / 100.0, p.z / 100.0 + base_height_m


def wgs84_to_unreal(lat: float, lon: float, height_m: float = 0.0) -> UnrealPoint:
    return luref_to_unreal(*wgs84_to_luref(lat, lon), height_m)
