#!/bin/bash
# SessionStart hook for Claude Code cloud sessions: makes the game's tests and the Blender model build runnable.
set -euo pipefail

# Only in remote (cloud) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
GAME=games/lichter-der-reise

# Blender as a Python module (bpy), used by blender/models.py to rebuild assets/models.bin.
# Lives outside the repository; reinstalled only when the requirements or this script change.
VENV="$HOME/.cache/ldr-blender-venv"
hashes="$VENV/.session-start.sha256"
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  python3 -m venv "$VENV"
  "$VENV/bin/python" -m pip install --quiet -r "$GAME/blender/requirements.txt"
  sha256sum "$PWD/.claude/hooks/session-start.sh" "$PWD/$GAME/blender/requirements.txt" > "$hashes" || rm -f "$hashes"
fi

# Every session: paths for the tests (software Vulkan for headless WebGPU, Blender python)
ICD=$(ls /opt/pw-browsers/chromium-*/chrome-linux*/vk_swiftshader_icd.json 2>/dev/null | head -n1 || true)
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  [ -n "$ICD" ] && echo "export VK_ICD_FILENAMES=\"$ICD\"" >> "$CLAUDE_ENV_FILE"
  [ -n "$ICD" ] && echo "export CHROME=\"$(dirname "$ICD")/chrome\"" >> "$CLAUDE_ENV_FILE"
  echo "export LDR_BLENDER_PYTHON=\"$VENV/bin/python\"" >> "$CLAUDE_ENV_FILE"
fi

# Every session: local web server for the end-to-end tests (WebGPU needs http://localhost)
if ! curl -s -o /dev/null --max-time 2 http://localhost:8777/; then
  (cd games && nohup python3 -m http.server 8777 >/dev/null 2>&1 &)
fi
