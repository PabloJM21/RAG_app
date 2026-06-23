#!/bin/bash

# Replace all imports starting with "@/something" EXCEPT "@/api"
# Pattern explanation:
#   - Find "@/X" where X is NOT "api"
#   - Replace with "@/../X"
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 \
  | xargs -0 sed -i -E 's|@/([^a][^p][^i][^/][^/]*)|@/../\1|g'

echo "✔️ Alle '@/...'-Imports (außer '@/api') wurden zu '@/../...' umgeschrieben."
