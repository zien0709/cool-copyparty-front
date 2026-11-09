$ErrorActionPreference = "Stop"

$RuleName = "CopySpace LAN TCP 3925"
$HostAddress = "192.168.50.72"
$AllowedSubnet = "192.168.50.0/24"
$Port = 3925

$Identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$Principal = [Security.Principal.WindowsPrincipal]::new($Identity)
if (-not $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script in an elevated PowerShell window (Run as administrator)."
}

if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $HostAddress -ErrorAction SilentlyContinue)) {
  throw "The expected LAN address $HostAddress is not assigned to this host."
}

# Replace only this script's specifically named rule; keep the scope narrow.
Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue |
  Remove-NetFirewallRule

New-NetFirewallRule `
  -DisplayName $RuleName `
  -Direction Inbound `
  -Action Allow `
  -Enabled True `
  -Profile Any `
  -Protocol TCP `
  -LocalAddress $HostAddress `
  -LocalPort $Port `
  -RemoteAddress $AllowedSubnet | Out-Null

Write-Output "Created firewall rule: $RuleName"
Write-Output "Allowed source: $AllowedSubnet"
Write-Output "Destination: ${HostAddress}:$Port/TCP"
Write-Output "No router port-forwarding was changed."