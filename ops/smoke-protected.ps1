[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$Commit,
  [Parameter(Mandatory = $true)]
  [string]$ReceiptPath,
  [string]$ProductionUrl = 'https://gym.mientrenadorpersonal.com.ar'
)

$ErrorActionPreference = 'Stop'
$origin = [Uri]$ProductionUrl
if ($origin.Scheme -ne 'https' -or -not $origin.IsDefaultPort -or
    $origin.UserInfo -or $origin.Query -or $origin.Fragment -or
    $ProductionUrl -ne ('https://' + $origin.Host)) {
  throw 'Usar un origen HTTPS sin puerto, ruta, credenciales ni slash final.'
}
$receipt = [IO.Path]::GetFullPath($ReceiptPath)
if ([IO.File]::Exists($receipt) -or -not [IO.Directory]::Exists([IO.Path]::GetDirectoryName($receipt))) {
  throw 'Elegir una constancia nueva en un directorio privado existente.'
}
$bash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'
if (-not (Test-Path -LiteralPath $bash -PathType Leaf)) { throw 'Se requiere Git for Windows.' }
$script = Join-Path $PSScriptRoot 'smoke-production.sh'
$privateDir = Join-Path ([IO.Path]::GetTempPath()) ('opengym-access-smoke-' + [Guid]::NewGuid().ToString('N'))
$cookieFile = Join-Path $privateDir 'access.cookies'
$names = @('PRODUCTION_URL','SMOKE_COMMIT','SMOKE_ACCESS_COOKIE_FILE','SMOKE_RECEIPT_FILE',
  'SMOKE_ORIGIN_URL','EXPECT_LOCKED','CHECK_CONTAINER_CONFIG')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  [IO.Directory]::CreateDirectory($privateDir) | Out-Null
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl = New-Object Security.AccessControl.DirectorySecurity
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner($sid)
  $rule = New-Object Security.AccessControl.FileSystemAccessRule(
    $sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
  $acl.AddAccessRule($rule)
  Set-Acl -LiteralPath $privateDir -AclObject $acl
  $secureCookie = Read-Host 'CF_Authorization del dominio de la app (entrada oculta; no token API)' -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureCookie)
  try {
    $cookieValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($cookieValue -notmatch '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
      throw 'El valor no tiene formato de JWT de Access.'
    }
    $fields = @($origin.Host,'FALSE','/','TRUE','0','CF_Authorization',$cookieValue)
    $text = '# Netscape HTTP Cookie File' + [char]10 + ($fields -join [char]9) + [char]10
    [IO.File]::WriteAllText($cookieFile, $text, (New-Object Text.UTF8Encoding($false)))
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $cookieValue = $null
    $text = $null
    $fields = $null
    $secureCookie.Dispose()
  }
  $values = @{
    PRODUCTION_URL = $ProductionUrl
    SMOKE_COMMIT = $Commit
    SMOKE_ACCESS_COOKIE_FILE = $cookieFile.Replace('\','/')
    SMOKE_RECEIPT_FILE = $receipt.Replace('\','/')
    SMOKE_ORIGIN_URL = ''
    EXPECT_LOCKED = '1'
    CHECK_CONTAINER_CONFIG = '0'
  }
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $values[$name], 'Process') }
  & $bash $script
  if ($LASTEXITCODE -ne 0) { throw 'Smoke HTTPS fallido; conservar pendiente la aceptacion.' }
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
  if (Test-Path -LiteralPath $cookieFile -PathType Leaf) { Remove-Item -LiteralPath $cookieFile }
  if (Test-Path -LiteralPath $privateDir -PathType Container) { Remove-Item -LiteralPath $privateDir }
}
