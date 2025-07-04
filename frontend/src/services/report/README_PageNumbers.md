# Page Numbering in PrintService

The PrintService now supports configurable page numbering for printed reports. Page numbers appear automatically when printing through the react-to-print library in Chrome and other modern browsers.

## Features

- **Configurable Positioning**: Place page numbers in any corner or center of pages
- **Multiple Formats**: Simple "Page X", "Page X of Y", or custom formats
- **Chrome Optimized**: Uses CSS `@page` rules for native browser support
- **Fallback Support**: Includes CSS fallbacks for browsers with limited support

## Basic Usage

### Using the Hook (Recommended)

```typescript
import { usePrintService } from '../../hooks/report/usePrintService';

const MyComponent = () => {
  const { printReport, setPageNumbering } = usePrintService();
  const contentRef = useRef<HTMLDivElement>(null);

  // Configure page numbering
  useEffect(() => {
    setPageNumbering(true, 'bottom-right', 'page-only');
  }, [setPageNumbering]);

  const handlePrint = async () => {
    await printReport(contentRef);
  };

  return (
    <div>
      <button onClick={handlePrint}>Print Report</button>
      <div ref={contentRef}>
        {/* Your report content */}
      </div>
    </div>
  );
};
```

### Using the Service Directly

```typescript
import { PrintService } from '../../services/report/PrintService';

const printService = new PrintService();

// Enable page numbers (default: bottom-right, "Page X" format)
printService.enablePageNumbers();

// Or configure custom page numbering
printService.setPageNumbering(
  true,                    // enabled
  'bottom-center',         // position
  'page-total',           // format: shows "Page X of Y"
);

// Disable page numbers
printService.disablePageNumbers();
```

## Configuration Options

### Position Options
- `bottom-left` - Bottom left corner
- `bottom-center` - Bottom center
- `bottom-right` - Bottom right corner (default)
- `top-left` - Top left corner
- `top-center` - Top center
- `top-right` - Top right corner

### Format Options
- `page-only` - Shows "Page 1" (default)
- `page-total` - Shows "Page 1 of 5"
- `custom` - Use custom format with placeholders

### Custom Format Examples

```typescript
// Custom format with placeholders
printService.setPageNumbering(
  true,
  'bottom-right',
  'custom',
  'Page {page} of {total}'  // Results in "Page 1 of 5"
);

// Simple numbering
printService.setPageNumbering(
  true,
  'bottom-center',
  'custom',
  '{page}'  // Results in just "1"
);
```

## Styling Options

You can customize the appearance by passing page number options to PrintOptions:

```typescript
const printOptions: PrintOptions = {
  pageNumbers: {
    enabled: true,
    position: 'bottom-right',
    format: 'page-only',
    fontSize: '12px',       // Default: 10px
    color: '#333',          // Default: #666
  }
};

await printReport(contentRef, printOptions);
```

## Technical Details

### CSS Implementation
The page numbering uses CSS `@page` rules with margin boxes:

```css
@page {
  counter-increment: page;
  @bottom-right {
    content: "Page " counter(page);
    font-size: 10px;
    color: #666;
  }
}
```

### Browser Support
- ✅ **Chrome/Edge**: Full support for CSS page margin boxes
- ✅ **Firefox**: Basic support, may require CSS fallbacks
- ✅ **Safari**: Good support with CSS page rules
- ⚠️ **Other browsers**: CSS fallback positioning may be used

### Fallback Behavior
For browsers with limited `@page` support, the service automatically includes CSS fallback rules that use fixed positioning to approximate the page number placement.

## Integration with Report Components

The page numbering is automatically enabled in the report printing workflow. The default configuration shows "Page X" in the bottom-right corner, optimized for landscape-oriented financial reports.

To modify the default behavior, update the print service configuration before printing:

```typescript
const { printReport, setPageNumbering } = usePrintService();

// Configure for your specific needs
setPageNumbering(true, 'bottom-center', 'page-total');

// Then print as normal
await printReport(contentRef);
``` 