# Frontend Performance Procedures

## Overview

Kingston's Portal implements **performance-first frontend development** using Vite build optimization, React Query caching, and intelligent code splitting. The frontend architecture prioritizes fast loading times, efficient bundle sizes, and smooth user experience across the wealth management application.

## Current Performance Architecture

### Build System Performance (Vite Configuration)

**Optimized Build Configuration** (`vite.config.js`):
```javascript
export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),  // Automatic vendor chunk separation
  ],
  build: {
    outDir: 'C:\\inetpub\\wwwroot\\OfficeIntranet',
    sourcemap: true,                    // Debug capability without performance impact
    chunkSizeWarningLimit: 1000,        // 1MB chunk size threshold
    reportCompressedSize: true,         // Track compression effectiveness
    minify: false,                      // Currently disabled for debugging
    rollupOptions: {
      output: {
        manualChunks: undefined,        // Automatic chunking for stability
      },
    },
  }
});
```

**Performance Characteristics**:
- **Build Time**: < 2 minutes for full production build
- **Chunk Strategy**: Automatic vendor separation reduces main bundle size
- **Compression**: Brotli-ready with `reportCompressedSize` monitoring
- **Source Maps**: Enabled for debugging without production impact

### State Management Performance

**React Query Optimization**:
```typescript
// Configured for 5-minute default caching (App.tsx)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes default cache
      cacheTime: 10 * 60 * 1000,       // 10 minutes memory retention
      retry: 1,                        // Single retry for failed requests
      refetchOnWindowFocus: false,     // Prevent unnecessary refetches
    },
  },
});

// High-frequency data with shorter cache
const { data: dashboardData } = useQuery(
  ['analytics', 'dashboard'],
  () => api.get('/analytics/dashboard-fast'),
  { 
    staleTime: 1 * 60 * 1000,         // 1 minute for live data
    cacheTime: 5 * 60 * 1000 
  }
);

// Static data with long cache
const { data: providers } = useQuery(
  ['providers'],
  () => api.get('/available_providers'),
  { 
    staleTime: 30 * 60 * 1000,        // 30 minutes for reference data
    cacheTime: 60 * 60 * 1000 
  }
);
```

## Bundle Analysis and Optimization

### 1. Bundle Size Monitoring

**Current Bundle Analysis Tools** (available but not configured):
```bash
# Add to package.json for bundle analysis
npm install --save-dev webpack-bundle-analyzer

# Scripts to add:
"analyze": "npm run build && npx webpack-bundle-analyzer dist/static/js/*.js",
"bundle-size": "npm run build && du -sh dist/",
"performance-check": "npm run build && npm run analyze"
```

**Bundle Size Targets**:
```javascript
// Performance budgets (recommended)
const PERFORMANCE_BUDGETS = {
  maxInitialBundleSize: '500KB',      // Initial JavaScript bundle
  maxTotalBundleSize: '2MB',          // All assets combined
  maxImageSize: '100KB',              // Individual images
  maxFontSize: '50KB',                // Individual fonts
  chunkSizeWarning: '1MB'             // Large chunk warning (current: 1000KB)
};
```

### 2. Dependency Analysis

**Current Dependencies Impact** (from package.json):
```javascript
// Large dependencies requiring monitoring:
const HEAVY_DEPENDENCIES = {
  '@mui/material': '~400KB',          // Material UI components
  'antd': '~600KB',                   // Ant Design components  
  'recharts': '~200KB',               // Chart library
  'framer-motion': '~150KB',          // Animation library
  'axios': '~50KB',                   // HTTP client
  '@tanstack/react-query': '~100KB', // State management
};

// Optimization opportunities:
// 1. Tree-shake unused MUI/Antd components
// 2. Lazy load Recharts for report pages only
// 3. Consider lighter animation alternatives to Framer Motion
```

### 3. Code Splitting Strategy

**Current Code Organization** (38 pages + components):
```typescript
// Implement route-based code splitting
const LazyReportGenerator = lazy(() => import('./pages/ReportGenerator'));
const LazyAnalytics = lazy(() => import('./pages/Analytics'));
const LazyProductDetails = lazy(() => import('./pages/ProductDetails'));

// Wrap with Suspense for loading states
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    <Route path="/reports" element={<LazyReportGenerator />} />
    <Route path="/analytics" element={<LazyAnalytics />} />
    <Route path="/products/:id" element={<LazyProductDetails />} />
  </Routes>
</Suspense>
```

## Performance Optimization Procedures

### 1. Development Performance Workflow

