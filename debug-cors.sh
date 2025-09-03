#!/bin/bash
# CORS Debug Script for EC2 Deployment

echo "🔍 HPA CORS Debug Script"
echo "========================"

# Variables
FRONTEND_URL="http://ec2-16-171-171-146.eu-north-1.compute.amazonaws.com"
BACKEND_URL="http://ec2-16-171-171-146.eu-north-1.compute.amazonaws.com:8080"
API_ENDPOINT="/api/v1/tenants/user"

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# 1. Test backend health
echo "1️⃣ Testing backend health..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BACKEND_URL/health" || echo "❌ Backend not reachable"
echo ""

# 2. Test CORS preflight
echo "2️⃣ Testing CORS preflight..."
curl -X OPTIONS "$BACKEND_URL$API_ENDPOINT" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(Access-Control|HTTP|Origin)" || echo "❌ No CORS headers found"
echo ""

# 3. Test actual request
echo "3️⃣ Testing actual GET request..."
curl -X GET "$BACKEND_URL$API_ENDPOINT" \
  -H "Origin: $FRONTEND_URL" \
  -v 2>&1 | grep -E "(Access-Control|HTTP|Origin)" || echo "❌ Request failed"
echo ""

# 4. Check if backend is running
echo "4️⃣ Checking backend process..."
if pgrep -f "hpa-backend" > /dev/null; then
    echo "✅ Backend process is running"
    echo "Process details:"
    ps aux | grep hpa-backend | grep -v grep
else
    echo "❌ Backend process not found"
fi
echo ""

# 5. Check backend logs
echo "5️⃣ Recent backend logs..."
if systemctl is-active --quiet hpa-backend; then
    echo "✅ Backend service is active"
    echo "Recent logs:"
    journalctl -u hpa-backend --no-pager -n 10
else
    echo "❌ Backend service not active"
fi
echo ""

# 6. Environment check
echo "6️⃣ Environment variables..."
if [ -f "/home/ubuntu/.env" ]; then
    echo "✅ .env file exists"
    grep -E "CORS|SERVER" /home/ubuntu/.env | head -5
else
    echo "❌ No .env file found"
fi

echo ""
echo "🔧 Quick Fixes:"
echo "1. Restart backend: sudo systemctl restart hpa-backend"
echo "2. Check logs: sudo journalctl -u hpa-backend -f"
echo "3. Test CORS: Run this script again"