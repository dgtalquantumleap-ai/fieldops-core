@echo off
echo Testing AI Booking Email Generation...
curl -X POST http://localhost:3000/api/ai-test/booking-email ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"John Doe\", \"email\": \"john@example.com\", \"service\": \"Deep Cleaning\", \"date\": \"2025-02-20\", \"time\": \"2:00 PM\", \"address\": \"123 Main Street, NYC\"}"
echo.
echo Testing AI Job Summary Generation...
curl -X POST http://localhost:3000/api/ai-test/job-summary ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\": \"Jane Smith\", \"service_name\": \"Window Cleaning\", \"address\": \"456 Oak Ave\", \"duration\": 90}"
echo.
echo Testing AI Invoice Reminder Generation...
curl -X POST http://localhost:3000/api/ai-test/invoice-reminder ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\": \"Bob Johnson\", \"invoice_number\": \"INV-2025-001\", \"amount\": \"250.00\", \"due_date\": \"2025-02-27\"}"
echo.
echo All AI tests completed!
