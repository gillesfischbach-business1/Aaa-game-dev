#!/usr/bin/env bash
# LUX98 – alle Pruefungen, die ohne Unreal laufen (Linux, macOS, Windows/Git-Bash).
set -euo pipefail
cd "$(dirname "$0")/.."
BUILD_DIR="${BUILD_DIR:-build}"
echo "== 1/3 Kern kompilieren (C++20, Warnungen = Fehler) =="
cmake -S . -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Debug > /dev/null
cmake --build "$BUILD_DIR" -j
echo "== 2/3 Kern-Tests =="
"$BUILD_DIR/lux98_core_tests"
echo "== 3/3 Python: Geodaten + Anachronismus-Pruefer =="
python3 -m pytest -q Tests/python
(cd Scripts && python3 -m lux98.validate_history --quiet)
