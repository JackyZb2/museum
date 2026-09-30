$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$bundledNode = "C:\Users\1\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if ((Test-Path $bundledNode) -and ($env:Path -notlike "*$bundledNode*")) { $env:Path = "$bundledNode;$env:Path" }
$npm = Get-Command npm -ErrorAction SilentlyContinue
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
$bundledPnpm = "C:\Users\1\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
$pnpmCommand = $null
if ($pnpm) {
  $pnpmCommand = $pnpm.Source
} elseif (Test-Path $bundledPnpm) {
  # A path string works for bundled .cmd files; Get-Item returns a FileInfo
  # object that has no Source property in PowerShell.
  $pnpmCommand = $bundledPnpm
}

if ($npm) {
  if (-not (Test-Path "node_modules")) { & $npm.Source install }
  & $npm.Source run db:generate
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $npm.Source run db:deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $npm.Source run db:seed
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $npm.Source run dev
  exit $LASTEXITCODE
}

# Codex's bundled runtime includes pnpm even when npm is not on PATH.
if ($pnpmCommand) {
  if (-not (Test-Path "node_modules")) { & $pnpmCommand install }
  & $pnpmCommand db:generate
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $pnpmCommand db:deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $pnpmCommand db:seed
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $pnpmCommand dev
  exit $LASTEXITCODE
}

Write-Error "npm or pnpm was not found. Install Node.js LTS or add npm to PATH."
