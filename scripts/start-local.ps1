# Starts the Next.js app and the optional local ML service in separate
# PowerShell windows, then reports their health. Ollama is not started
# automatically; the AI panel falls back cleanly when it is unavailable.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host 'Starting Resume Studio...' -ForegroundColor Cyan
$next = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
  '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command',
  "Set-Location -LiteralPath '$root'; npm run dev"
) -PassThru

$ml = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
  '-NoExit', '-ExecutionPolicy', 'Bypass', '-File',
  (Join-Path $root 'services/ml/run-ml.ps1')
) -PassThru

Write-Host "Next.js window PID: $($next.Id)" -ForegroundColor DarkGray
Write-Host "ML service window PID: $($ml.Id)" -ForegroundColor DarkGray

$mlReady = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
    if ($health.status) { $mlReady = $true; break }
  } catch {
    Start-Sleep -Milliseconds 400
  }
}

try {
  Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null
  $ollama = 'online'
} catch {
  $ollama = 'offline (bullet polish will use the labeled rule-based fallback)'
}

Write-Host ''
Write-Host 'Ready:' -ForegroundColor Green
Write-Host '  App:  http://127.0.0.1:3000'
Write-Host "  ML:   $(if ($mlReady) { 'http://127.0.0.1:8000 (online)' } else { 'not ready yet — check the ML window' })"
Write-Host "  Ollama: $ollama"
Write-Host ''
Write-Host 'Close the two PowerShell windows to stop the services.'
