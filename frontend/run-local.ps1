$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$bundledNode = "C:\Users\1\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if ((Test-Path $bundledNode) -and ($env:Path -notlike "*$bundledNode*")) { $env:Path = "$bundledNode;$env:Path" }
$npm = Get-Command npm -ErrorAction SilentlyContinue
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($npm) {
  if (-not (Test-Path "node_modules")) { & $npm.Source install }
  & $npm.Source run dev
  exit $LASTEXITCODE
}

# Codex's bundled runtime includes pnpm even when npm is not on PATH.
$bundledPnpm = "C:\Users\1\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
if (-not $pnpm -and (Test-Path $bundledPnpm)) { $pnpm = Get-Item $bundledPnpm }
if ($pnpm) {
  if (-not (Test-Path "node_modules")) { & $pnpm.Source install }
  & $pnpm.Source dev
  exit $LASTEXITCODE
}

Write-Error "npm or pnpm was not found. Install Node.js LTS or add npm to PATH."
