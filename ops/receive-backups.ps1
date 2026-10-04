[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9@._-]*$')]
  [string]$SshTarget,
  [Parameter(Mandatory = $true)]
  [string]$SshConfig,
  [ValidateRange(1, 65535)]
  [int]$SshPort = 22,
  [string]$Destination = (Join-Path $env:LOCALAPPDATA 'openGym-backups')
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$destinationPath = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
if ($destinationPath -eq $repo -or $destinationPath.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'El destino debe quedar fuera del checkout.'
}
$configPath = (Resolve-Path -LiteralPath $SshConfig).Path
# La sesion temporal y la verificacion de host ya deben existir.
$options = @('-F', $configPath, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15')
$remoteNames = @(& ssh @options -p $SshPort $SshTarget "find /srv/opengym-encrypted -maxdepth 1 -type f -name 'opengym-data-*.tar.gz.age' -printf '%f\n'")
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el inventario por la sesion temporal de Bastion.' }
$names = @($remoteNames | Where-Object { $_ -ne '' } | Sort-Object -Unique)
if ($names.Count -eq 0) { throw 'No hay backups cifrados para copiar.' }
foreach ($name in $names) {
  if ($name -notmatch '^opengym-data-\d{8}T\d{6}Z-[0-9a-f]{12}\.tar\.gz\.age$') {
    throw 'Nombre remoto inesperado; no transferir.'
  }
}
if (Test-Path -LiteralPath $destinationPath) {
  if ((Get-Item -LiteralPath $destinationPath).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'El destino no puede ser un enlace.'
  }
}
[IO.Directory]::CreateDirectory($destinationPath) | Out-Null
$privateDir = Join-Path $destinationPath ('transfer-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($privateDir) | Out-Null
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner($sid)
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule(
  $sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
Set-Acl -LiteralPath $privateDir -AclObject $acl
# Conservar tripletas en carpeta privada; no modificar backups ya guardados.
try {
  foreach ($name in $names) {
    foreach ($suffix in @('.sha256', '.meta')) {
      $remote = $SshTarget + ':/srv/opengym-encrypted/' + $name + $suffix
      & scp @options -P $SshPort $remote (Join-Path $privateDir ($name + $suffix))
      if ($LASTEXITCODE -ne 0) { throw 'Transferencia incompleta; conservar carpeta para diagnostico.' }
    }
    $checksum = (Get-Content -LiteralPath (Join-Path $privateDir ($name + '.sha256')) -Raw).Trim()
    if ($checksum -notmatch ('^([0-9a-f]{64})  ' + [regex]::Escape($name) + '$')) {
      throw 'Formato de checksum inesperado.'
    }
    $expected = $Matches[1]
    $localArchive = $null
    foreach ($folder in @(Get-ChildItem -LiteralPath $destinationPath -Directory -Filter 'transfer-*')) {
      if ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
      $candidate = Join-Path $folder.FullName $name
      if (Test-Path -LiteralPath $candidate -PathType Leaf) {
        if ((Get-Item -LiteralPath $candidate).Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
        if ((Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant() -eq $expected) {
          $localArchive = $candidate
          break
        }
      }
    }
    if (-not $localArchive) {
      $localArchive = Join-Path $privateDir $name
      & scp @options -P $SshPort ($SshTarget + ':/srv/opengym-encrypted/' + $name) $localArchive
      if ($LASTEXITCODE -ne 0) { throw 'Transferencia incompleta; conservar carpeta para diagnostico.' }
    }
    $actual = (Get-FileHash -LiteralPath $localArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw 'Checksum del cifrado incorrecto.' }
    $meta = Get-Content -LiteralPath (Join-Path $privateDir ($name + '.meta')) -Raw
    if ($meta -notmatch ('(?m)^original_archive=' + [regex]::Escape($name.Substring(0, $name.Length - 4)) + '\r?$') -or
        $meta -notmatch '(?m)^original_sha256=[0-9a-f]{64}\r?$' -or
        $meta -notmatch ('(?m)^ciphertext_sha256=' + $actual + '\r?$')) {
      throw 'Metadata de recuperacion incompleta/inconsistente.'
    }
  }
  $latest = $names[-1]
  $stamp = [regex]::Match($latest, '\d{8}T\d{6}Z').Value
  $created = [DateTime]::ParseExact($stamp, "yyyyMMdd'T'HHmmss'Z'", [Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  $ageHours = ([DateTime]::UtcNow - $created).TotalHours
  if ($ageHours -lt 0) { throw 'Backup con fecha futura.' }
  $receipt = @{
    checked_utc = [DateTime]::UtcNow.ToString('o')
    latest_archive = $latest
    latest_verified_path = $localArchive
    latest_created_utc = $created.ToString('o')
    age_hours = [Math]::Round($ageHours, 2)
    archives_verified = $names.Count
    ciphertext_checksum = 'verified'
    isolated_restore = 'pending'
    directory = $privateDir
  }
  $receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $privateDir 'transfer-verification.json') -Encoding UTF8
  if ($ageHours -gt 24) { throw 'Copia verificada pero mas vieja que el objetivo RPO 24 h.' }
  Write-Output ('Copias cifradas verificadas: ' + $privateDir + '; restauracion mensual pendiente.')
} catch {
  Write-Output ('Transferencia pendiente/fallida: ' + $privateDir)
  throw
}