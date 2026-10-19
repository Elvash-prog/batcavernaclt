; Preserve an existing opt-in during manual or automatic upgrades.
Var BatCavernaStartupCommand
!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $BatCavernaStartupCommand HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "BatCavernaCLT"
!macroend
!macro NSIS_HOOK_POSTINSTALL
  ${If} $BatCavernaStartupCommand != ""
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "BatCavernaCLT" '"$INSTDIR\${MAINBINARYNAME}.exe" --autostart'
  ${EndIf}
!macroend
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "BatCavernaCLT"
  ${EndIf}
!macroend
