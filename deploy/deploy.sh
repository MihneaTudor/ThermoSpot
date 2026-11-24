#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/00-env.sh"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found, please make your own by copying the .env.example file." >&2
  exit 1
fi

source "$ENV_FILE"

for command in az docker kubectl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

: "${AZURE_SUBSCRIPTION_ID:?Set AZURE_SUBSCRIPTION_ID in deploy/00-env.sh}"
: "${RESOURCE_GROUP:?Set RESOURCE_GROUP in deploy/00-env.sh}"
: "${AKS_CLUSTER_NAME:?Set AKS_CLUSTER_NAME in deploy/00-env.sh}"
: "${ACR_NAME:?Set ACR_NAME in deploy/00-env.sh}"
: "${IMAGE_TAG:?Set IMAGE_TAG in deploy/00-env.sh}"
: "${K8S_NAMESPACE:?Set K8S_NAMESPACE in deploy/00-env.sh}"

: "${MYSQL_DATABASE:?Set MYSQL_DATABASE in .env}"
: "${MYSQL_USER:?Set MYSQL_USER in .env}"
: "${MYSQL_PASSWORD:?Set MYSQL_PASSWORD in .env}"
: "${MYSQL_ROOT_PASSWORD:?Set MYSQL_ROOT_PASSWORD in .env}"

DATABASE_IMAGE=$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)/thermospot-database:${IMAGE_TAG}
DB_MANIFEST="${SCRIPT_DIR}/db-k8s.yaml"
FRONT_MANIFEST="${SCRIPT_DIR}/front-k8s.yaml"
BACK_MANIFEST="${SCRIPT_DIR}/back-k8s.yaml"
DB_SECRET_NAME="thermospot-db-secret"

if [[ ! -f "$DB_MANIFEST" || ! -f "${REPO_ROOT}/database/Dockerfile" ]]; then
  echo "The Kubernetes DB_MANIFEST or database Dockerfile is missing." >&2
  exit 1
fi

az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --overwrite-existing

kubectl create namespace "$K8S_NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

DB_SECRET=$(kubectl get secret "$DB_SECRET_NAME" \
  --namespace "$K8S_NAMESPACE" --ignore-not-found -o name)
if [[ -z "$DB_SECRET" ]]; then
  SECRET_ENV_FILE="$(mktemp)"
  trap 'rm -f "$SECRET_ENV_FILE"' EXIT
  printf 'MYSQL_DATABASE=%s\nMYSQL_USER=%s\nMYSQL_PASSWORD=%s\nMYSQL_ROOT_PASSWORD=%s\n' \
    "$MYSQL_DATABASE" "$MYSQL_USER" "$MYSQL_PASSWORD" "$MYSQL_ROOT_PASSWORD" \
    > "$SECRET_ENV_FILE"
  kubectl create secret generic "$DB_SECRET_NAME" \
    --namespace "$K8S_NAMESPACE" \
    --from-env-file="$SECRET_ENV_FILE" \
    --dry-run=client -o yaml |
    kubectl apply -f -
  rm -f "$SECRET_ENV_FILE"
  trap - EXIT
fi

echo "$DATABASE_IMAGE"
az acr login --name "$ACR_NAME"
# once we have the other images, compile them all with the docker-compose file and push them to ACR that way
docker build \
  --tag "$DATABASE_IMAGE" \
  --file "${REPO_ROOT}/database/Dockerfile" \
  "${REPO_ROOT}/database"
docker push "$DATABASE_IMAGE"

sed "s|IMAGE_PLACEHOLDER|${DATABASE_IMAGE}|g" "$DB_MANIFEST" |
  kubectl apply --namespace "$K8S_NAMESPACE" -f -
kubectl rollout status statefulset/thermospot-database \
  --namespace "$K8S_NAMESPACE" \
  --timeout=300s