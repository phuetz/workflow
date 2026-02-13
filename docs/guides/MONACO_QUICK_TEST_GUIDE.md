# Monaco Editor Quick Test Guide

**Duration**: 5-10 minutes  
**For**: QA, Developers, Code Reviewers

---

## Pre-Test Setup

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open Chrome DevTools**:
   - Press F12
   - Go to "Performance" tab
   - Enable "Memory" checkbox

3. **Navigate to Expression Editor**:
   - Find any workflow with expression fields
   - Or use the Expression Editor component directly

---

## Test 1: Basic Functionality (2 min)

### Autocomplete Test
1. Click in expression editor
2. Type `$`
3. **Expected**: Autocomplete dropdown appears with context variables
4. Select `$json` from dropdown
5. **Expected**: `$json` is inserted into editor

**Result**: ✅ PASS / ❌ FAIL

---

### Syntax Highlighting Test
1. Type this expression: `{{ $json.email }}`
2. **Expected colors**:
   - `{{` and `}}` → Orange (delimiter)
   - `$json` → Green (context variable)
   - `.email` → Light blue (property)

**Result**: ✅ PASS / ❌ FAIL

---

### Test Panel Test
1. Enter expression: `{{ toUpperCase("hello") }}`
2. Look at "Test Result" panel below editor
3. **Expected**: Shows "HELLO"

**Result**: ✅ PASS / ❌ FAIL

---

## Test 2: Memory Leak Test (3 min)

### Setup
1. Open Chrome DevTools → Performance → Memory
2. Click "Record"

### Steps
1. Open expression editor (mount)
2. Wait 1 second
3. Close expression editor (unmount)
4. Repeat steps 1-3 ten times (10 mount/unmount cycles)
5. Click "Stop recording"

### Analysis
1. Look at the memory graph
2. Check if memory keeps growing or stabilizes

**Expected**:
- Memory should grow initially (first mount: ~15 MB)
- After 10 cycles: Should stay around 16-20 MB
- Graph should show "sawtooth" pattern (GC cleaning up)

**BAD** (indicates leak):
```
Memory: 15MB → 30MB → 45MB → 60MB → 75MB
(Linear growth, no GC)
```

**GOOD** (no leak):
```
Memory: 15MB → 16MB → 17MB → 16MB → 17MB
(Stable with GC cycles)
```

**Result**: ✅ PASS / ❌ FAIL

---

## Test 3: Console Warnings (1 min)

### Steps
1. Open Console tab in DevTools
2. Clear console (Cmd+K or Ctrl+K)
3. Mount and unmount editor 5 times
4. Check console for warnings

**Expected**: NO warnings like:
- ❌ "Cannot read property 'dispose' of undefined"
- ❌ "Language 'n8n-expression' already registered"
- ❌ "Memory leak detected"
- ❌ "Detached HTMLElement"

**Result**: ✅ PASS / ❌ FAIL

---

## Test 4: Re-mount Test (2 min)

### Steps
1. Open expression editor
2. Type some text: `{{ $json.test }}`
3. Verify autocomplete works
4. Close editor
5. Wait 3 seconds
6. Re-open editor
7. Type `$` again
8. Verify autocomplete still works

**Expected**:
- Autocomplete works after re-opening
- No errors in console
- Editor mounts normally

**Result**: ✅ PASS / ❌ FAIL

---

## Test 5: Rapid Mount/Unmount (1 min)

### Steps
1. Rapidly open and close editor 20 times (as fast as possible)
2. Check console for errors
3. Check if application still responsive

**Expected**:
- No crashes
- No console errors
- Application remains responsive

**Result**: ✅ PASS / ❌ FAIL

---

## Quick Visual Checklist

```
✅ Autocomplete appears when typing $
✅ Syntax highlighting colors are correct
✅ Test panel shows expression results
✅ Memory graph stabilizes (no continuous growth)
✅ No console warnings/errors
✅ Re-mount works correctly
✅ Rapid mount/unmount doesn't crash
```

---

## If Test Fails

### Autocomplete doesn't work
**Likely cause**: Completion provider not registered or disposed incorrectly

**Check**:
1. Browser console for errors
2. Verify `completionProviderRef` is set in code
3. Check `handleEditorDidMount` is called

**Fix**: Review lines 146-203 in ExpressionEditorMonaco.tsx

---

### Memory keeps growing
**Likely cause**: Dispose not being called

**Check**:
1. DevTools Memory Profiler
2. Look for "Detached" editor instances
3. Verify cleanup effect is running

**Fix**: Review lines 254-283 in ExpressionEditorMonaco.tsx

---

### Console warnings about language registration
**Likely cause**: Language registered multiple times

**Check**:
1. Console error message
2. Verify `languageRegisteredRef` logic

**Fix**: Review lines 55-66 in ExpressionEditorMonaco.tsx

---

### Editor doesn't mount
**Likely cause**: Dispose breaking mounting logic

**Check**:
1. Browser console errors
2. React error boundary messages
3. Network tab for loading issues

**Fix**: Check try-catch blocks in cleanup effect

---

## Advanced Memory Profiling (Optional)

### Using Chrome DevTools Memory Profiler

1. **Take heap snapshot before**:
   - Memory tab → Take snapshot
   - Name it "Before"

2. **Mount/Unmount 10 times**

3. **Take heap snapshot after**:
   - Memory tab → Take snapshot
   - Name it "After"

4. **Compare snapshots**:
   - Select "After" snapshot
   - Change view to "Comparison"
   - Look for objects with "Detached" status
   - Filter for "monaco" or "editor"

5. **Expected**:
   - No detached editor instances
   - No detached completion providers
   - Memory delta < 5 MB

---

## Report Template

Copy this to report results:

```
## Monaco Editor Test Results

**Date**: [DATE]
**Tester**: [NAME]
**Environment**: [Dev/Staging/Prod]

### Test Results
- [ ] Test 1: Basic Functionality
- [ ] Test 2: Memory Leak Test
- [ ] Test 3: Console Warnings
- [ ] Test 4: Re-mount Test
- [ ] Test 5: Rapid Mount/Unmount

### Memory Metrics
- Initial mount: [XX] MB
- After 10 cycles: [XX] MB
- Growth: [XX] MB

### Issues Found
[List any issues or "None"]

### Screenshots
[Attach memory graph screenshot if any issues]

### Overall Status
✅ PASS / ❌ FAIL

### Notes
[Any additional observations]
```

---

## Expected Test Duration

| Test | Duration | Priority |
|------|----------|----------|
| Test 1: Basic Functionality | 2 min | HIGH |
| Test 2: Memory Leak | 3 min | CRITICAL |
| Test 3: Console Warnings | 1 min | HIGH |
| Test 4: Re-mount | 2 min | MEDIUM |
| Test 5: Rapid Mount/Unmount | 1 min | MEDIUM |
| **Total** | **9 min** | - |

---

**Quick Pass Criteria**:
- All 5 tests pass
- Memory stays < 20 MB after 10 cycles
- No console errors/warnings
- Autocomplete works consistently

**Status**: Ready for testing
