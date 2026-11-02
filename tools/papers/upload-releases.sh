#!/usr/bin/env bash
# Uploads the staged past papers (STAGE/<subject>/, made by build-manifest.mjs) as assets on
# one GitHub release per subject, tag papers-<subject>, which is where papers.html links to.
# Creates a release that does not exist yet and skips files that are already uploaded, so it
# can be run again after an interruption. Needs the GitHub CLI (gh), signed in.
#   upload-releases.sh                  all four subjects
#   upload-releases.sh physics maths    just these
set -euo pipefail

REPO=mirakludbA08/IALqBank
STAGE=${STAGE:-D:/IALqBank_D/_release}
BATCH=40   # files per gh call, which keeps the command line short on Windows

[ $# -eq 0 ] && set -- physics chemistry biology maths

for s in "$@"; do
  tag="papers-$s"
  label="$(printf '%s' "${s:0:1}" | tr '[:lower:]' '[:upper:]')${s:1}"
  if ! gh release view "$tag" -R "$REPO" >/dev/null 2>&1; then
    gh release create "$tag" -R "$REPO" --target topic-bank --latest=false \
      --title "$label past papers" \
      --notes "Pearson Edexcel International AS and A Level $label question papers and mark schemes, linked from the IALqBank past papers page (papers.html?s=$s). Pearson Edexcel material, shared for study only."
  fi

  mapfile -t todo < <(comm -23 \
    <(ls "$STAGE/$s" | sort) \
    <(gh release view "$tag" -R "$REPO" --json assets --jq '.assets[].name' | sort))
  echo "$s: ${#todo[@]} files to upload"

  for ((i = 0; i < ${#todo[@]}; i += BATCH)); do
    batch=("${todo[@]:i:BATCH}")
    gh release upload "$tag" -R "$REPO" "${batch[@]/#/$STAGE/$s/}"
    echo "$s: $((i + ${#batch[@]})) of ${#todo[@]} uploaded"
  done
done
