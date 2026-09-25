@echo off
title Donkey & Uno Multiplayer Server (Port 3001)
cd /d "%~dp0server"
echo ==============================================
echo Starting Donkey Master & Uno No Mercy Server
echo Running on http://localhost:3001
echo ==============================================
node dist\index.js
pause
