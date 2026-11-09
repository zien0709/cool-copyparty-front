$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Entry = Join-Path (Join-Path $ProjectRoot ".next\standalone") "server.js"
$GatewayScript = Join-Path $PSScriptRoot "CopySpace-Gateway.py"

$GatewayProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "python.exe" -and $_.CommandLine -like "*$GatewayScript*"
})
foreach ($Process in $GatewayProcesses) {
  Stop-Process -Id $Process.ProcessId -Force
  Write-Output "Stopped CopySpace gateway PID $($Process.ProcessId)"
}
if ($GatewayProcesses.Count -eq 0) {
  Write-Output "CopySpace gateway is not running."
}

$FrontendProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and $_.CommandLine -like "*$Entry*"
})
foreach ($Process in $FrontendProcesses) {
  Stop-Process -Id $Process.ProcessId -Force
  Write-Output "Stopped CopySpace frontend PID $($Process.ProcessId)"
}
if ($FrontendProcesses.Count -eq 0) {
  Write-Output "CopySpace frontend is not running."
}
