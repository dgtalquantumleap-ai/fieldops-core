@echo off
echo Testing AI-Powered Booking Creation...
echo.

curl -X POST http://localhost:3000/api/booking/book ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Sarah Johnson\", \"phone\": \"555-123-4567\", \"email\": \"sarah@example.com\", \"service\": \"Standard Cleaning\", \"date\": \"2025-02-20\", \"time\": \"10:00 AM\", \"address\": \"789 Business Ave, Suite 100\"}"
echo.
echo.
echo ✅ Booking created with AI-generated confirmation email!
echo Check your email for the AI-generated message.
echo.
pause
