#!/bin/bash

# 고양시 인조잔디구장 크롤러 테스트 스크립트

echo "========================================="
echo "🏟️  Joongsan Crawler Test"
echo "========================================="
echo ""

# 환경변수 확인
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Environment variables not set"
  echo "   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "✅ Environment variables OK"
echo ""

# Edge Function 엔드포인트 호출
ENDPOINT="$SUPABASE_URL/functions/v1/make-server-5231839f/crawl/joongsan-today"

echo "📡 Calling crawler endpoint..."
echo "   URL: $ENDPOINT"
echo ""

# ANON_KEY 대신 SERVICE_ROLE_KEY 사용 (테스트 시)
# 실제 운영에서는 ANON_KEY 사용 권장
RESPONSE=$(curl -s -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

echo "📥 Response:"
echo "$RESPONSE" | jq '.'

# 성공 여부 확인
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
  echo ""
  echo "========================================="
  echo "✅ Crawler test PASSED"
  
  TOTAL=$(echo "$RESPONSE" | jq -r '.data.totalParsed')
  UPSERTED=$(echo "$RESPONSE" | jq -r '.data.upserted')
  FAILED=$(echo "$RESPONSE" | jq -r '.data.failed')
  
  echo "   - Total parsed: $TOTAL"
  echo "   - Upserted: $UPSERTED"
  echo "   - Failed: $FAILED"
  echo "========================================="
  exit 0
else
  echo ""
  echo "========================================="
  echo "❌ Crawler test FAILED"
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo "   Error: $ERROR"
  echo "========================================="
  exit 1
fi
