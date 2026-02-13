#!/bin/bash
# Clean Legacy Files Script
# Safely archives and removes legacy backup files

set -e

echo "=========================================="
echo "CLEAN LEGACY FILES"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create archive directory with timestamp
archive_dir=".archive/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$archive_dir"

echo "Archive directory: $archive_dir"
echo ""

# Find legacy files
legacy_patterns=(
    "*.BACKUP.*"
    "*.OLD.*"
    "*.NEW.*"
    "*.broken.*"
    "*.old"
    "*.backup"
)

total_files=0
total_size=0

for pattern in "${legacy_patterns[@]}"; do
    echo "Searching for: $pattern"

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Get file size
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
            total_size=$((total_size + size))

            # Check if file is referenced
            references=$(grep -r "$(basename "$file")" src/ 2>/dev/null | grep -v "Binary file" | wc -l || echo "0")

            if [ "$references" -gt 0 ]; then
                echo -e "${YELLOW}⚠️  SKIP: $file (referenced $references times)${NC}"
                continue
            fi

            # Move to archive
            dest="$archive_dir/$(dirname "$file")"
            mkdir -p "$dest"
            cp "$file" "$dest/"

            echo -e "${GREEN}✅ Archived: $file${NC}"
            total_files=$((total_files + 1))

            # Remove original
            rm "$file"
        fi
    done < <(find src -name "$pattern" 2>/dev/null)
done

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Files archived: $total_files"
echo "Space freed: $(numfmt --to=iec-i --suffix=B $total_size 2>/dev/null || echo "$total_size bytes")"
echo "Archive location: $archive_dir"
echo ""

if [ $total_files -gt 0 ]; then
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
    echo ""
    echo "To restore files if needed:"
    echo "  cp -r $archive_dir/* src/"
    echo ""
    echo "To permanently delete archive (after verification):"
    echo "  rm -rf $archive_dir"
else
    echo -e "${GREEN}✅ No legacy files found!${NC}"
    rmdir "$archive_dir" 2>/dev/null || true
    rmdir ".archive" 2>/dev/null || true
fi

echo ""
