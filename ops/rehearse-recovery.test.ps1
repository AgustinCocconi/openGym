$ErrorActionPreference = 'Stop'
$taskFixture = Join-Path ([IO.Path]::GetTempPath()) ('opengym-rehearse-test-' + [Guid]::NewGuid().ToString('N'))
$taskAgeDirectory = Join-Path $env:LOCALAPPDATA 'openGym-tools/age/v1.3.2/age'
$taskAge = Join-Path $taskAgeDirectory 'age.exe'
$taskKeygen = Join-Path $taskAgeDirectory 'age-keygen.exe'
$taskBefore = @(Get-ChildItem -LiteralPath ([IO.Path]::GetTempPath()) -Directory -Filter 'opengym-monthly-restore-*' | ForEach-Object { $_.FullName })
function Invoke-Rehearsal {
  & (Join-Path $PSScriptRoot 'rehearse-recovery.ps1') -EncryptedArchive $taskEncrypted -IdentityFile $taskIdentity -AgeExecutable $taskAge
}
function Assert-Failure([string]$Pattern) {
  $failed = $false
  try { Invoke-Rehearsal | Out-Null } catch {
    if ($_.Exception.Message -notmatch $Pattern) { throw }
    $failed = $true
  }
  if (-not $failed) { throw ('Se esperaba fallo: ' + $Pattern) }
}
try {
  New-Item -ItemType Directory -Path (Join-Path $taskFixture 'data') -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $taskFixture 'data/db.json'), '{"fixture":true,"users":[]}')
  $taskIdentity = Join-Path $taskFixture 'fixture-identity.txt'
  & $taskKeygen -o $taskIdentity
  if ($LASTEXITCODE -ne 0) { throw 'No se genero identidad ficticia.' }
  $taskRecipient = & $taskKeygen -y $taskIdentity
  if ($LASTEXITCODE -ne 0) { throw 'No se genero destinatario ficticio.' }
  $name = 'opengym-data-20261004T080000Z-0123456789ab.tar.gz'
  $taskArchive = Join-Path $taskFixture $name
  $taskEncrypted = $taskArchive + '.age'
  $wslRoot = & wsl -d Ubuntu --exec wslpath -a -u $taskFixture
  if ($LASTEXITCODE -ne 0) { throw 'WSL no disponible.' }
  & wsl -d Ubuntu --exec tar -czf ($wslRoot.Trim() + '/' + $name) -C $wslRoot.Trim() data
  if ($LASTEXITCODE -ne 0) { throw 'No se genero tar ficticio.' }
  & $taskAge -r $taskRecipient -o $taskEncrypted $taskArchive
  if ($LASTEXITCODE -ne 0) { throw 'No se cifro fixture.' }
  $original = (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  $ciphertext = (Get-FileHash -LiteralPath $taskEncrypted -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText(($taskEncrypted + '.sha256'), $ciphertext + '  ' + $name + '.age' + [char]10)
  $meta = 'original_archive=' + $name + [char]10 + 'original_sha256=' + $original + [char]10 +
    'ciphertext_sha256=' + $ciphertext + [char]10
  [IO.File]::WriteAllText(($taskEncrypted + '.meta'), $meta)
  Invoke-Rehearsal | Out-Null
  $receipt = Get-ChildItem -LiteralPath $taskFixture -Filter '*.restore-*.json' |
    ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json }
  if ($receipt.isolated_restore -ne 'verified' -or $receipt.restored_files -ne 1 -or
      $receipt.independent_custody -ne 'not_asserted') { throw 'Constancia de restauracion incorrecta.' }
  [IO.File]::WriteAllText(($taskEncrypted + '.meta'), $meta.Replace($original, ('0' * 64)))
  Assert-Failure 'Checksum original incorrecto'
  [IO.File]::WriteAllText(($taskEncrypted + '.meta'), $meta)
  [IO.File]::AppendAllText($taskEncrypted, 'corruption')
  Assert-Failure 'Checksum cifrado incorrecto'
  $taskAfter = @(Get-ChildItem -LiteralPath ([IO.Path]::GetTempPath()) -Directory -Filter 'opengym-monthly-restore-*' |
    Where-Object { $_.FullName -notin $taskBefore })
  if ($taskAfter.Count -ne 0) { throw 'Quedo plaintext temporal del simulacro.' }
  Write-Output '3 casos Windows/WSL/age nativo OK: restauracion real, checksum original, cifrado corrupto y limpieza.'
} finally {
  $resolved = [IO.Path]::GetFullPath($taskFixture)
  $prefix = Join-Path ([IO.Path]::GetTempPath()) 'opengym-rehearse-test-'
  if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta de limpieza inesperada.' }
  if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}