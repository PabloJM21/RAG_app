#!/bin/bash

# Replace all "@/app/api" with "@/api" in every .ts and .tsx file
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 \
  | xargs -0 sed -i 's|@/app/api|@/api|g'

echo "✔️ Alle '@/app/api' wurden durch '@/api' ersetzt."
