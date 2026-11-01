#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Archive,
    [string]$Sha256,
    [string]$Keyring = 'E:\Batcaverna Archives\backup-chave-v2\gnupg',
    [string]$B2Config,
    [ValidateRange(1,60)][int]$MaxAgeDays = 7,
    [switch]$InstallMonthlyReminder,
    [switch]$CheckOnly,
    [switch]$Reminder
)

$ErrorActionPreference = 'Stop'

function Set-RehearsalPrivateAccess {
    param([Parameter(Mandatory = $true)][string]$Path)

    $directory = New-Object System.IO.DirectoryInfo($Path)
    $section = [System.Security.AccessControl.AccessControlSections]::Access
    # Read and persist only the DACL. Set-Acl can request an audit/SACL update
    # on a reused directory and require SeSecurityPrivilege unnecessarily.
    if ($PSVersionTable.PSEdition -eq 'Core') {
        $acl = [System.IO.FileSystemAclExtensions]::GetAccessControl($directory, $section)
    } else { $acl = $directory.GetAccessControl($section) }
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($existing in @($acl.GetAccessRules($true, $false, [System.Security.Principal.SecurityIdentifier]))) {
        $acl.RemoveAccessRuleSpecific($existing)
    }
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    $propagate = [System.Security.AccessControl.PropagationFlags]::None
    $allow = [System.Security.AccessControl.AccessControlType]::Allow
    foreach ($principal in @($identity, (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')))) {
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($principal, 'FullControl', $inherit, $propagate, $allow)
        $acl.AddAccessRule($rule)
    }
    if ($PSVersionTable.PSEdition -eq 'Core') {
        [System.IO.FileSystemAclExtensions]::SetAccessControl($directory, $acl)
    } else { $directory.SetAccessControl($acl) }
}

Add-Type -AssemblyName System.Windows.Forms
if ($Reminder) {
    $answer = [System.Windows.Forms.MessageBox]::Show(
        'Executar agora o ensaio mensal assistido do backup da BatCaverna?',
        'BatCaverna - ensaio de recuperacao',
        [System.Windows.Forms.MessageBoxButtons]::YesNo)
    if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { return }
}

$taskName = 'BatCaverna-Ensaio-Mensal-Assistido'
if ($InstallMonthlyReminder) {
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        throw 'O lembrete ja existe. Nenhuma tarefa foi substituida.'
    }
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $first = (Get-Date -Day 1 -Hour 19 -Minute 0 -Second 0).AddMonths(1).ToString('yyyy-MM-ddTHH:mm:ss')
    $taskArgs = '-NoProfile -ExecutionPolicy RemoteSigned -File "' + $PSCommandPath + '" -Reminder'
    if ($B2Config) {
        if (!(Test-Path -LiteralPath $B2Config -PathType Leaf)) { throw 'Configuracao B2 nao encontrada.' }
        $taskArgs += ' -B2Config "' + (Resolve-Path -LiteralPath $B2Config).Path + '"'
    }
    $taskArgs = [System.Security.SecurityElement]::Escape($taskArgs)
    $xml = @"
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Ensaio assistido; nao guarda senhas e nao restaura producao.</Description></RegistrationInfo>
  <Triggers><CalendarTrigger><StartBoundary>$first</StartBoundary><Enabled>true</Enabled><ScheduleByMonth><DaysOfMonth><Day>1</Day></DaysOfMonth><Months><January/><February/><March/><April/><May/><June/><July/><August/><September/><October/><November/><December/></Months></ScheduleByMonth></CalendarTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>$sid</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT2H</ExecutionTimeLimit><Enabled>true</Enabled></Settings>
  <Actions Context="Author"><Exec><Command>powershell.exe</Command><Arguments>$taskArgs</Arguments><WorkingDirectory>$([System.Security.SecurityElement]::Escape($PSScriptRoot))</WorkingDirectory></Exec></Actions>
</Task>
"@
    Register-ScheduledTask -TaskName $taskName -Xml $xml | Out-Null
    Write-Host 'Lembrete instalado: dia 1, 19h no horario local, na sua sessao do Windows.' -ForegroundColor Green
    return
}

if ($Archive -and $B2Config) { throw 'Escolha arquivo local ou B2, sem combinar os dois.' }
if (!$CheckOnly -and !$Archive -and !$B2Config) {
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = 'Selecione a copia criptografada mais recente da BatCaverna'
    $dialog.InitialDirectory = "$env:USERPROFILE\Downloads"
    $dialog.Filter = 'Backup criptografado (*.gpg)|*.gpg'
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }
    $Archive = $dialog.FileName
}
if (!$CheckOnly -and $Archive) {
    if (!(Test-Path -LiteralPath $Archive -PathType Leaf)) { throw 'Backup nao encontrado.' }
    if (!$Sha256) { $Sha256 = Read-Host 'Cole o SHA-256 confirmado no resumo do backup' }
    if ($Sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'SHA-256 invalido.' }
    if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash -ne $Sha256) {
        throw 'Hash divergente. Nenhuma restauracao foi iniciada.'
    }
}
if (!$CheckOnly -and !(Test-Path -LiteralPath $Keyring -PathType Container)) {
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = 'Selecione o chaveiro GPG v2 preservado (pasta gnupg)'
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }
    $Keyring = $dialog.SelectedPath
}

# Only this dedicated new parent receives an explicit private ACL. No ACL is
# changed on the original rehearsal, Downloads, keyring or user profile.
$root = Join-Path $env:USERPROFILE 'BatCaverna-Ensaios-Mensais'
if (Test-Path -LiteralPath $root) {
    $item = Get-Item -LiteralPath $root -Force
    if (!$item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'A pasta de ensaios nao pode ser arquivo, link ou juncao.'
    }
} else { New-Item -ItemType Directory -Path $root | Out-Null }
Set-RehearsalPrivateAccess -Path $root

$cli = "$env:USERPROFILE\BatCaverna-Servicos-v2\ferramentas\supabase-2.122.0\supabase.exe"
if (!(Test-Path -LiteralPath $cli -PathType Leaf)) { throw 'CLI 2.122.0 do ensaio anterior nao encontrado.' }
$runner = Join-Path $PSScriptRoot 'monthly_rehearsal.py'
if (!(Test-Path -LiteralPath $runner -PathType Leaf)) { throw 'Pacote de ferramentas incompleto.' }
$venv = Join-Path $root 'python'
$python = Join-Path $venv 'Scripts\python.exe'
if (!(Test-Path -LiteralPath $python -PathType Leaf)) {
    & py -3 -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar Python local.' }
    & $python -m pip install --disable-pip-version-check -r (Join-Path $PSScriptRoot 'requirements-recovery.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar o parser SQL fixado.' }
}
$argsPython = @($runner, '--root', $root, '--cli', $cli, '--keyring', $Keyring, '--max-age-days', "$MaxAgeDays")
if ($CheckOnly) { $argsPython += '--check-only' }
elseif ($B2Config) { $argsPython += @('--b2-config', $B2Config) }
else { $argsPython += @('--archive', $Archive, '--sha256', $Sha256) }
& $python @argsPython
if ($LASTEXITCODE -ne 0) {
    throw 'Ensaio sem aprovacao. Preserve o ambiente e os logs privados; compartilhe apenas o relatorio.json.'
}
if ($CheckOnly) { Write-Host 'Pre-requisitos conferidos. Nenhuma restauracao foi iniciada.' -ForegroundColor Green }
else { Write-Host 'Ensaio aprovado. Servicos parados e relatorio salvo na pasta privada de ensaios.' -ForegroundColor Green }
