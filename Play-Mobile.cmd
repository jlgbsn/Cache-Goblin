@echo off
cd /d "%~dp0"
echo Starting Cache Goblin for devices on your Wi-Fi.
node serve.cjs --lan
pause
