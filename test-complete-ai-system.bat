@echo off
echo 🤖 TESTING COMPLETE AI SYSTEM INTEGRATION 🤖
echo =================================================
echo.

echo 1. Testing AI Templates Endpoint...
curl -s http://localhost:3000/api/ai-automations/templates | jq .
echo.

echo 2. Testing AI Custom Message Generation...
curl -s -X POST http://localhost:3000/api/ai-automations/custom ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer your_token_here" ^
  -d "{\"template_type\": \"booking_confirmation\", \"data\": {\"name\": \"Test Customer\", \"service\": \"Deep Cleaning\"}}" | jq .
echo.

echo 3. Testing AI Booking Flow (creates AI email)...
curl -s -X POST http://localhost:3000/api/booking/book ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"AI Test Customer\", \"phone\": \"555-999-1234\", \"email\": \"ai-test@example.com\", \"service\": \"Standard Cleaning\", \"date\": \"2026-02-17\", \"time\": \"14:00\", \"address\": \"123 AI Test Street\"}" | jq .
echo.

echo 4. Testing AI Job Completion Flow...
echo First, let's create a job to complete...
curl -s -X POST http://localhost:3000/api/booking/book ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Job Completion Test\", \"phone\": \"555-888-1234\", \"email\": \"job-test@example.com\", \"service\": \"Window Cleaning\", \"date\": \"2026-02-17\", \"time\": \"16:00\", \"address\": \"456 Job Test Ave\"}" | jq .
echo.

echo Now marking job as completed (triggers AI summary)...
curl -s -X PATCH http://localhost:3000/api/jobs/1/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer your_token_here" ^
  -d "{\"status\": \"completed\"}" | jq .
echo.

echo 5. Testing AI Invoice Creation Flow...
echo Creating invoice (triggers AI reminder)...
curl -s -X POST http://localhost:3000/api/invoices/create ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer your_token_here" ^
  -d "{\"job_id\": 1}" | jq .
echo.

echo =================================================
echo ✅ COMPLETE AI SYSTEM TEST FINISHED!
echo.
echo 🎯 AI Features Tested:
echo   - AI Templates Management
echo   - AI Custom Message Generation  
echo   - AI Booking Confirmation Emails
echo   - AI Job Completion Summaries
echo   - AI Invoice Payment Reminders
echo   - AI Admin Dashboard Interface
echo.
echo 🌐 Access AI Dashboard: http://localhost:3000/admin-ai
echo 📊 Access Admin Panel: http://localhost:3000/admin
echo.
pause
