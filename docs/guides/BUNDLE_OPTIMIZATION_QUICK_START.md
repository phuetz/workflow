# Bundle Optimization - Quick Start Guide

## Step-by-Step Implementation

### 1. Remove Unused Dependencies

```bash
# Remove unused frontend dependencies
npm uninstall \
  @codemirror/state \
  @codemirror/view \
  @langchain/community \
  buffer \
  crypto-browserify \
  crypto-js \
  dotenv \
  events \
  joi \
  jwt-decode \
  ml-matrix \
  process \
  socket.io-client \
  stream-browserify \
  util
```

### 2. Move TensorFlow to Optional Dependencies

Edit `package.json`:
```json
{
  "dependencies": {
    // Remove @tensorflow/tfjs from here
  },
  "optionalDependencies": {
    "@tensorflow/tfjs": "^4.22.0"
  }
}
```

### 3. Update Code to Use Lazy TensorFlow

Find all files importing TensorFlow:
```bash
grep -r "from '@tensorflow/tfjs'" src/
grep -r "import.*@tensorflow" src/
```

Replace with:
```typescript
// BEFORE
import * as tf from '@tensorflow/tfjs';

// AFTER
import { loadTensorFlow } from '@/utils/lazyTensorFlow';

// In async function:
const tf = await loadTensorFlow();
```

### 4. Build and Analyze

```bash
# Clean build
rm -rf dist node_modules/.cache

# Install dependencies
npm install

# Build for production
npm run build

# Check bundle sizes
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Open visualizer
open dist/stats.html
```

### 5. Performance Testing

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000 \
  --output html \
  --output-path ./lighthouse-report.html

# Bundle analysis
npx bundlesize check
```

### 6. Monitor in Production

Add to `package.json`:
```json
{
  "bundlesize": [
    {
      "path": "./dist/assets/*.js",
      "maxSize": "500 KB"
    },
    {
      "path": "./dist/assets/main-*.js",
      "maxSize": "200 KB"
    }
  ]
}
```

Add to CI/CD:
```yaml
- name: Check Bundle Size
  run: npm run build && npx bundlesize
```

---

## Quick Verification

### Check Initial Bundle Size
```bash
# Main bundle should be < 200KB
du -h dist/assets/main-*.js

# All JS combined should be < 500KB initial load
du -ch dist/assets/*.js | tail -1
```

### Check Lazy Loading
```bash
# TensorFlow should be in separate chunk
ls -lh dist/assets/tensorflow-*.js

# Monaco should be in separate chunk
ls -lh dist/assets/monaco-*.js
```

### Lighthouse Targets
- Performance: >90
- FCP: <1.0s
- LCP: <2.0s
- TTI: <2.5s

---

## Troubleshooting

### Issue: Bundle still too large
```bash
# Find largest chunks
du -h dist/assets/*.js | sort -hr | head -10

# Analyze with visualizer
npx vite-bundle-visualizer
```

### Issue: Dependencies not tree-shaken
- Check package.json has `"sideEffects": false`
- Verify imports are named, not default
- Check Vite config has tree-shaking enabled

### Issue: Lazy loading not working
- Verify dynamic imports: `import('./module')`
- Check React.lazy() usage
- Ensure Suspense boundaries exist

---

**Quick Win Checklist**
- [ ] Remove 16 unused dependencies
- [ ] Lazy load TensorFlow
- [ ] Build and verify < 500KB
- [ ] Lighthouse score > 90
- [ ] Set up bundle monitoring
