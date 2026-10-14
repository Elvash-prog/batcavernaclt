@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto prerequisites
where cargo >nul 2>nul
if errorlevel 1 goto prerequisites
call npm install
if errorlevel 1 goto failed
call npm test
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
explorer "src-tauri\target\release\bundle\nsis"
echo Instalador gerado na pasta aberta.
pause
exit /b 0
:prerequisites
echo Instale Node.js LTS, Rust MSVC e Visual Studio Build Tools com Desktop development with C++.
pause
exit /b 1
:failed
echo A compilacao falhou. Copie a mensagem de erro acima para revisao.
pause
exit /b 1
