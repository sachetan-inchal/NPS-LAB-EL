#!/usr/bin/env bash
set -euo pipefail

ZITI_HOME="${ZITI_HOME:-/persistent}"
ZITI_BIN_DIR="${ZITI_BIN_DIR:-/var/openziti/ziti-bin}"
ZITI_CTRL_EDGE_ADVERTISED_ADDRESS="${ZITI_CTRL_EDGE_ADVERTISED_ADDRESS:-ziti-edge-controller}"
ZITI_CTRL_EDGE_ADVERTISED_PORT="${ZITI_CTRL_EDGE_ADVERTISED_PORT:-1280}"

until [ -f "${ZITI_HOME}/ziti.env" ]; do
  echo "waiting for ${ZITI_HOME}/ziti.env..."
  sleep 1
done

# shellcheck disable=SC1091
set +u
. "${ZITI_HOME}/ziti.env"
set -u

ZITI="${ZITI_BIN_DIR}/ziti"
CTRL="${ZITI_CTRL_EDGE_ADVERTISED_ADDRESS}:${ZITI_CTRL_EDGE_ADVERTISED_PORT}"

echo "waiting for OpenZiti controller at ${CTRL}..."
until "${ZITI}" edge login "${CTRL}" -u "${ZITI_USER}" -p "${ZITI_PWD}" -y >/dev/null 2>&1; do
  sleep 2
done

mkdir -p "${ZITI_HOME}/zton-identities"

exists() {
  local kind="$1"
  local name="$2"
  "${ZITI}" edge list "${kind}" "name = \"${name}\"" --csv 2>/dev/null | awk -F, -v n="${name}" 'NR > 1 && $2 == n { found = 1 } END { exit found ? 0 : 1 }'
}

run_ziti_write() {
  local attempts=30
  until "$@"; do
    attempts=$((attempts - 1))
    if [ "${attempts}" -le 0 ]; then
      echo "failed after retries: $*" >&2
      return 1
    fi
    echo "controller not ready for write yet; retrying (${attempts} left): $*"
    sleep 2
  done
}

ensure_identity() {
  local name="$1"
  local roles="$2"
  if exists identities "${name}"; then
    echo "identity ${name} exists"
  else
    echo "creating identity ${name}"
    run_ziti_write "${ZITI}" edge create identity "${name}" \
      --role-attributes "${roles}" \
      --jwt-output-file "${ZITI_HOME}/zton-identities/${name}.jwt"
  fi
}

ensure_config() {
  local name="$1"
  local type="$2"
  local json="$3"
  if exists configs "${name}"; then
    echo "config ${name} exists"
  else
    echo "creating config ${name}"
    run_ziti_write "${ZITI}" edge create config "${name}" "${type}" "${json}"
  fi
}

ensure_service() {
  local name="$1"
  local configs="$2"
  local roles="$3"
  if exists services "${name}"; then
    echo "service ${name} exists"
  else
    echo "creating service ${name}"
    run_ziti_write "${ZITI}" edge create service "${name}" --configs "${configs}" --role-attributes "${roles}"
  fi
}

ensure_service_policy() {
  local name="$1"
  local type="$2"
  local identity_roles="$3"
  local service_roles="$4"
  if exists service-policies "${name}"; then
    echo "service policy ${name} exists"
  else
    echo "creating service policy ${name}"
    run_ziti_write "${ZITI}" edge create service-policy "${name}" "${type}" \
      --identity-roles "${identity_roles}" \
      --service-roles "${service_roles}"
  fi
}

ensure_edge_router_policy() {
  local name="$1"
  if exists edge-router-policies "${name}"; then
    echo "edge router policy ${name} exists"
  else
    echo "creating edge router policy ${name}"
    run_ziti_write "${ZITI}" edge create edge-router-policy "${name}" \
      --edge-router-roles "#all" \
      --identity-roles "#all"
  fi
}

ensure_service_edge_router_policy() {
  local name="$1"
  if exists service-edge-router-policies "${name}"; then
    echo "service edge router policy ${name} exists"
  else
    echo "creating service edge router policy ${name}"
    run_ziti_write "${ZITI}" edge create service-edge-router-policy "${name}" \
      --edge-router-roles "#all" \
      --service-roles "#all"
  fi
}

ensure_identity "zton-hub-host" "zton-hosts"
ensure_identity "zton-laptop-b-client" "zton-authorized,zton-clients"
ensure_identity "zton-phone-b-client" "zton-authorized,zton-clients"
ensure_identity "zton-phone-a-client" "zton-authorized,zton-blocked,zton-clients"

ensure_config "zton-udp-intercept.v1" "intercept.v1" '{"protocols":["udp"],"addresses":["zton-hub.openziti"],"portRanges":[{"low":9999,"high":9999}]}'
ensure_config "zton-udp-host.v1" "host.v1" '{"protocol":"udp","address":"127.0.0.1","port":9999}'
ensure_service "zton-udp-9999" "zton-udp-intercept.v1,zton-udp-host.v1" "zton-services,zton-udp"

ensure_config "zton-dashboard-intercept.v1" "intercept.v1" '{"protocols":["tcp"],"addresses":["zton-dashboard.openziti"],"portRanges":[{"low":8080,"high":8080}]}'
ensure_config "zton-dashboard-host.v1" "host.v1" '{"protocol":"tcp","address":"127.0.0.1","port":8080}'
ensure_service "zton-dashboard-8080" "zton-dashboard-intercept.v1,zton-dashboard-host.v1" "zton-services,zton-dashboard"

ensure_service_policy "zton-hosts-bind-services" "Bind" "#zton-hosts" "#zton-services"
ensure_service_policy "zton-authorized-dial-services" "Dial" "#zton-authorized" "#zton-services"
ensure_edge_router_policy "zton-all-identities-all-routers"
ensure_service_edge_router_policy "zton-all-services-all-routers"

echo "OpenZiti ZTON layer provisioned."
echo "Identity JWTs are in ${ZITI_HOME}/zton-identities."
