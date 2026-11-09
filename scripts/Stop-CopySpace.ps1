$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Entry = Join-Path (Join-Path $ProjectRoot ".next\standalone") "server.js"
$Processes = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and $_.CommandLine -like "*$Entry*"
})

if ($Processes.Count -eq 0) {
  Write-Output "CopySpace is not running."
  exit 0
}

foreach ($Process in $Processes) {
  Stop-Process -Id $Process.ProcessId -Force
  Write-Output "Stopped CopySpace PID $($Process.ProcessId)"
}
