[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EncryptedArchive,
  [string]$IdentityFile = (Join-Path $env:LOCALAPPDATA 'openGym-recovery/identity.txt'),
  [string]$AgeExecutable = (Join-Path $env:LOCALAPPDATA 'openGym-tools/age/v1.3.2/age/age.exe'),
  [ValidatePattern('^[A-Za-z0-9._-]+$')]
  [string]$WslDistribution = 'Ubuntu'
)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$archivePath = (Resolve-Path -LiteralPath $EncryptedArchive).Path
$identityPath = (Resolve-Path -LiteralPath $IdentityFile).Path
foreach ($path in @($archivePath, $identityPath)) {
  if ($path -eq $repo -or $path.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase) -or
      (Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint -or
      -not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw 'Copia e identidad regulares fuera del checkout requeridas.'
  }
}
$name = [IO.Path]::GetFileName($archivePath)
if ($name -notmatch '^opengym-data-\d{8}T\d{6}Z-[0-9a-f]{12}\.tar\.gz\.age$') { throw 'Nombre cifrado inesperado.' }
$checksum = (Get-Content -LiteralPath ($archivePath + '.sha256') -Raw).Trim()
if ($checksum -notmatch ('^([0-9a-f]{64})  ' + [regex]::Escape($name) + '$')) { throw 'Checksum cifrado invalido.' }
$expectedCiphertext = $Matches[1]
$actualCiphertext = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualCiphertext -ne $expectedCiphertext) { throw 'Checksum cifrado incorrecto.' }
$meta = Get-Content -LiteralPath ($archivePath + '.meta') -Raw
$plainName = $name.Substring(0, $name.Length - 4)
if ($meta -notmatch ('(?m)^original_archive=' + [regex]::Escape($plainName) + '\r?$') -or
    $meta -notmatch ('(?m)^ciphertext_sha256=' + $actualCiphertext + '\r?$')) { throw 'Metadata inconsistente.' }
if ($meta -notmatch '(?m)^original_sha256=([0-9a-f]{64})\r?$') { throw 'Falta checksum original.' }
$expectedPlaintext = $Matches[1]
if (-not (Test-Path -LiteralPath $AgeExecutable -PathType Leaf)) { throw 'Falta age nativo.' }

function Convert-ToWslPath([string]$Path) {
  $result = & wsl -d $WslDistribution --exec wslpath -a -u $Path
  if ($LASTEXITCODE -ne 0 -or -not $result) { throw 'No se pudo resolver la ruta WSL.' }
  return $result.Trim()
}
$privateDir = Join-Path ([IO.Path]::GetTempPath()) ('opengym-monthly-restore-' + [Guid]::NewGuid().ToString('N'))
$started = [DateTime]::UtcNow
try {
  [IO.Directory]::CreateDirectory($privateDir) | Out-Null
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl = New-Object Security.AccessControl.DirectorySecurity
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner($sid)
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule(
    $sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
  Set-Acl -LiteralPath $privateDir -AclObject $acl
  $plainArchive = Join-Path $privateDir $plainName
  & $AgeExecutable --decrypt -i $identityPath -o $plainArchive $archivePath
  if ($LASTEXITCODE -ne 0) { throw 'Descifrado fallido.' }
  $actualPlaintext = (Get-FileHash -LiteralPath $plainArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualPlaintext -ne $expectedPlaintext) { throw 'Checksum original incorrecto.' }
  [IO.File]::WriteAllText(($plainArchive + '.sha256'), $expectedPlaintext + '  ' + $plainName + [char]10,
    (New-Object Text.UTF8Encoding($false)))
  $helper = Convert-ToWslPath (Join-Path $PSScriptRoot 'verify-backup-restore.sh')
  $wslArchive = Convert-ToWslPath $plainArchive
  $wslTarget = Convert-ToWslPath (Join-Path $privateDir 'restored')
  & wsl -d $WslDistribution --exec sh $helper $wslArchive $wslTarget
  if ($LASTEXITCODE -ne 0) { throw 'Restauracion aislada fallida.' }
  $files = @(Get-ChildItem -LiteralPath (Join-Path $privateDir 'restored/data') -File -Recurse).Count
  $receipt = @{
    checked_utc = [DateTime]::UtcNow.ToString('o')
    encrypted_archive = $name
    ciphertext_checksum = 'verified'
    original_checksum = 'verified'
    isolated_restore = 'verified'
    restored_files = $files
    duration_seconds = [Math]::Round(([DateTime]::UtcNow - $started).TotalSeconds, 2)
    independent_custody = 'not_asserted'
  }
  $receiptPath = $archivePath + '.restore-' + [DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmssfff'Z'") + '.json'
  if (Test-Path -LiteralPath $receiptPath) { throw 'Constancia existente; no sobrescribir.' }

} finally {
  $resolved = [IO.Path]::GetFullPath($privateDir)
  $prefix = Join-Path ([IO.Path]::GetTempPath()) 'opengym-monthly-restore-'
  if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Limpieza fuera de ruta propia.' }
  if (Test-Path -LiteralPath $resolved) {
    if ((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No borrar enlace de restauracion.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
$receipt.plaintext_cleanup = 'verified'
$receipt | ConvertTo-Json | Set-Content -LiteralPath $receiptPath -Encoding UTF8
Write-Output ('Restauracion aislada verificada: ' + $receiptPath)
