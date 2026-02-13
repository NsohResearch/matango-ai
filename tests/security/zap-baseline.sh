#!/usr/bin/env bash
#
# ZAP Security Baseline Scan
#
# Runs OWASP ZAP baseline scan against the application.
# This is a passive scan that identifies common security issues.
#
# Prerequisites:
# - Docker installed and running
# - Application running at TARGET_URL
#
# Usage:
#   ./tests/security/zap-baseline.sh [TARGET_URL]
#
# Example:
#   ./tests/security/zap-baseline.sh http://localhost:3000
#

set -euo pipefail

# Configuration
TARGET_URL="\${1:-http://host.docker.internal:3000}"
REPORT_DIR="./tests/security/reports"
REPORT_FILE="zap-baseline-report.html"
ZAP_IMAGE="owasp/zap2docker-stable"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${YELLOW}=== OWASP ZAP Baseline Security Scan ===${NC}"
echo "Target: \${TARGET_URL}"
echo ""

# Create reports directory
mkdir -p "\${REPORT_DIR}"

# Pull latest ZAP image
echo -e "\${YELLOW}Pulling ZAP Docker image...\${NC}"
docker pull "\${ZAP_IMAGE}" || true

# Run ZAP baseline scan
echo -e "\${YELLOW}Running baseline scan...\${NC}"
echo ""

docker run --rm \\
  -v "\$(pwd)/\${REPORT_DIR}:/zap/wrk:rw" \\
  -t "\${ZAP_IMAGE}" \\
  zap-baseline.py \\
  -t "\${TARGET_URL}" \\
  -r "\${REPORT_FILE}" \\
  -I \\
  || SCAN_EXIT_CODE=\$?

# Check results
if [ "\${SCAN_EXIT_CODE:-0}" -eq 0 ]; then
  echo ""
  echo -e "\${GREEN}✓ Baseline scan completed successfully\${NC}"
  echo "No critical issues found."
elif [ "\${SCAN_EXIT_CODE:-0}" -eq 1 ]; then
  echo ""
  echo -e "\${YELLOW}⚠ Baseline scan completed with warnings\${NC}"
  echo "Some issues found - review the report."
else
  echo ""
  echo -e "\${RED}✗ Baseline scan found critical issues\${NC}"
  echo "Review the report for details."
fi

echo ""
echo "Report saved to: \${REPORT_DIR}/\${REPORT_FILE}"
echo ""

# Summary of common checks
echo -e "\${YELLOW}=== Security Checklist ===${NC}"
echo "The baseline scan checks for:"
echo "  • Missing security headers (CSP, X-Frame-Options, etc.)"
echo "  • Cookie security flags (HttpOnly, Secure, SameSite)"
echo "  • Information disclosure (server banners, stack traces)"
echo "  • Cross-Site Scripting (XSS) vulnerabilities"
echo "  • SQL Injection patterns"
echo "  • Insecure authentication patterns"
echo "  • CORS misconfigurations"
echo ""

exit "\${SCAN_EXIT_CODE:-0}"
