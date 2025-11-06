@echo off
echo ================================
echo VS Code Extension Launch Helper
echo ================================
echo.
echo Current Directory: %CD%
echo.
echo Checking extension files...
if exist "package.json" (
    echo ✓ package.json found
) else (
    echo ✗ package.json missing
    goto :error
)

if exist "dist\extension.js" (
    echo ✓ dist\extension.js found
) else (
    echo ✗ Extension not compiled - running npm run compile...
    npm run compile
)

if exist ".vscode\launch.json" (
    echo ✓ launch.json found
) else (
    echo ✗ launch.json missing
    goto :error
)

echo.
echo All files present! Ready to launch extension.
echo.
echo INSTRUCTIONS:
echo 1. Make sure this terminal is in: Q:\src\Codex\vscode-extension
echo 2. Open VS Code: code .
echo 3. Press F5 to launch Extension Development Host
echo 4. Look for "Extension Development Host" window
echo 5. In that window, press Ctrl+Shift+P and type "Codex"
echo.
echo Current VS Code processes:
tasklist /FI "IMAGENAME eq Code.exe" 2>nul
echo.
pause
goto :end

:error
echo.
echo ERROR: Extension setup incomplete!
echo Please run this from Q:\src\Codex\vscode-extension directory
pause

:end