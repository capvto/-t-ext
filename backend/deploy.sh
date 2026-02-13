#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: ./deploy.sh <user@host> [target_dir]

Example:
  ./deploy.sh root@203.0.113.10
  ./deploy.sh deploy@my-vps /srv/text-markdown

Optional env vars:
  COPY_ENV=1            Copy local .env files to remote target (default: 0)
  FRONTEND_PORT=3100    Host port for frontend (default: 3100)
  PUBLIC_BASE_URL=...   Public base URL (default: https://web.textmarkdown.app)
  CORS_ORIGINS=...      Override CORS origins CSV (default: PUBLIC_BASE_URL)
  POSTGRES_DB=...       DB name for first deploy bootstrap (default: text_markdown)
  POSTGRES_USER=...     DB user for first deploy bootstrap (default: text_markdown)
  POSTGRES_PASSWORD=... DB password for first deploy bootstrap (default: random)
  SERVICE_NAME=api      Service name to show logs for (default: api)
  DOCKER_COMPOSE_CMD    Compose command on remote (default: auto-detect)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

REMOTE="$1"
TARGET_DIR="${2:-/srv/text-markdown}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COPY_ENV="${COPY_ENV:-0}"
SERVICE_NAME="${SERVICE_NAME:-api}"
FRONTEND_PORT="${FRONTEND_PORT:-3100}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://web.textmarkdown.app}"
CORS_ORIGINS="${CORS_ORIGINS:-}"
POSTGRES_DB="${POSTGRES_DB:-text_markdown}"
POSTGRES_USER="${POSTGRES_USER:-text_markdown}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
DOCKER_COMPOSE_CMD="${DOCKER_COMPOSE_CMD:-auto}"
COMPOSE_FILE="docker-compose.vps.yml"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

require_cmd ssh
require_cmd rsync
require_cmd scp

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
    return
  fi

  od -An -N24 -tx1 /dev/urandom | tr -d ' \n'
}

shell_single_quote() {
  local value="$1"
  printf "'%s'" "${value//\'/\'\"\'\"\'}"
}

PUBLIC_BASE_URL_EFFECTIVE="$PUBLIC_BASE_URL"
CORS_ORIGINS_EFFECTIVE="${CORS_ORIGINS:-$PUBLIC_BASE_URL_EFFECTIVE}"
BOOTSTRAP_POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(generate_password)}"

Q_FRONTEND_PORT="$(shell_single_quote "$FRONTEND_PORT")"
Q_PUBLIC_BASE_URL="$(shell_single_quote "$PUBLIC_BASE_URL_EFFECTIVE")"
Q_CORS_ORIGINS="$(shell_single_quote "$CORS_ORIGINS_EFFECTIVE")"

run_compose() {
  local compose_args="$1"

  ssh "$REMOTE" "cd '$TARGET_DIR' && FRONTEND_PORT=$Q_FRONTEND_PORT PUBLIC_BASE_URL=$Q_PUBLIC_BASE_URL CORS_ORIGINS=$Q_CORS_ORIGINS $COMPOSE_BIN -f '$COMPOSE_FILE' $compose_args"
}

echo "Starting deployment to $REMOTE:$TARGET_DIR"
echo "Resolved PUBLIC_BASE_URL=$PUBLIC_BASE_URL_EFFECTIVE"
echo "Resolved CORS_ORIGINS=$CORS_ORIGINS_EFFECTIVE"

if [[ "$DOCKER_COMPOSE_CMD" == "auto" ]]; then
  COMPOSE_BIN="$(
    ssh "$REMOTE" "
      set -eu
      docker_cmd='docker'

      if ! docker info >/dev/null 2>&1; then
        if command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
          docker_cmd='sudo docker'
        else
          echo '__DOCKER_MISSING__'
          exit 0
        fi
      fi

      if \$docker_cmd compose version >/dev/null 2>&1; then
        echo \"\$docker_cmd compose\"
        exit 0
      fi

      if command -v docker-compose >/dev/null 2>&1; then
        if docker-compose version >/dev/null 2>&1; then
          echo 'docker-compose'
          exit 0
        fi
        if command -v sudo >/dev/null 2>&1 && sudo -n docker-compose version >/dev/null 2>&1; then
          echo 'sudo docker-compose'
          exit 0
        fi
      fi

      echo '__COMPOSE_MISSING__'
    " | tr -d '\r'
  )"

  if [[ "$COMPOSE_BIN" == "__DOCKER_MISSING__" ]]; then
    echo "Error: docker is not available for user on remote host ($REMOTE)." >&2
    echo "Add the user to docker group or enable passwordless sudo for docker." >&2
    exit 1
  fi

  if [[ "$COMPOSE_BIN" == "__COMPOSE_MISSING__" || -z "$COMPOSE_BIN" ]]; then
    echo "Error: docker compose not found on remote host ($REMOTE)." >&2
    exit 1
  fi
