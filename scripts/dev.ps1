param([ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start')
$ErrorActionPreference = 'Stop'
$devRoot = Split-Path $PSScriptRoot -Parent
$devLog = Join-Path $devRoot '.logs'
$devStatePath = Join-Path $devLog 'processes.json'
$devPorts = @(3014, 8014, 55414)

if ($Action -eq 'Status') {
    foreach ($devPort in $devPorts) {
        $devListening = @(Get-NetTCPConnection -LocalPort $devPort -State Listen -ErrorAction SilentlyContinue)
        Write-Output ("Port {0}: {1}" -f $devPort, $(if ($devListening.Count) { 'active' } else { 'stopped' }))
    }
    exit 0
}

if ($Action -eq 'Stop') {
    if (!(Test-Path -LiteralPath $devStatePath)) { Write-Output 'No managed NewsFoundry session.'; exit 0 }
    $devState = Get-Content -LiteralPath $devStatePath -Raw | ConvertFrom-Json
    $devPgCtl = Join-Path $devRoot 'node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'
    $devPgDir = Join-Path $devRoot '.local-postgres'
    if ((Test-Path -LiteralPath (Join-Path $devPgDir 'postmaster.pid')) -and (Test-Path -LiteralPath $devPgCtl)) {
        $devPgPid = [int](Get-Content -LiteralPath (Join-Path $devPgDir 'postmaster.pid') -TotalCount 1)
        $devPgProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$devPgPid" -ErrorAction SilentlyContinue
        if ($null -ne $devPgProcess -and $devPgProcess.CommandLine.Contains($devPgDir)) {
            & $devPgCtl stop -D $devPgDir -m fast -w
            if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL shutdown failed.' }
        }
    }
    foreach ($devEntry in @($devState.services | Sort-Object port)) {
        $devProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($devEntry.pid)" -ErrorAction SilentlyContinue
        if ($null -ne $devProcess -and $devProcess.CommandLine.Contains($devRoot) -and $devProcess.CreationDate.ToUniversalTime().Ticks -eq ([datetime]$devEntry.createdAt).ToUniversalTime().Ticks) {
            & taskkill.exe /PID $devEntry.pid /T /F | Out-Null
        }
    }
    Write-Output 'NewsFoundry stopped; database files preserved.'
    exit 0
}

New-Item -ItemType Directory -Path $devLog -Force | Out-Null
if (@(Get-NetTCPConnection -LocalPort $devPorts -State Listen -ErrorAction SilentlyContinue).Count) {
    throw 'A NewsFoundry port is already in use. Run scripts/dev.ps1 Status first.'
}
$devNode = (Get-Command node.exe).Source
$devBackend = Join-Path $devRoot 'backend'
$devFrontend = Join-Path $devRoot 'frontend'
$devDefinitions = @(
    @{ name = 'postgres'; port = 55414; executable = $devNode; directory = $devRoot; arguments = @('--env-file=backend/.env', (Join-Path $devRoot 'scripts/local-postgres.mjs')) },
    @{ name = 'backend'; port = 8014; executable = (Join-Path $devBackend '.venv/Scripts/python.exe'); directory = $devBackend; arguments = @('-m', 'uvicorn', 'src.main:app', '--host', '127.0.0.1', '--port', '8014', '--reload', '--reload-dir', 'src') },
    @{ name = 'frontend'; port = 3014; executable = $devNode; directory = $devFrontend; arguments = @((Join-Path $devFrontend 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3014') }
)
$devEntries = @()
foreach ($devDefinition in $devDefinitions) {
    if ($devDefinition.name -eq 'backend') {
        $devDbReady = $false
        for ($devTry = 0; $devTry -lt 45; $devTry++) {
            $devTcp = New-Object System.Net.Sockets.TcpClient
            try { $devTcp.Connect('127.0.0.1', 55414); $devDbReady = $true; break } catch { Start-Sleep -Seconds 1 } finally { $devTcp.Dispose() }
        }
        if (!$devDbReady) { throw 'PostgreSQL did not start. Inspect .logs/postgres.stderr.log.' }
    }
    $devProcess = Start-Process -FilePath $devDefinition.executable -ArgumentList $devDefinition.arguments -WorkingDirectory $devDefinition.directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $devLog ($devDefinition.name + '.stdout.log')) -RedirectStandardError (Join-Path $devLog ($devDefinition.name + '.stderr.log')) -PassThru
    $devIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$($devProcess.Id)"
    $devEntries += @{ name = $devDefinition.name; pid = $devProcess.Id; port = $devDefinition.port; createdAt = $devIdentity.CreationDate.ToUniversalTime().ToString('o') }
    @{ services = $devEntries } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $devStatePath -Encoding utf8
}
Write-Output 'NewsFoundry starting: http://127.0.0.1:3014 | API http://127.0.0.1:8014/docs'
