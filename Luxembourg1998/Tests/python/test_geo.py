import pytest

from lux98 import geo


def test_luxembourg_city_lies_in_expected_luref_range():
    e, n = geo.wgs84_to_luref(49.6116, 6.1300)
    # LUREF: Falsche Ostverschiebung 80 000 m, Nord 100 000 m am Ursprung 49°50'N 6°10'E.
    # Die Stadt liegt suedwestlich davon -> etwas kleinere Werte.
    assert 70_000 < e < 80_000
    assert 70_000 < n < 80_000


def test_luref_projection_origin():
    e, n = geo.wgs84_to_luref(49 + 50 / 60, 6 + 10 / 60)
    # Am Projektionsursprung (Datumsverschiebung LUREF<->WGS84 ergibt wenige Meter Abweichung)
    assert e == pytest.approx(80_000, abs=200)
    assert n == pytest.approx(100_000, abs=200)


def test_roundtrip_wgs84_luref():
    lat, lon = 49.6000, 6.1340
    back = geo.luref_to_wgs84(*geo.wgs84_to_luref(lat, lon))
    assert back[0] == pytest.approx(lat, abs=1e-7)
    assert back[1] == pytest.approx(lon, abs=1e-7)


def test_unreal_axes_and_units():
    e0, n0 = geo.world_origin_luref()
    p = geo.luref_to_unreal(e0 + 10, n0 + 5, 300, base_height_m=250)
    assert (p.x, p.y, p.z) == pytest.approx((1000, -500, 5000))
    assert geo.unreal_to_luref(p, base_height_m=250) == pytest.approx((e0 + 10, n0 + 5, 300))


def test_station_is_south_of_origin_in_unreal():
    # Bahnhof liegt suedlich der Oberstadt -> positives Y in Unreal
    p = geo.wgs84_to_unreal(49.6000, 6.1340)
    assert p.y > 0
    assert 1_000 * 100 < p.y < 1_600 * 100  # ca. 1,3 km
