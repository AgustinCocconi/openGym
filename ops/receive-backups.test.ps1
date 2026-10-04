$ErrorActionPreference = 'Stop'
$taskFixture = Join-Path ([IO.Path]::GetTempPath()) ('opengym-receive-test-' + [Guid]::NewGuid().ToString('N'))
$taskSource = Join-Path $taskFixture 'source'
$taskDestination = Join-Path $taskFixture 'destination'
$taskMode = 'healthy'
$taskTransport = @{ archive_transfers = 0 }
$taskPreviousExit = $global:LASTEXITCODE
function ssh {
  $global:LASTEXITCODE = 0
  if ($taskMode -eq 'network') { $global:LASTEXITCODE = 1; return }
  if ($taskMode -eq 'name') { Write-Output '../unsafe.tar.gz.age'; return }
  Get-ChildItem -LiteralPath $taskSource -Filter '*.age' | ForEach-Object { $_.Name }
}
function scp {
  $remoteName = ($args[-2] -split '/')[-1]
  Copy-Item -LiteralPath (Join-Path $taskSource $remoteName) -Destination $args[-1]
  if ($remoteName.EndsWith('.age')) {
    $taskTransport.archive_transfers++
    if ($taskMode -eq 'corrupt') { [IO.File]::AppendAllText($args[-1], 'damaged') }
  }
  $global:LASTEXITCODE = 0
}
function Invoke-Fixture {
  & (Join-Path $PSScriptRoot 'receive-backups.ps1') -SshTarget fixture -SshConfig (Join-Path $taskFixture 'ssh.conf') -Destination $taskDestination
}
function Assert-Failure([string]$Pattern) {
  $failed = $false
  try { Invoke-Fixture | Out-Null } catch {
    if ($_.Exception.Message -notmatch $Pattern) { throw }
    $failed = $true
  }
  if (-not $failed) { throw ('Se esperaba fallo: ' + $Pattern) }
}
try {
  New-Item -ItemType Directory -Path $taskSource -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $taskFixture 'ssh.conf'), '# fixture only')
  $stamp = [DateTime]::UtcNow.AddHours(-1).ToString("yyyyMMdd'T'HHmmss'Z'")
  $name = 'opengym-data-' + $stamp + '-0123456789ab.tar.gz.age'
  [IO.File]::WriteAllText((Join-Path $taskSource $name), 'synthetic ciphertext transport fixture')
  $digest = (Get-FileHash -LiteralPath (Join-Path $taskSource $name) -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText((Join-Path $taskSource ($name + '.sha256')), $digest + '  ' + $name + [char]10)
  $meta = 'original_archive=' + $name.Substring(0, $name.Length - 4) + [char]10 +
    'original_sha256=' + ('a' * 64) + [char]10 + 'ciphertext_sha256=' + $digest + [char]10
  [IO.File]::WriteAllText((Join-Path $taskSource ($name + '.meta')), $meta)
  Invoke-Fixture | Out-Null
  if ($taskTransport.archive_transfers -ne 1) { throw 'No se transfirio el cifrado inicial.' }
  Invoke-Fixture | Out-Null
  if ($taskTransport.archive_transfers -ne 1) { throw 'Se descargaron de nuevo bytes ya verificados.' }
  $receipts = @(Get-ChildItem -LiteralPath $taskDestination -Filter 'transfer-*' -Directory |
    ForEach-Object { Get-Content -LiteralPath (Join-Path $_.FullName 'transfer-verification.json') -Raw | ConvertFrom-Json })
  if ($receipts.Count -ne 2 -or $receipts[0].isolated_restore -ne 'pending') { throw 'Constancias incorrectas.' }
  $taskMode = 'network'; Assert-Failure 'No se pudo leer'
  $taskMode = 'name'; Assert-Failure 'Nombre remoto'
  $taskMode = 'corrupt'
  $taskDestination = Join-Path $taskFixture 'corrupt-destination'
  Assert-Failure 'Checksum'
  $taskMode = 'healthy'
  [IO.File]::WriteAllText((Join-Path $taskSource ($name + '.meta')), 'invalid fixture metadata')
  Assert-Failure 'Metadata'
  [IO.File]::WriteAllText((Join-Path $taskSource ($name + '.meta')), $meta)
  $stale = $name.Replace($stamp, [DateTime]::UtcNow.AddHours(-25).ToString("yyyyMMdd'T'HHmmss'Z'"))
  Move-Item -LiteralPath (Join-Path $taskSource $name) -Destination (Join-Path $taskSource $stale)
  [IO.File]::WriteAllText((Join-Path $taskSource ($stale + '.sha256')), $digest + '  ' + $stale + [char]10)
  [IO.File]::WriteAllText((Join-Path $taskSource ($stale + '.meta')), $meta.Replace($name.Substring(0, $name.Length - 4), $stale.Substring(0, $stale.Length - 4)))
  Assert-Failure 'RPO 24 h'
  Write-Output '6 casos Windows OK: recepcion, repeticion, red, nombre, checksum/metadata y RPO.'
} finally {
  $global:LASTEXITCODE = $taskPreviousExit
  $resolvedFixture = [IO.Path]::GetFullPath($taskFixture)
  $expectedPrefix = Join-Path ([IO.Path]::GetTempPath()) 'opengym-receive-test-'
  if (-not $resolvedFixture.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta de limpieza inesperada.' }
  if (Test-Path -LiteralPath $resolvedFixture) { Remove-Item -LiteralPath $resolvedFixture -Recurse -Force }
}