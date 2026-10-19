param([string]$ExecutablePath = '')
$ErrorActionPreference = 'Stop'
$exe = if ($ExecutablePath) { $ExecutablePath } else { Join-Path $PWD 'src-tauri/target/release/batcaverna-clt-desktop.exe' }
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class BatCavernaWindowProbe {
  private delegate bool WindowCallback(IntPtr handle, IntPtr data);
  [DllImport("user32.dll")] private static extern bool EnumWindows(WindowCallback callback, IntPtr data);
  [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr handle, StringBuilder title, int capacity);
  public static bool Visible(uint processId) {
    bool found=false;
    EnumWindows((handle, data) => {
      uint owner; GetWindowThreadProcessId(handle, out owner);
      if(owner==processId && IsWindowVisible(handle)) {
        var title=new StringBuilder(512); GetWindowText(handle,title,title.Capacity);
        Console.WriteLine("VISIBLE_WINDOW: " + title.ToString());
        if(title.ToString()=="BatCaverna CLT") found=true;
      }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
'@
$config = Join-Path $env:APPDATA 'dev.gamersclt.batcaverna.desktop'
$prefs = Join-Path $config 'desktop-preferences.json'
$original = if (Test-Path $prefs) { [IO.File]::ReadAllBytes($prefs) } else { $null }
$env:BATCAVERNA_SMOKE_LOG = Join-Path $PWD 'tauri-tray-smoke.log'
Remove-Item $env:BATCAVERNA_SMOKE_LOG -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $config | Out-Null
[IO.File]::WriteAllText($prefs, '{"background":true,"notifications":true,"sound":false,"autostart":false,"start_minimized":true}', [Text.UTF8Encoding]::new($false))
$process = $null
try {
  $process = Start-Process $exe -ArgumentList '--autostart' -PassThru
  $deadline = (Get-Date).AddSeconds(50)
  $ready = $false
  do {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw 'O aplicativo encerrou durante o início minimizado.' }
    if (Test-Path $env:BATCAVERNA_SMOKE_LOG) {
      $log = Get-Content $env:BATCAVERNA_SMOKE_LOG -Raw
      if ($log -match 'BOOT_FAILURE') { throw 'Falha no boot minimizado.' }
      if ($log -match 'BOOT_READY') { $ready = $true; break }
    }
  } while ((Get-Date) -lt $deadline)
  if (!$ready) { throw 'O início minimizado não confirmou BOOT_READY.' }
  $process.Refresh()
  Write-Host "DOTNET_MAIN_WINDOW: $($process.MainWindowTitle)"
  if ([BatCavernaWindowProbe]::Visible($process.Id)) { throw 'A janela apareceu apesar da preferência de início minimizado.' }
  Start-Process $exe | Out-Null
  $deadline = (Get-Date).AddSeconds(15)
  do {
    Start-Sleep -Milliseconds 250
    $process.Refresh()
    if ([BatCavernaWindowProbe]::Visible($process.Id)) { break }
  } while ((Get-Date) -lt $deadline)
  if (![BatCavernaWindowProbe]::Visible($process.Id)) { throw 'A abertura manual não restaurou a janela da bandeja.' }
  Write-Host 'TRAY_STARTUP_OK: início oculto e abertura manual restaurando a mesma instância.'
} finally {
  if ($process -and !$process.HasExited) { Stop-Process -Id $process.Id -Force }
  if ($null -ne $original) { [IO.File]::WriteAllBytes($prefs, $original) }
  else { Remove-Item $prefs -ErrorAction SilentlyContinue }
}
