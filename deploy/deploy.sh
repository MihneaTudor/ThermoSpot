#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/00-env.sh"

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


DATABASE_IMAGE=$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)/thermospot-database:${IMAGE_TAG}
MANIFEST="${SCRIPT_DIR}/k8s.yaml"
DB_SECRET_NAME="thermospot-db-secret"

if [[ ! -f "$MANIFEST" || ! -f "${REPO_ROOT}/database/Dockerfile" ]]; then
  echo "The Kubernetes manifest or database Dockerfile is missing." >&2
  exit 1
fi

az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --overwrite-existing

kubectl create namespace "$K8S_NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

if ! kubectl get secret "$DB_SECRET_NAME" --namespace "$K8S_NAMESPACE" >/dev/null 2>&1; then
  echo "Required Kubernetes Secret '$DB_SECRET_NAME' was not found in namespace '$K8S_NAMESPACE'." >&2
  echo "Create it before deploying, supplying real credentials without committing them:" >&2
  echo "  kubectl create secret generic $DB_SECRET_NAME -n $K8S_NAMESPACE \\"
  echo "    --from-literal=MYSQL_DATABASE=ThermoDB \\"
  echo "    --from-literal=MYSQL_USER=<database-user> \\"
  echo "    --from-literal=MYSQL_PASSWORD=<database-password> \\"
  echo "    --from-literal=MYSQL_ROOT_PASSWORD=<root-password>"
EOF
  exit 1
fi

echo "$DATABASE_IMAGE"
az acr login --name "$ACR_NAME"
# once we have the other images, compile them all with the docker-compose file and push them to ACR that way
docker build \
  --tag "$DATABASE_IMAGE" \
  --file "${REPO_ROOT}/database/Dockerfile" \
  "${REPO_ROOT}/database"
docker push "$DATABASE_IMAGE"

sed "s|IMAGE_PLACEHOLDER|${DATABASE_IMAGE}|g" "$MANIFEST" |
  kubectl apply --namespace "$K8S_NAMESPACE" -f -
kubectl rollout status statefulset/thermospot-database \
  --namespace "$K8S_NAMESPACE" \
  --timeout=300s