# PowerShell script to test all 4 prompts
# Run this with: .\test-all-prompts.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST 1: Career Frustration (English)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$response1 = curl.exe -X POST http://localhost:3001/api/chat/message `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"I am feeling depressed. I have not been promoted in the last three years despite working hard. My colleagues who joined after me are getting ahead. I feel stuck and worthless.\", \"stream\": false}'

Write-Host $response1
Write-Host "`n`n"

Start-Sleep -Seconds 2

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST 2: Anxiety Before Presentation (English)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$response2 = curl.exe -X POST http://localhost:3001/api/chat/message `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"I have a big presentation tomorrow and I am so anxious I cannot sleep. What if I fail? What if everyone judges me? I keep thinking about all the things that could go wrong.\", \"stream\": false}'

Write-Host $response2
Write-Host "`n`n"

Start-Sleep -Seconds 2

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST 3: Life Purpose Confusion (Hindi)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$response3 = curl.exe -X POST http://localhost:3001/api/chat/message `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"मुझे समझ नहीं आ रहा कि मेरी जिंदगी का मकसद क्या है। मैं बस रोज़ काम करता हूं, घर आता हूं, सोता हूं। कोई खुशी नहीं है। मैं खोया हुआ महसूस करता हूं।\", \"stream\": false}'

Write-Host $response3
Write-Host "`n`n"

Start-Sleep -Seconds 2

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST 4: Family Conflict (Marathi)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$response4 = curl.exe -X POST http://localhost:3001/api/chat/message `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"माझ्या आई-वडिलांशी सतत भांडण होतं. ते माझ्या निर्णयांना समजत नाहीत. मला राग येतो पण मग अपराधी वाटतं. काय करू?\", \"stream\": false}'

Write-Host $response4
Write-Host "`n`n"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "ALL TESTS COMPLETED!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
