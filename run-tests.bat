@echo off
echo ========================================
echo TEST 1: Career Frustration (English)
echo ========================================
echo.
curl -X POST http://localhost:3001/api/chat/message -H "Content-Type: application/json" -d @test-1.json
echo.
echo.
timeout /t 3 /nobreak > nul

echo ========================================
echo TEST 2: Anxiety Before Presentation
echo ========================================
echo.
curl -X POST http://localhost:3001/api/chat/message -H "Content-Type: application/json" -d @test-2.json
echo.
echo.
timeout /t 3 /nobreak > nul

echo ========================================
echo TEST 3: Life Purpose (Hindi)
echo ========================================
echo.
curl -X POST http://localhost:3001/api/chat/message -H "Content-Type: application/json" -d @test-3.json
echo.
echo.
timeout /t 3 /nobreak > nul

echo ========================================
echo TEST 4: Family Conflict (Marathi)
echo ========================================
echo.
curl -X POST http://localhost:3001/api/chat/message -H "Content-Type: application/json" -d @test-4.json
echo.
echo.

echo ========================================
echo ALL TESTS COMPLETED!
echo ========================================
pause
