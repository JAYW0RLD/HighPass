#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

GATEWAY_URL="http://localhost:3000/gatekeeper/resource"
AGENT_ID="12399"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  📡 Sending Request to Gateway"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Agent ID: ${AGENT_ID}"
echo "Endpoint: ${GATEWAY_URL}"
echo ""
echo "➡️  Making request..."
echo ""

# Make the request and capture response
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "X-Agent-ID: ${AGENT_ID}" \
  "${GATEWAY_URL}")

# Extract status code
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

# Display result based on status
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS: 200 OK${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    
    # Check if optimistic
    if echo "$BODY" | grep -q "optimistic"; then
        echo ""
        echo -e "${YELLOW}💳 OPTIMISTIC PAYMENT${NC}"
        echo "Data delivered immediately - debt recorded!"
    fi
    
elif [ "$HTTP_STATUS" = "402" ]; then
    echo -e "${YELLOW}⚠️  402 PAYMENT REQUIRED${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${YELLOW}💰 Outstanding debt must be paid!${NC}"
    
elif [ "$HTTP_STATUS" = "403" ]; then
    echo -e "${RED}🚫 403 FORBIDDEN${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${RED}⛔ Access denied - reputation too low!${NC}"
    
else
    echo -e "${RED}❌ Unexpected status: ${HTTP_STATUS}${NC}"
    echo ""
    echo "$BODY"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 Check dashboard at http://localhost:5174"
echo "════════════════════════════════════════════════════════════"
echo ""
