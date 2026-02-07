@echo off
echo Syncing with GitHub...
git add .
set /p commit_msg="Enter commit message (default: Auto-sync): " || set commit_msg=Auto-sync
git commit -m "%commit_msg%"
git push origin main
echo Done!
pause
