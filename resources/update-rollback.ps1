param(
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [Parameter(Mandatory=$true)][string]$BackupDir,
  [Parameter(Mandatory=$true)][string]$ExecutableRelativePath,
  [Parameter(Mandatory=$true)][string]$HealthFile,
  [Parameter(Mandatory=$true)][string]$RollbackResultPath,
  [Parameter(Mandatory=$true)][string]$LogPath,
  [Parameter(Mandatory=$true)][string]$TargetVersion,
  [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'
$runOncePath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce'
$runOnceName = 'TikTokManagerUpdateRollback'

function Write-UpdateLog([string]$Message) {
  try {
    $parent = Split-Path -Parent $LogPath
    if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o) [rollback] $Message" -Encoding UTF8
  } catch { }
}

function Quote-CommandArgument([string]$Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

function Remove-RollbackRunOnce {
  try {
    Remove-ItemProperty -Path $runOncePath -Name $runOnceName -ErrorAction SilentlyContinue
  } catch { }
}

try {
  $arguments = @(
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', (Quote-CommandArgument $PSCommandPath),
    '-InstallDir', (Quote-CommandArgument $InstallDir),
    '-BackupDir', (Quote-CommandArgument $BackupDir),
    '-ExecutableRelativePath', (Quote-CommandArgument $ExecutableRelativePath),
    '-HealthFile', (Quote-CommandArgument $HealthFile),
    '-RollbackResultPath', (Quote-CommandArgument $RollbackResultPath),
    '-LogPath', (Quote-CommandArgument $LogPath),
    '-TargetVersion', (Quote-CommandArgument $TargetVersion),
    '-TimeoutSeconds', [string]$TimeoutSeconds
  )
  New-Item -ItemType Directory -Path $runOncePath -Force | Out-Null
  New-ItemProperty -Path $runOncePath -Name $runOnceName -Value ('powershell.exe ' + ($arguments -join ' ')) -PropertyType String -Force | Out-Null
} catch {
  Write-UpdateLog "Impossible d'enregistrer la reprise du rollback apres redemarrage : $($_.Exception.Message)"
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
Write-UpdateLog "Surveillance du premier demarrage de la version $TargetVersion"

while ((Get-Date) -lt $deadline) {
  if (Test-Path -LiteralPath $HealthFile) {
    Remove-RollbackRunOnce
    Write-UpdateLog "Version $TargetVersion declaree saine ; rollback annule"
    exit 0
  }
  Start-Sleep -Seconds 3
}

Write-UpdateLog "Aucun signal de sante pour $TargetVersion ; restauration de la version precedente"
$expectedExecutable = [IO.Path]::GetFullPath((Join-Path $InstallDir $ExecutableRelativePath))

try {
  Remove-RollbackRunOnce
  Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -and ([IO.Path]::GetFullPath($_.ExecutablePath) -eq $expectedExecutable)
  } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 3

  if (-not (Test-Path -LiteralPath $BackupDir -PathType Container)) {
    throw "Sauvegarde de rollback introuvable"
  }

  $failedInstallDir = "$InstallDir.failed-$(Get-Date -Format yyyyMMddHHmmss)"
  if (Test-Path -LiteralPath $InstallDir) {
    Move-Item -LiteralPath $InstallDir -Destination $failedInstallDir -Force
  }
  Move-Item -LiteralPath $BackupDir -Destination $InstallDir -Force

  $result = @{
    failedVersion = $TargetVersion
    rolledBackAt = (Get-Date).ToUniversalTime().ToString('o')
    failedInstallDir = $failedInstallDir
    reason = 'health-timeout'
  } | ConvertTo-Json
  Set-Content -LiteralPath $RollbackResultPath -Value $result -Encoding UTF8

  $restoredExecutable = Join-Path $InstallDir $ExecutableRelativePath
  Write-UpdateLog "Version precedente restauree ; redemarrage de $restoredExecutable"
  Start-Process -FilePath $restoredExecutable
  exit 0
} catch {
  Write-UpdateLog "Echec du rollback : $($_.Exception.Message)"
  exit 1
}
