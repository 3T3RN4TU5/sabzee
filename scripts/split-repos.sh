#!/usr/bin/env bash
# Publish every app in apps/ as its own GitHub repository, keeping its git history.
#
# Requirements: git and the GitHub CLI (`gh auth login` done once).
# Usage:        ./scripts/split-repos.sh                 # all apps
#               ./scripts/split-repos.sh taskflow gitscope
#               OWNER=my-org ./scripts/split-repos.sh
set -euo pipefail

OWNER="${OWNER:-Jeevan2410}"
cd "$(git rev-parse --show-toplevel)"

# app folder -> repository name (the monorepo itself is already called "sabzee")
declare -A REPO=(
  [sabzee]="sabzee-store"
  [portfolio]="portfolio"
  [taskflow]="taskflow-kanban"
  [fintrack]="fintrack-dashboard"
  [resumeforge]="resumeforge"
  [gitscope]="gitscope"
)

apps=("$@")
[ ${#apps[@]} -eq 0 ] && apps=(sabzee portfolio taskflow fintrack resumeforge gitscope)

for app in "${apps[@]}"; do
  repo="${REPO[$app]:-$app}"
  branch="split/$app"
  echo "==> apps/$app  ->  github.com/$OWNER/$repo"

  git subtree split --prefix="apps/$app" -b "$branch" >/dev/null

  if ! gh repo view "$OWNER/$repo" >/dev/null 2>&1; then
    description="$(head -n 1 "apps/$app/README.md" | sed 's/^# *//')"
    gh repo create "$OWNER/$repo" --public --description "$description"
  fi

  git push "https://github.com/$OWNER/$repo.git" "$branch:main"
  git branch -D "$branch" >/dev/null
done

echo
echo "Done. Import each new repository at https://vercel.com/new to deploy it on its own."