else
  COMPOSE_BIN="$DOCKER_COMPOSE_CMD"
fi

echo "Using compose command on remote: $COMPOSE_BIN"

echo "Creating remote directory..."
ssh "$REMOTE" "mkdir -p '$TARGET_DIR'"

echo "Syncing full project (frontend + backend)..."
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'backend/node_modules' \
  --exclude 'dist' \
  --exclude 'backend/dist' \
  --exclude 'coverage' \
  --exclude 'backend/coverage' \
  --exclude 'release' \
  --exclude '*.tsbuildinfo' \
  --exclude '.env' \
  --exclude 'backend/.env' \
  --exclude 'npm-debug.log' \
  "$REPO_DIR/" "$REMOTE:$TARGET_DIR/"

if [[ "$COPY_ENV" == "1" ]]; then
  if [[ -f "$REPO_DIR/.env" ]]; then
    echo "Copying root .env to remote target..."
    scp "$REPO_DIR/.env" "$REMOTE:$TARGET_DIR/.env"
  else
    echo "Root .env not found at $REPO_DIR/.env"
  fi

  if [[ -f "$SCRIPT_DIR/.env" ]]; then
    echo "Copying backend/.env to remote target..."
    scp "$SCRIPT_DIR/.env" "$REMOTE:$TARGET_DIR/backend/.env"
  else
    echo "COPY_ENV=1 set, but local .env not found at $SCRIPT_DIR/.env"
  fi
else
  echo "Skipping .env copy (set COPY_ENV=1 to enable)."
fi

echo "Ensuring remote .env contains required variables..."
ssh "$REMOTE" \
  "TARGET_DIR='$TARGET_DIR' POSTGRES_DB='$POSTGRES_DB' POSTGRES_USER='$POSTGRES_USER' POSTGRES_PASSWORD='$BOOTSTRAP_POSTGRES_PASSWORD' PUBLIC_BASE_URL='$PUBLIC_BASE_URL_EFFECTIVE' CORS_ORIGINS='$CORS_ORIGINS_EFFECTIVE' FRONTEND_PORT='$FRONTEND_PORT' sh -s" <<'EOF'
set -eu

env_file="$TARGET_DIR/.env"

if [ ! -f "$env_file" ]; then
  umask 077
  cat >"$env_file" <<EOT
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
PUBLIC_BASE_URL=$PUBLIC_BASE_URL
CORS_ORIGINS=$CORS_ORIGINS
FRONTEND_PORT=$FRONTEND_PORT
EOT
  chmod 600 "$env_file"
  echo "Created $env_file"
fi

append_if_missing() {
  key="$1"
  value="$2"
  if ! grep -q "^${key}=" "$env_file"; then
    printf "%s=%s\n" "$key" "$value" >>"$env_file"
    echo "Added missing $key to $env_file"
  fi
}

append_if_empty() {
  key="$1"
  value="$2"
  if grep -q "^${key}=$" "$env_file"; then
    printf "%s=%s\n" "$key" "$value" >>"$env_file"
    echo "Set empty $key in $env_file"
  fi
}

append_if_missing POSTGRES_DB "$POSTGRES_DB"
append_if_missing POSTGRES_USER "$POSTGRES_USER"
append_if_missing POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
append_if_missing PUBLIC_BASE_URL "$PUBLIC_BASE_URL"
append_if_missing CORS_ORIGINS "$CORS_ORIGINS"
append_if_missing FRONTEND_PORT "$FRONTEND_PORT"
append_if_empty POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
append_if_empty PUBLIC_BASE_URL "$PUBLIC_BASE_URL"
append_if_empty CORS_ORIGINS "$CORS_ORIGINS"
append_if_empty FRONTEND_PORT "$FRONTEND_PORT"
EOF

echo "Building and starting containers..."
run_compose "down"
if ! run_compose "up -d --build --remove-orphans"; then
  echo "Compose up failed. Showing recent logs (api/postgres/frontend)..."
  run_compose "ps || true"
  run_compose "logs --tail=150 api postgres frontend || true"
  exit 1
fi

echo "Container status:"
run_compose "ps"

echo "Recent logs for service '$SERVICE_NAME':"
run_compose "logs --tail=80 '$SERVICE_NAME'"

echo "Deployment completed."
echo "Frontend URL: $PUBLIC_BASE_URL_EFFECTIVE"
echo "Backend is internal-only (reachable via frontend /api proxy)."
echo "Follow logs with:"
echo "ssh $REMOTE \"cd '$TARGET_DIR' && FRONTEND_PORT='$FRONTEND_PORT' PUBLIC_BASE_URL='$PUBLIC_BASE_URL_EFFECTIVE' CORS_ORIGINS='$CORS_ORIGINS_EFFECTIVE' $COMPOSE_BIN -f '$COMPOSE_FILE' logs -f '$SERVICE_NAME'\""
