param(
    [string]$Namespace = "city-cleanup-staging",
    [switch]$Execute,
    [switch]$RequireScaleUp,
    [ValidateSet("backend-hpa", "frontend-hpa")]
    [string]$ScaleTarget = "backend-hpa"
)

$ErrorActionPreference = "Stop"
$requiredConfirmation = "RUN_STAGING_ROLLOUT_AND_ROLLBACK_DRILL"

if (-not $Execute -or $env:STAGING_DRILL_CONFIRM -ne $requiredConfirmation) {
    throw "Use -Execute and set STAGING_DRILL_CONFIRM=$requiredConfirmation."
}
if ($Namespace -notmatch "staging" -and $env:ALLOW_NON_STAGING_DRILL -ne "true") {
    throw "The drill is restricted to a namespace containing 'staging'."
}

& "$PSScriptRoot\kubernetes-preflight.ps1" -Namespace $Namespace
if ($LASTEXITCODE -ne 0) { throw "Kubernetes preflight failed." }

$drillId = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$deployments = @("backend", "frontend")
$before = @{}
foreach ($deployment in $deployments) {
    $before[$deployment] = & kubectl get deployment $deployment `
        --namespace $Namespace `
        --output jsonpath="{.metadata.annotations.deployment\.kubernetes\.io/revision}|{.spec.template.spec.containers[0].image}|{.spec.template.metadata.annotations.city-cleanup\.io/rollout-drill}"
    if ($LASTEXITCODE -ne 0) { throw "Unable to inspect deployment/$deployment." }
}

foreach ($deployment in $deployments) {
    $patch = @{
        spec = @{
            template = @{
                metadata = @{
                    annotations = @{
                        "city-cleanup.io/rollout-drill" = "$drillId"
                    }
                }
            }
        }
    } | ConvertTo-Json -Depth 6 -Compress
    & kubectl patch deployment $deployment `
        --namespace $Namespace `
        --type merge `
        --patch $patch
    if ($LASTEXITCODE -ne 0) { throw "Unable to start rollout for $deployment." }
    & kubectl rollout status deployment/$deployment --namespace $Namespace --timeout=5m
    if ($LASTEXITCODE -ne 0) { throw "Rollout failed for $deployment." }
}

foreach ($deployment in $deployments) {
    $after = & kubectl get deployment $deployment `
        --namespace $Namespace `
        --output jsonpath="{.metadata.annotations.deployment\.kubernetes\.io/revision}|{.spec.template.spec.containers[0].image}|{.spec.template.metadata.annotations.city-cleanup\.io/rollout-drill}"
    $afterParts = $after -split "\|", 3
    $afterRevision = [int]$afterParts[0]
    $beforeParts = $before[$deployment] -split "\|", 3
    $beforeRevision = [int]$beforeParts[0]
    $afterImage = $afterParts[1]
    $originalImage = $beforeParts[1]
    if ($afterRevision -le $beforeRevision) {
        throw "Drill did not create a new $deployment rollout revision."
    }
    if ($afterParts.Count -lt 3 -or $afterParts[2] -ne "$drillId") {
        throw "Drill annotation did not reach the $deployment pod template."
    }
    if ($afterImage -ne $originalImage) {
        throw "Drill unexpectedly changed the $deployment image."
    }
}

foreach ($deployment in $deployments) {
    & kubectl rollout undo deployment/$deployment --namespace $Namespace
    if ($LASTEXITCODE -ne 0) { throw "Rollback command failed for $deployment." }
    & kubectl rollout status deployment/$deployment --namespace $Namespace --timeout=5m
    if ($LASTEXITCODE -ne 0) { throw "Rollback did not stabilize for $deployment." }
    $rollbackState = & kubectl get deployment $deployment `
        --namespace $Namespace `
        --output jsonpath="{.spec.template.metadata.annotations.city-cleanup\.io/rollout-drill}|{.spec.template.spec.containers[0].image}"
    $rollbackParts = $rollbackState -split "\|", 2
    $beforeParts = $before[$deployment] -split "\|", 3
    $originalImage = $beforeParts[1]
    $originalAnnotation = if ($beforeParts.Count -gt 2) { $beforeParts[2] } else { "" }
    if (
        $rollbackParts[0] -ne $originalAnnotation -or
        $rollbackParts[1] -ne $originalImage
    ) {
        throw "Rollback verification failed for $deployment."
    }
}

foreach ($name in @("backend-hpa", "frontend-hpa")) {
    $hpa = & kubectl get horizontalpodautoscaler $name --namespace $Namespace --output json |
        ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Unable to inspect $name." }
    if (-not $hpa.status.currentMetrics) {
        throw "$name has no current metrics; Metrics Server or HPA collection is not ready."
    }
    if (
        $RequireScaleUp -and
        $name -eq $ScaleTarget -and
        $hpa.status.currentReplicas -le $hpa.spec.minReplicas
    ) {
        throw "$name did not scale above its minimum replica count during the load window."
    }
}

Write-Host "Staging rollout, rollback, and HPA metrics drill passed (drill $drillId)."
