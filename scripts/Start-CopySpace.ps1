$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Standalone = Join-Path $ProjectRoot ".next\standalone"
$Entry = Join-Path $Standalone "server.js"
$EnvFile = Join-Path $ProjectRoot ".env.local"
$GatewayScript = Join-Path $PSScriptRoot "CopySpace-Gateway.py"
$HostAddress = "192.168.50.72"
$FrontendHost = "127.0.0.1"
$Port = 3925
$GatewayPort = 3923
$BackendOrigin = "http://127.0.0.1:3924"
$Python = "C:\Program Files\Python312\python.exe"

if (-not (Test-Path $Entry)) { throw "Standalone server is missing. Run npm run build first." }
if (-not (Test-Path $EnvFile)) { throw ".env.local is missing." }
if (-not (Test-Path $GatewayScript)) { throw "CopySpace gateway script is missing." }
if (-not (Test-Path $Python)) { throw "Python 3.12 was not found at the configured path." }

foreach ($Line in Get-Content -LiteralPath $EnvFile) {
  if ($Line -match '^\s*([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2], "Process")
  }
}
if ([string]::IsNullOrWhiteSpace($env:COOKIE_SECRET) -or $env:COOKIE_SECRET.Length -lt 32) {
  throw "COOKIE_SECRET is missing or too short."
}
if (-not $env:COPYPARTY_ALLOWED_ORIGINS.Split(",").Contains($BackendOrigin)) {
  throw "COPYPARTY_ALLOWED_ORIGINS must include $BackendOrigin."
}
if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $HostAddress -ErrorAction SilentlyContinue)) {
  throw "The expected LAN address $HostAddress is not assigned to this host."
}

# Startup-folder scripts are not guaranteed to run in a strict order.
# Wait for Copyparty's loopback API before publishing the CopySpace entry point.
$BackendReady = $false
for ($Attempt = 0; $Attempt -lt 60; $Attempt++) {
  try {
    $BackendResponse = Invoke-WebRequest -Uri "$BackendOrigin/" -UseBasicParsing -TimeoutSec 2
    if ($BackendResponse.StatusCode -eq 200) {
      $BackendReady = $true
      break
    }
  } catch {}
  Start-Sleep -Seconds 1
}
if (-not $BackendReady) {
  throw "Copyparty backend did not become ready at $BackendOrigin within 60 seconds."
}

$StaticSource = Join-Path $ProjectRoot ".next\static"
$StandaloneNext = Join-Path $Standalone ".next"
if (Test-Path $StaticSource) {
  Copy-Item -LiteralPath $StaticSource -Destination $StandaloneNext -Recurse -Force
}
$PublicSource = Join-Path $ProjectRoot "public"
if (Test-Path $PublicSource) {
  Copy-Item -LiteralPath $PublicSource -Destination $Standalone -Recurse -Force
}

$LogDirectory = Join-Path $env:LOCALAPPDATA "CopySpace\logs"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
$FrontendOut = Join-Path $LogDirectory "frontend.stdout.log"
$FrontendErr = Join-Path $LogDirectory "frontend.stderr.log"
$GatewayOut = Join-Path $LogDirectory "gateway.stdout.log"
$GatewayErr = Join-Path $LogDirectory "gateway.stderr.log"

$ExistingFrontend = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and $_.CommandLine -like "*$Entry*"
} | Select-Object -First 1

if ($ExistingFrontend) {
  $FrontendListener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $ExistingFrontend.ProcessId }
  if ($FrontendListener -and $FrontendListener.LocalAddress -ne $FrontendHost) {
    Stop-Process -Id $ExistingFrontend.ProcessId -Force
    $ExistingFrontend = $null
    Write-Output "Restarted frontend because it was not loopback-only."
  }
}

if (-not $ExistingFrontend) {
  $env:PORT = "$Port"
  $env:HOSTNAME = $FrontendHost
  $Node = (Get-Command node.exe -ErrorAction Stop).Source
  $FrontendProcess = Start-Process -FilePath $Node -ArgumentList @($Entry) -WorkingDirectory $Standalone -PassThru -WindowStyle Hidden -RedirectStandardOutput $FrontendOut -RedirectStandardError $FrontendErr

  $FrontendReady = $false
  for ($Attempt = 0; $Attempt -lt 30; $Attempt++) {
    Start-Sleep -Milliseconds 500
    if (-not (Get-CimInstance Win32_Process -Filter "ProcessId=$($FrontendProcess.Id)" -ErrorAction SilentlyContinue)) { break }
    try {
      $Response = Invoke-WebRequest -Uri "http://$($FrontendHost):$Port/app" -UseBasicParsing -TimeoutSec 3
      if ($Response.StatusCode -eq 200) { $FrontendReady = $true; break }
    } catch {}
  }
  if (-not $FrontendReady) {
    if (Test-Path $FrontendErr) { Get-Content $FrontendErr -Tail 40 }
    throw "CopySpace frontend did not become ready on loopback port $Port."
  }
  Write-Output "FRONTEND_STARTED_PID=$($FrontendProcess.Id)"
} else {
  Write-Output "FRONTEND_ALREADY_RUNNING_PID=$($ExistingFrontend.ProcessId)"
}

$GatewayProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "python.exe" -and $_.CommandLine -like "*$GatewayScript*"
})
if ($GatewayProcesses.Count -eq 0) {
  $Listener = Get-NetTCPConnection -State Listen -LocalAddress $HostAddress -LocalPort $GatewayPort -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($Listener) {
    throw "Port $GatewayPort is already occupied by PID $($Listener.OwningProcess). Stop the old listener before starting CopySpace gateway."
  }

  $env:COPYSPACE_GATEWAY_LISTEN_HOST = $HostAddress
  $env:COPYSPACE_GATEWAY_LISTEN_PORT = "$GatewayPort"
  $env:COPYSPACE_GATEWAY_TARGET_HOST = $FrontendHost
  $env:COPYSPACE_GATEWAY_TARGET_PORT = "$Port"
  $GatewayProcess = Start-Process -FilePath $Python -ArgumentList @($GatewayScript) -WorkingDirectory $ProjectRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput $GatewayOut -RedirectStandardError $GatewayErr

  $GatewayReady = $false
  for ($Attempt = 0; $Attempt -lt 20; $Attempt++) {
    Start-Sleep -Milliseconds 500
    if (-not (Get-CimInstance Win32_Process -Filter "ProcessId=$($GatewayProcess.Id)" -ErrorAction SilentlyContinue)) { break }
    try {
      $Response = Invoke-WebRequest -Uri "http://$($HostAddress):$GatewayPort/app" -UseBasicParsing -TimeoutSec 3
      if ($Response.StatusCode -eq 200) { $GatewayReady = $true; break }
    } catch {}
  }
  if (-not $GatewayReady) {
    Stop-Process -Id $GatewayProcess.Id -Force -ErrorAction SilentlyContinue
    if (Test-Path $GatewayErr) { Get-Content $GatewayErr -Tail 40 }
    throw "CopySpace gateway did not become ready on port $GatewayPort."
  }
  Write-Output "GATEWAY_STARTED_PID=$($GatewayProcess.Id)"
} else {
  Write-Output "GATEWAY_ALREADY_RUNNING_PID=$($GatewayProcesses.ProcessId -join ', ')"
}

Write-Output "ENTRY_URL=http://$($HostAddress):$GatewayPort/"
Write-Output "DIRECT_FRONTEND_URL=http://$($FrontendHost):$Port/ (host only)"
Write-Output "BACKEND_URL=$BackendOrigin (loopback only)"
Write-Output "LOG_DIR=$LogDirectory"
