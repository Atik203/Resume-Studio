# Resume Studio - Local ML Backend Launcher (127.0.0.1:8000)
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location -Path $PSScriptRoot
Write-Host "Starting Resume Studio Offline ML Backend on http://127.0.0.1:8000..." -ForegroundColor Green
python main.py