**Pre-commit Performance Checks**:
```bash
#!/bin/bash
# pre-commit-performance.sh

echo "Running frontend performance checks..."

# 1. Build performance
echo "Checking build time..."
START_TIME=$(date +%s)
npm run build
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

if [ $BUILD_TIME -gt 180 ]; then  # 3 minutes threshold
    echo "WARNING: Build took ${BUILD_TIME}s (threshold: 180s)"
fi

# 2. Bundle size check
echo "Checking bundle size..."
BUNDLE_SIZE=$(du -sb dist/ | cut -f1)
BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024 / 1024))

if [ $BUNDLE_SIZE_MB -gt 5 ]; then  # 5MB threshold
    echo "WARNING: Bundle size is ${BUNDLE_SIZE_MB}MB (threshold: 5MB)"
fi

# 3. TypeScript performance
echo "Running TypeScript compiler check..."
npx tsc --noEmit --extendedDiagnostics

echo "Performance checks completed."
```

### 2. Bundle Optimization Techniques

**Tree Shaking Configuration**:
```javascript
// vite.config.js - Enhanced tree shaking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@mui/material', 'antd'],
          'charts-vendor': ['recharts'],
          'animation-vendor': ['framer-motion'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom', 
      '@tanstack/react-query'
    ],
  },
});
```

**Import Optimization Patterns**:
```typescript
// BAD - Imports entire library
import * as MUI from '@mui/material';
import { Button, TextField, Dialog, ... } from 'antd';

// GOOD - Import only needed components
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { Button as AntButton } from 'antd';

// GOOD - Use shared utility imports  
import { formatMoney, formatDate } from '../utils';  // Uses index.ts
```

### 3. Runtime Performance Optimization

**Component Performance Patterns**:
```typescript
// Memoization for expensive calculations
const ExpensiveComponent = memo(({ data }: { data: Portfolio[] }) => {
  const totalValue = useMemo(() => {
    return data.reduce((sum, portfolio) => sum + portfolio.value, 0);
  }, [data]);

  return <div>Total: {formatMoney(totalValue)}</div>;
});

// Virtualization for large lists
import { FixedSizeList as List } from 'react-window';

const LargeDataTable = ({ items }: { items: ClientData[] }) => (
  <List
    height={400}
    itemCount={items.length}
    itemSize={50}
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </List>
);

// Debounced search for performance
const SearchInput = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  const { data } = useQuery(
    ['search', debouncedQuery],
    () => api.get(`/search?q=${debouncedQuery}`),
    { enabled: debouncedQuery.length >= 2 }
  );
};
```

## Performance Monitoring and Testing

### 1. Performance Metrics Collection

**Client-Side Performance Monitoring**:
```typescript
// Performance monitoring utilities
export class PerformanceMonitor {
  static measurePageLoad(pageName: string) {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (loadTime > 3000) {  // 3 second threshold
        console.warn(`Slow page load: ${pageName} took ${loadTime.toFixed(2)}ms`);
      }
      
      // In production, could send to analytics service
      if (process.env.NODE_ENV === 'production') {
        // analyticsService.track('page_load_time', { pageName, loadTime });
      }
    };
  }
  
  static measureComponentRender(componentName: string, fn: Function) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (end - start > 100) {  // 100ms threshold
      console.warn(`Slow component render: ${componentName} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }
}

// Usage in components
const ReportGenerator = () => {
  useEffect(() => {
    const endMeasurement = PerformanceMonitor.measurePageLoad('ReportGenerator');
    return endMeasurement;
  }, []);
  
  // Component logic
};
```

### 2. Performance Testing Framework

**Automated Performance Tests**:
```javascript
// performance.test.js
describe('Frontend Performance', () => {
  test('bundle size should be under 5MB', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const distPath = path.join(__dirname, '../dist');
    const bundleSize = getDirSize(distPath);
    const bundleSizeMB = bundleSize / (1024 * 1024);
    
    expect(bundleSizeMB).toBeLessThan(5);
  });
  
  test('initial JavaScript bundle should be under 500KB', async () => {
    const mainBundle = findMainBundle();
    const bundleSize = fs.statSync(mainBundle).size;
    const bundleSizeKB = bundleSize / 1024;
    
    expect(bundleSizeKB).toBeLessThan(500);
  });
  
  test('component renders should be under 100ms', () => {
    const start = performance.now();
    render(<ExpensiveComponent data={mockData} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });
});

