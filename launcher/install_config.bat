@echo off
setlocal

:: Check if arguments are provided
if "%~1"=="" (
    echo ERROR: No target folder provided
    exit /b 1
)

if "%~2"=="" (
    echo ERROR: No source file provided
    exit /b 1
)

:: Set paths from arguments
set "targetFolder=%~1"
set "sourceFile=%~2"
set "fileName=local.json"
set "targetPath=%targetFolder%\ui\config"
set "targetFile=%targetPath%\%fileName%"

:: Check if source file exists
if not exist "%sourceFile%" (
    echo ERROR: Source file does not exist: %sourceFile%
    exit /b 2
)

:: Check if target folder exists
if not exist "%targetFolder%" (
    echo ERROR: Target folder does not exist: %targetFolder%
    exit /b 3
)

:: Create the ui\config folder if it doesn't exist
if not exist "%targetPath%" (
    mkdir "%targetPath%" 2>nul
    if errorlevel 1 (
        echo ERROR: Failed to create directory: %targetPath%
        exit /b 4
    )
)

:: Copy the JSON file to the target location
copy /Y "%sourceFile%" "%targetFile%" >nul 2>&1

if errorlevel 1 (
    echo ERROR: Failed to copy file to: %targetFile%
    exit /b 5
)

:: Verify the file was copied
if not exist "%targetFile%" (
    echo ERROR: File was not created: %targetFile%
    exit /b 6
)

echo SUCCESS: JSON file copied to: %targetFile%
exit /b 0
