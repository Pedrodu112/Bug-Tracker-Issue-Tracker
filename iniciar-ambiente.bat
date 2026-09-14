@echo off
set BASE=D:\Documentos\Documents\VScode\Van-Hellsing
set NODE=D:\Documentos\Documents\VScode\node-v24.21.0-win-x64
set PATH=%NODE%;%PATH%
start "Bug Tracker API" cmd /k "cd /d %BASE%\ppw_server && npm.cmd run start:dev"
start "Bug Tracker Frontend" cmd /k "cd /d %BASE%\ppw_client && npm.cmd run dev"
