param(
    [Parameter(Mandatory = $false)]
    [string]$Namespace = "city-cleanup-staging"
)

$ErrorActionPreference = "Stop"

if ($Namespace -notmatch '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$') {
    throw "Invalid Kubernetes namespace: $Namespace"
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $Name"
    }
}

function Assert-Resource {
    param([string]$Type, [string]$Name)
    & kubectl get $Type $Name --namespace $Namespace --output name | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Missing $Type/$Name in namespace $Namespace"
    }
}

Assert-Command "kubectl"

$context = & kubectl config current-context
if ($LASTEXITCODE -ne 0 -or -not $context) {
    throw "No active Kubernetes context."
}

Write-Host "Read-only preflight against context '$context', namespace '$Namespace'."
& kubectl auth can-i get deployments --namespace $Namespace
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect deployments." }

Assert-Resource "deployment" "backend"
Assert-Resource "deployment" "frontend"
Assert-Resource "service" "backend"
Assert-Resource "service" "frontend"
Assert-Resource "ingress" "city-cleanup-ingress"
Assert-Resource "horizontalpodautoscaler" "backend-hpa"
Assert-Resource "horizontalpodautoscaler" "frontend-hpa"
Assert-Resource "secretproviderclass" "city-cleanup-key-vault"

& kubectl rollout status deployment/backend --namespace $Namespace --timeout=30s
if ($LASTEXITCODE -ne 0) { throw "Backend rollout is not healthy." }
& kubectl rollout status deployment/frontend --namespace $Namespace --timeout=30s
if ($LASTEXITCODE -ne 0) { throw "Frontend rollout is not healthy." }

& kubectl get --raw "/apis/metrics.k8s.io/v1beta1/nodes" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Kubernetes Metrics API is unavailable." }

& kubectl get crd certificates.cert-manager.io | Out-Null
if ($LASTEXITCODE -ne 0) { throw "cert-manager CRDs are unavailable." }
& kubectl get crd secretproviderclasses.secrets-store.csi.x-k8s.io | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Secrets Store CSI CRDs are unavailable." }

& kubectl get pods --namespace ingress-nginx --selector app.kubernetes.io/component=controller
if ($LASTEXITCODE -ne 0) { throw "ingress-nginx controller is unavailable." }

Write-Host "Kubernetes preflight passed. No cluster resources were changed."
