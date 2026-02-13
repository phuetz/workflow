#!/bin/bash
# React Memory Leak Detection Script
# Automatically scans for common React memory leak patterns

set -e

REPORT_FILE="react-leaks-report.txt"
SRC_DIR="src"

echo "==================================================================="
echo "    REACT MEMORY LEAK DETECTION TOOL"
echo "==================================================================="
echo ""
echo "Scanning directory: $SRC_DIR"
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Initialize report
cat > $REPORT_FILE << 'HEADER'
REACT MEMORY LEAK DETECTION REPORT
Generated: $(date)
=================================================================

HEADER

# Function to check useEffect without cleanup
check_useeffect_cleanup() {
    echo "1. Checking useEffect without cleanup functions..."
    echo "" >> $REPORT_FILE
    echo "1. USEEFFECT WITHOUT CLEANUP" >> $REPORT_FILE
    echo "==============================" >> $REPORT_FILE

    local count=0
    while IFS= read -r file; do
        if grep -q "useEffect" "$file"; then
            total=$(grep -c "useEffect" "$file" 2>/dev/null || echo "0")
            cleanup=$(grep -A 15 "useEffect" "$file" | grep -c "return () =>" 2>/dev/null || echo "0")

            if [ "$total" -gt "$cleanup" ]; then
                leaks=$((total - cleanup))
                echo "  ⚠️  $file: $leaks potential leak(s)" >> $REPORT_FILE
                grep -n "useEffect" "$file" | head -3 >> $REPORT_FILE
                echo "" >> $REPORT_FILE
                count=$((count + 1))
            fi
        fi
    done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.ts")

    echo "  Found: $count files with potential useEffect leaks"
    echo "  Total: $count files" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
}

# Function to check event listeners
check_event_listeners() {
    echo "2. Checking addEventListener without removeEventListener..."
    echo "" >> $REPORT_FILE
    echo "2. EVENT LISTENERS WITHOUT CLEANUP" >> $REPORT_FILE
    echo "====================================" >> $REPORT_FILE

    local count=0
    while IFS= read -r file; do
        add_count=$(grep -c "addEventListener" "$file" 2>/dev/null || echo "0")
        remove_count=$(grep -c "removeEventListener" "$file" 2>/dev/null || echo "0")

        if [ "$add_count" -gt 0 ] && [ "$add_count" -gt "$remove_count" ]; then
            echo "  ⚠️  $file: $add_count add, $remove_count remove" >> $REPORT_FILE
            grep -n "addEventListener" "$file" | head -3 >> $REPORT_FILE
            echo "" >> $REPORT_FILE
            count=$((count + 1))
        fi
    done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.ts")

    echo "  Found: $count files with event listener leaks"
    echo "  Total: $count files" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
}

# Function to check timers
check_timers() {
    echo "3. Checking setTimeout/setInterval without cleanup..."
    echo "" >> $REPORT_FILE
    echo "3. TIMERS/INTERVALS WITHOUT CLEANUP" >> $REPORT_FILE
    echo "=====================================" >> $REPORT_FILE

    local count=0
    while IFS= read -r file; do
        timeout_count=$(grep -c "setTimeout" "$file" 2>/dev/null || echo "0")
        interval_count=$(grep -c "setInterval" "$file" 2>/dev/null || echo "0")
        clear_count=$(grep -c "clearTimeout\|clearInterval" "$file" 2>/dev/null || echo "0")

        total_timers=$((timeout_count + interval_count))

        if [ "$total_timers" -gt 0 ] && [ "$total_timers" -gt "$clear_count" ]; then
            echo "  ⚠️  $file: $total_timers timer(s), $clear_count clear(s)" >> $REPORT_FILE
            grep -n "setTimeout\|setInterval" "$file" | head -3 >> $REPORT_FILE
            echo "" >> $REPORT_FILE
            count=$((count + 1))
        fi
    done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.ts")

    echo "  Found: $count files with timer leaks"
    echo "  Total: $count files" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
}

