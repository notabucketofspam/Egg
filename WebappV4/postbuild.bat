@ECHO OFF
FOR %%I IN (.) DO SET _currentDirectory=%%~nxI
ROBOCOPY /IS build\%_currentDirectory%\source final > NUL
ROBOCOPY /IS build\Bus3\source final > NUL
EXIT 0
