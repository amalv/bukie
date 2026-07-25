param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("upload", "status", "reconcile")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

function Import-DotEnvFile([string]$path) {
  if (-not (Test-Path $path)) {
    return
  }

  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Length -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()

    if ([string]::IsNullOrWhiteSpace($name)) {
      return
    }

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, "Process"))) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Get-RequiredEnv([string]$name) {
  $value = [Environment]::GetEnvironmentVariable($name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($name, "User")
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($name, "Machine")
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "$name is required."
  }
  return $value.Trim()
}

Import-DotEnvFile (Join-Path (Get-Location) ".env")

if (-not (Get-Command bunx -ErrorAction SilentlyContinue)) {
  throw "bunx is required to run Wrangler for the R2 sync workflow."
}

$bucket = Get-RequiredEnv "R2_BUCKET"
$wranglerToken = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "Process")
$sourceDir = Join-Path (Get-Location) "public/covers"
$stateDir = Join-Path (Get-Location) ".cache"
$stateBucket = $bucket -replace '[^a-zA-Z0-9.-]', '_'
$uploadedStatePath = Join-Path $stateDir "r2-$stateBucket-uploaded.txt"
$failedStatePath = Join-Path $stateDir "r2-$stateBucket-failed.txt"

if ([string]::IsNullOrWhiteSpace($wranglerToken)) {
  try {
    bunx wrangler whoami | Out-Null
  } catch {
    throw "Wrangler is not authenticated. Run 'bunx wrangler login' once, or set CLOUDFLARE_API_TOKEN in .env."
  }
}

function Get-ContentType([string]$fullPath) {
  switch ([System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()) {
    ".avif" { return "image/avif" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".png" { return "image/png" }
    ".svg" { return "image/svg+xml" }
    ".webp" { return "image/webp" }
    default { return "application/octet-stream" }
  }
}

function Ensure-StateDir() {
  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
}

function Read-StateSet([string]$path) {
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  if (-not (Test-Path $path)) {
    return $set
  }

  Get-Content $path | ForEach-Object {
    $value = $_.Trim()
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      $set.Add($value) | Out-Null
    }
  }

  return $set
}

function Append-State([string]$path, [string]$value) {
  Ensure-StateDir
  Add-Content -Path $path -Value $value
}

function Remove-StateValue([string]$path, [string]$value) {
  if (-not (Test-Path $path)) {
    return
  }

  $remaining = Get-Content $path | Where-Object { $_.Trim() -ne $value }
  Set-Content -Path $path -Value $remaining
}

function Invoke-WranglerUpload([string]$bucketName, [System.IO.FileInfo]$fileInfo) {
  $key = "covers/$($fileInfo.Name)"
  $contentType = Get-ContentType $fileInfo.FullName

  $output = bunx wrangler r2 object put "$bucketName/$key" `
    --file="$($fileInfo.FullName)" `
    --content-type="$contentType" `
    --cache-control="public, max-age=31536000, immutable" `
    --remote `
    --env-file=".env" 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    $output | Out-Host
  }

  return $exitCode
}

function Test-WranglerObjectExists([string]$bucketName, [string]$key) {
  $command = 'bunx wrangler r2 object get "{0}/{1}" --pipe --remote --env-file=".env" >nul 2>nul' -f $bucketName, $key
  cmd /c $command | Out-Null
  return $LASTEXITCODE -eq 0
}

$files = Get-ChildItem -Path $sourceDir -File | Where-Object {
  $_.Name -ne "placeholder.svg" -and $_.Name -notlike "*.DS_Store"
}

$uploaded = Read-StateSet $uploadedStatePath
$failed = Read-StateSet $failedStatePath
$uploaded = if ($null -eq $uploaded) {
  New-Object 'System.Collections.Generic.HashSet[string]'
} else {
  $uploaded
}
$failed = if ($null -eq $failed) {
  New-Object 'System.Collections.Generic.HashSet[string]'
} else {
  $failed
}
$total = $files.Count

if ($Mode -eq "status") {
  $remaining = @($files | Where-Object { -not $uploaded.Contains($_.Name) })
  Write-Host "[wrangler:r2] Status for bucket '$bucket'"
  Write-Host "  total local covers : $total"
  Write-Host "  uploaded recorded  : $($uploaded.Count)"
  Write-Host "  remaining locally  : $($remaining.Count)"
  Write-Host "  failed recorded    : $($failed.Count)"

  if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed files:"
    $failed | Sort-Object | ForEach-Object { Write-Host "  $_" }
  }

  exit 0
}

if ($Mode -eq "reconcile") {
  Ensure-StateDir
  if (Test-Path $uploadedStatePath) {
    Remove-Item $uploadedStatePath -Force
  }
  if (Test-Path $failedStatePath) {
    Remove-Item $failedStatePath -Force
  }

  $remoteUploaded = 0
  $index = 0
  foreach ($file in $files) {
    $index += 1
    if ($index -eq 1 -or $index % 25 -eq 0 -or $index -eq $total) {
      Write-Host "[wrangler:r2] Reconcile progress: $index / $total"
    }

    $key = "covers/$($file.Name)"
    if (Test-WranglerObjectExists $bucket $key) {
      Append-State $uploadedStatePath $file.Name
      $remoteUploaded += 1
    }
  }

  $remainingCount = $total - $remoteUploaded
  Write-Host "[wrangler:r2] Reconciled status from remote bucket '$bucket'"
  Write-Host "  total local covers : $total"
  Write-Host "  uploaded remotely  : $remoteUploaded"
  Write-Host "  remaining locally  : $remainingCount"
  exit 0
}

$pending = @($files | Where-Object { -not $uploaded.Contains($_.Name) })

Write-Host "[wrangler:r2] Uploading $($pending.Count) remaining cover file(s) to bucket '$bucket'..."

$processed = 0
foreach ($file in $pending) {
  $attempt = 1
  $maxAttempts = 3
  $uploadedThisRound = $false

  while ($attempt -le $maxAttempts -and -not $uploadedThisRound) {
    $exitCode = Invoke-WranglerUpload $bucket $file

    if ($exitCode -eq 0) {
      Append-State $uploadedStatePath $file.Name
      Remove-StateValue $failedStatePath $file.Name
      $uploadedThisRound = $true
      $processed += 1
      if ($processed -eq 1 -or $processed % 25 -eq 0 -or $processed -eq $pending.Count) {
        Write-Host "[wrangler:r2] Upload progress: $processed / $($pending.Count)"
      }
      break
    }

    if ($attempt -lt $maxAttempts) {
      $delay = 2 * $attempt
      Write-Host "[wrangler:r2] Retry $attempt for $($file.Name) after ${delay}s..."
      Start-Sleep -Seconds $delay
    }

    $attempt += 1
  }

  if (-not $uploadedThisRound) {
    Append-State $failedStatePath $file.Name
    Write-Host "[wrangler:r2] Giving up on $($file.Name) after $maxAttempts attempts."
    exit 1
  }
}

Write-Host "[wrangler:r2] Upload complete."
