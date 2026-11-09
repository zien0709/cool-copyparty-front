$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Standalone = Join-Path $ProjectRoot ".next\standalone"
$Entry = Join-Path $Standalone "server.js"
$EnvFile = Join-Path $ProjectRoot ".env.local"
$HostAddress = "192.168.50.72"
$Port = 3925

if (-not (Test-Path $Entry)) {
  throw "Standalone server is missing. Run npm run build first."
}
if (-not (Test-Path $EnvFile)) {
  throw ".env.local is missing."
}

foreach ($Line in Get-Content -LiteralPath $EnvFile) {
  if ($Line -match '^\s*([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2], "Process")
  }
}
if ([string]::IsNullOrWhiteSpace($env:COOKIE_SECRET) -or $env:COOKIE_SECRET.Length -lt 32) {
  throw "COOKIE_SECRET is missing or too short."
}
if (-not $env:COPYPARTY_ALLOWED_ORIGINS.Split(",").Contains("http://192.168.50.72:3923")) {
  throw "The current Copyparty origin is not allow-listed."
}
if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $HostAddress -ErrorAction SilentlyContinue)) {
  throw "The expected LAN address $HostAddress is not assigned to this host."
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

$Existing = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and $_.CommandLine -like "*$Entry*"
} | Select-Object -First 1

if ($Existing) {
  Write-Output "CopySpace is already running."
  Write-Output "PROCESS_PID=$($Existing.ProcessId)"
  exit 0
}

$env:PORT = "$Port"
$env:HOSTNAME = $HostAddress
$Node = (Get-Command node.exe -ErrorAction Stop).Source
$LogDirectory = Join-Path $env:LOCALAPPDATA "CopySpace\logs"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
$StdOut = Join-Path $LogDirectory "frontend.stdout.log"
$StdErr = Join-Path $LogDirectory "frontend.stderr.log"

$Process = Start-Process -FilePath $Node -ArgumentList @($Entry) -WorkingDirectory $Standalone -PassThru -WindowStyle Hidden -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr

for ($Attempt = 0; $Attempt -lt 30; $Attempt++) {
  Start-Sleep -Milliseconds 500
  $Check = Get-CimInstance Win32_Process -Filter "ProcessId=$($Process.Id)" -ErrorAction SilentlyContinue
  if (-not $Check) { break }
  try {
    $Response = Invoke-WebRequest -Uri "http://$($HostAddress):$Port/app" -UseBasicParsing -TimeoutSec 3
    if ($Response.StatusCode -eq 200) {
      Write-Output "FRONTEND_URL=http://$($HostAddress):$Port/"
      Write-Output "PROCESS_PID=$($Process.Id)"
      Write-Output "APP_HTTP=$($Response.StatusCode)"
      Write-Output "LOG_DIR=$LogDirectory"
      exit 0
    }
  } catch {}
}
Write-Output "CopySpace did not become ready."
if (Test-Path $StdErr) { Get-Content $StdErr -Tail 40 }
if (Test-Path $StdOut) { Get-Content $StdOut -Tail 40 }
exit 1
