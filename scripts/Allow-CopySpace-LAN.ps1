$ErrorActionPreference = "Stop"

$RuleName = "CopySpace Gateway LAN TCP 3923"
$Program = "C:\Program Files\Python312\python.exe"
$HostAddress = "192.168.50.72"
$AllowedSubnet = "192.168.50.0/24"
$Port = 3923

$Identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$Principal = [Security.Principal.WindowsPrincipal]::new($Identity)
if (-not $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script in an elevated PowerShell window (Run as administrator)."
}
if (-not (Test-Path $Program)) {
  throw "Python 3.12 was not found at $Program."
}
if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $HostAddress -ErrorAction SilentlyContinue)) {
  throw "The expected LAN address $HostAddress is not assigned to this host."
}

Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue |
  Remove-NetFirewallRule

New-NetFirewallRule `
  -DisplayName $RuleName `
  -Direction Inbound `
  -Action Allow `
  -Enabled True `
  -Profile Public `
  -Program $Program `
  -Protocol TCP `
  -LocalAddress $HostAddress `
  -LocalPort $Port `
  -RemoteAddress $AllowedSubnet | Out-Null

Write-Output "Created rule: $RuleName"
Write-Output "Program: $Program"
Write-Output "Allowed source: $AllowedSubnet"
Write-Output "Destination: ${HostAddress}:$Port/TCP"
Write-Output "No router port-forwarding was changed."
