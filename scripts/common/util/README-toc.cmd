	@echo off
	REM call npm init
	REM call npm install markdown-toc
	
	@echo on
	call markdown-toc -i ..\..\..\README.md
	REM Note! Insert <!-- toc --> in the required position
		
	@echo on
	timeout /t 3 >nul
	REM pause