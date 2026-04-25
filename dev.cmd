@echo off
REM Local dev launcher that bypasses pnpm/Corepack on Windows.
REM On Manuel's machine, `pnpm dev` ends up routing through WSL bash
REM because WSL's bash.exe sits on PATH ahead of Windows node, and
REM pnpm 10.x picks it up regardless of script-shell config. Calling
REM node directly via cmd.exe avoids the bridge entirely.
REM
REM Usage from PowerShell: .\dev.cmd
node node_modules\next\dist\bin\next dev %*