# Function to check React.memo usage
check_react_memo() {
    echo "4. Checking React.memo usage..."
    echo "" >> $REPORT_FILE
    echo "4. REACT.MEMO USAGE" >> $REPORT_FILE
    echo "====================" >> $REPORT_FILE

    total_components=$(find "$SRC_DIR/components" -name "*.tsx" 2>/dev/null | wc -l)
    memo_components=$(grep -r "React.memo\|memo(" "$SRC_DIR/components" --include="*.tsx" 2>/dev/null | wc -l)
    no_memo=$((total_components - memo_components))

    echo "  Total components: $total_components" >> $REPORT_FILE
    echo "  With React.memo: $memo_components" >> $REPORT_FILE
    echo "  ⚠️  WITHOUT React.memo: $no_memo" >> $REPORT_FILE
    echo "" >> $REPORT_FILE

    echo "  Total: $total_components components, $no_memo without memo"
}

# Function to check subscriptions
check_subscriptions() {
    echo "5. Checking subscriptions without cleanup..."
    echo "" >> $REPORT_FILE
    echo "5. SUBSCRIPTIONS WITHOUT CLEANUP" >> $REPORT_FILE
    echo "=================================" >> $REPORT_FILE

    local count=0
    while IFS= read -r file; do
        sub_count=$(grep -c "\.subscribe\|\.on(" "$file" 2>/dev/null || echo "0")
        unsub_count=$(grep -c "\.unsubscribe\|\.off(" "$file" 2>/dev/null || echo "0")

        if [ "$sub_count" -gt 0 ] && [ "$sub_count" -gt "$unsub_count" ]; then
            echo "  ⚠️  $file: $sub_count subscribe, $unsub_count unsubscribe" >> $REPORT_FILE
            grep -n "\.subscribe\|\.on(" "$file" | head -3 >> $REPORT_FILE
            echo "" >> $REPORT_FILE
            count=$((count + 1))
        fi
    done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.ts")

    echo "  Found: $count files with subscription leaks"
    echo "  Total: $count files" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
}

# Function to check Monaco editor disposal
check_monaco_disposal() {
    echo "6. Checking Monaco editor disposal..."
    echo "" >> $REPORT_FILE
    echo "6. MONACO EDITOR DISPOSAL" >> $REPORT_FILE
    echo "==========================" >> $REPORT_FILE

    local count=0
    while IFS= read -r file; do
        if grep -q "monaco-editor" "$file" || grep -q "@monaco-editor" "$file"; then
            has_dispose=$(grep -c "\.dispose()" "$file" 2>/dev/null || echo "0")

            if [ "$has_dispose" -eq 0 ]; then
                echo "  ⚠️  $file: Monaco editor without disposal" >> $REPORT_FILE
                grep -n "monaco\|Monaco" "$file" | head -3 >> $REPORT_FILE
                echo "" >> $REPORT_FILE
                count=$((count + 1))
            fi
        fi
    done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.ts")

    echo "  Found: $count files with Monaco without disposal"
    echo "  Total: $count files" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
}

# Run all checks
check_useeffect_cleanup
check_event_listeners
check_timers
check_react_memo
check_subscriptions
check_monaco_disposal

# Summary
echo "" >> $REPORT_FILE
echo "==================================================================" >> $REPORT_FILE
echo "SUMMARY" >> $REPORT_FILE
echo "==================================================================" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Scan completed: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "NEXT STEPS:" >> $REPORT_FILE
echo "1. Review each file listed above" >> $REPORT_FILE
echo "2. Add cleanup functions to useEffect hooks" >> $REPORT_FILE
echo "3. Remove event listeners on unmount" >> $REPORT_FILE
echo "4. Clear timers/intervals on cleanup" >> $REPORT_FILE
echo "5. Add React.memo to heavy components" >> $REPORT_FILE
echo "6. Unsubscribe from observables/services" >> $REPORT_FILE
echo "7. Dispose Monaco editor instances" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "See AUDIT_REACT_PERFORMANCE_100.md for detailed fix guide." >> $REPORT_FILE

echo ""
echo "==================================================================="
echo "Scan complete! Report saved to: $REPORT_FILE"
echo "==================================================================="
echo ""
echo "Quick Stats:"
grep "Total:" $REPORT_FILE | head -6
echo ""
echo "Review the full report for details and line numbers."
