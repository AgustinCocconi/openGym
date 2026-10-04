[CmdletBinding()]
param([switch]$VerifyOnly)

$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Este ingreso cifrado requiere Windows.' }

$tokenDirectory = Join-Path $env:LOCALAPPDATA 'openGym-oci-cloudflare'
$tokenPath = Join-Path $tokenDirectory 'api-token.clixml'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()

if (-not (Test-Path -LiteralPath $tokenDirectory)) {
    if ($VerifyOnly) { throw 'Todavia no hay un token guardado.' }
    New-Item -ItemType Directory -Path $tokenDirectory | Out-Null
    $privateAcl = New-Object Security.AccessControl.DirectorySecurity
    $privateAcl.SetOwner($identity.User)
    $privateAcl.SetAccessRuleProtection($true, $false)
    $privateRule = New-Object Security.AccessControl.FileSystemAccessRule(
        $identity.User, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'
    )
    $privateAcl.AddAccessRule($privateRule)
    Set-Acl -LiteralPath $tokenDirectory -AclObject $privateAcl
}

$directory = Get-Item -LiteralPath $tokenDirectory
if (-not $directory.PSIsContainer -or ($directory.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'El destino debe ser un directorio local propio, sin enlaces.'
}
$acl = Get-Acl -LiteralPath $tokenDirectory
$rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
if (-not $acl.AreAccessRulesProtected -or $rules.Count -ne 1 -or
    $rules[0].IdentityReference.Value -ne $identity.User.Value -or
    $rules[0].AccessControlType -ne 'Allow' -or
    $rules[0].FileSystemRights -ne 'FullControl') {
    throw 'El directorio existente tiene otros permisos; detener y revisar.'
}

if (-not $VerifyOnly) {
    if (Test-Path -LiteralPath $tokenPath) { throw 'Ya hay un token guardado; se conserva. Usar -VerifyOnly.' }
    $secureToken = Read-Host 'Pegue el API token de Cloudflare (entrada oculta)' -AsSecureString
    try {
        if ($secureToken.Length -eq 0) { throw 'El token no puede estar vacio.' }
        Export-Clixml -InputObject $secureToken -LiteralPath $tokenPath -Encoding UTF8 -NoClobber
    } finally {
        if ($secureToken) { $secureToken.Dispose() }
    }
}

$storedToken = Import-Clixml -LiteralPath $tokenPath
try {
    if ($storedToken -isnot [Security.SecureString] -or $storedToken.Length -eq 0) {
        throw 'No se pudo verificar el token cifrado para este usuario.'
    }
    Write-Host 'Token cifrado y permisos privados verificados. Avise: token listo.'
} finally {
    if ($storedToken -is [Security.SecureString]) { $storedToken.Dispose() }
}
