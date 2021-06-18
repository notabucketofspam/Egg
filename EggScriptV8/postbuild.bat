@ECHO OFF
FOR %%I IN (.) DO SET _currentDirectory=%%~nxI
ROBOCOPY /IS build\\%_currentDirectory%\\source final > nul
EXIT 0