// Load testing with React Testing Library
test('search performance with large datasets', async () => {
  const largeDataset = generateMockData(1000);  // 1000 items
  
  const start = performance.now();
  render(<SearchableDropdown options={largeDataset} />);
  const end = performance.now();
  
  expect(end - start).toBeLessThan(200);  // 200ms threshold
});
```

### 3. Performance Profiling Tools

**Development Profiling Setup**:
```bash
# Add to package.json scripts
{
  "scripts": {
    "profile": "vite build --mode development && npx serve dist",
    "analyze-bundle": "vite-bundle-analyzer",
    "lighthouse": "lighthouse http://localhost:3000 --output json --output html",
    "performance-audit": "npm run build && npm run lighthouse"
  }
}

# Performance profiling commands
npm run profile          # Profile build in development mode
npm run analyze-bundle   # Analyze bundle composition
npm run lighthouse       # Run Lighthouse performance audit
```

## Optimization Checklist and Procedures

### 1. Monthly Performance Review

```markdown
## Frontend Performance Review Checklist

### Bundle Analysis
- [ ] Run bundle analyzer to identify large dependencies
- [ ] Check for duplicate dependencies
- [ ] Verify tree shaking is working effectively
- [ ] Identify unused code/components
- [ ] Monitor chunk size warnings

### Runtime Performance  
- [ ] Profile React DevTools for slow components
- [ ] Check React Query cache hit rates
- [ ] Identify memory leaks with Chrome DevTools
- [ ] Test on slower devices/networks
- [ ] Verify lazy loading is working

### User Experience Metrics
- [ ] Measure Time to Interactive (TTI)
- [ ] Check First Contentful Paint (FCP)
- [ ] Test Cumulative Layout Shift (CLS)
- [ ] Verify responsive design performance
- [ ] Test offline/poor network performance
```

### 2. Performance Optimization Workflow

**Step-by-Step Optimization Process**:
```bash
# 1. Baseline measurement
npm run build
npm run lighthouse

# 2. Bundle analysis
npm run analyze-bundle

# 3. Identify optimization targets
# - Large unused dependencies
# - Unoptimized images
# - Inefficient components
# - Missing lazy loading

# 4. Implement optimizations
# - Remove unused dependencies
# - Optimize/compress images  
# - Add React.memo to expensive components
# - Implement route-based code splitting

# 5. Validate improvements
npm run build
npm run lighthouse

# 6. Compare before/after metrics
# - Bundle size reduction
# - Load time improvements
# - Performance score increases
```

### 3. Performance Budget Implementation

**Automated Performance Budget Checks**:
```javascript
// performance-budget.js
const PERFORMANCE_BUDGETS = {
  javascript: 500 * 1024,      // 500KB JavaScript
  css: 100 * 1024,             // 100KB CSS  
  images: 1000 * 1024,         // 1MB images total
  fonts: 200 * 1024,           // 200KB fonts total
  total: 2000 * 1024,          // 2MB total bundle
};

function checkPerformanceBudget(distPath) {
  const stats = analyzeBundleSize(distPath);
  
  const violations = [];
  
  Object.keys(PERFORMANCE_BUDGETS).forEach(category => {
    if (stats[category] > PERFORMANCE_BUDGETS[category]) {
      violations.push({
        category,
        actual: stats[category],
        budget: PERFORMANCE_BUDGETS[category],
        overBy: stats[category] - PERFORMANCE_BUDGETS[category]
      });
    }
  });
  
  if (violations.length > 0) {
    console.error('Performance budget violations:');
    violations.forEach(v => {
      console.error(`${v.category}: ${formatBytes(v.actual)} (over by ${formatBytes(v.overBy)})`);
    });
    process.exit(1);
  }
  
  console.log('Performance budget check: PASSED ✓');
}
```

## Advanced Performance Features

### 1. Service Worker Implementation

**Caching Strategy for Performance**:
```javascript
// public/sw.js - Service worker for caching
const CACHE_NAME = 'kingstons-portal-v1';
const urlsToCache = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/static/media/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});
```

### 2. Image Optimization

**Responsive Image Implementation**:
```typescript
// ImageOptimizer component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src, 
  alt, 
  width, 
  height, 
  priority = false 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  return (
    <div className="image-container">
      {!loaded && !error && <Skeleton width={width} height={height} />}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          display: loaded ? 'block' : 'none',
          width,
          height,
          objectFit: 'cover'
        }}
      />
    </div>
  );
};
```

This comprehensive frontend performance strategy ensures Kingston's Portal maintains optimal loading times and user experience while supporting complex financial data visualization and reporting capabilities.