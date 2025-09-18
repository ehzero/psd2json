# psd2json

TypeScript library that converts Adobe Photoshop PSD files to JSON with React CSSProperties.

## Installation

```bash
npm install @ehzero/psd2json
```

## Quick Start

```typescript
import { psd2json } from '@ehzero/psd2json';

const result = await psd2json(psdBuffer);

console.log('Text layers:', result.texts);
console.log('Image layers:', result.images);
```

## API

### `psd2json(buffer, options?)`

```typescript
interface ConversionOptions {
  logging?: boolean;        // Enable logs (default: false)
  includeHidden?: boolean;  // Include hidden layers (default: false)
}

interface ConversionResult {
  texts: TextLayer[];       // Text layers with CSS properties
  images: ImageLayer[];     // Image layers with CSS properties
}
```

### Layer Properties

```typescript
interface TextLayer extends React.CSSProperties {
  value: string | undefined; // Text content
  // CSS properties: left, top, width, height, fontSize, color, etc.
}

interface ImageLayer extends React.CSSProperties {
  value: string | undefined; // Base64 image data
  // CSS properties: left, top, width, height, opacity, etc.
}
```

## Examples

### Basic Usage

```typescript
const result = await psd2json(psdBuffer, {
  logging: true,
  includeHidden: false
});

result.texts.forEach(textLayer => {
  console.log('Text:', textLayer.value);
  console.log('Position:', textLayer.left, textLayer.top);
  console.log('Font:', textLayer.fontFamily, textLayer.fontSize);
});
```

### React Integration

```tsx
function PsdRenderer({ psdData }) {
  return (
    <div style={{ position: 'relative' }}>
      {psdData.texts.map((layer, i) => (
        <div key={i} style={layer}>
          {layer.value}
        </div>
      ))}

      {psdData.images.map((layer, i) => (
        <div
          key={i}
          style={{
            ...layer,
            backgroundImage: layer.value ? `url(${layer.value})` : undefined
          }}
        />
      ))}
    </div>
  );
}
```

### Node.js Setup

```typescript
import { initializePsd2JsonForNode } from '@ehzero/psd2json';
import * as canvas from 'canvas';

// Required for image processing in Node.js
initializePsd2JsonForNode(canvas);
```

## Output Format

All dimensions are returned as pixel strings:

```javascript
{
  position: 'absolute',
  left: '100px',
  top: '50px',
  width: '400px',
  height: '70px',
  fontSize: '36px',
  opacity: 0.9,           // number (0-1)
  letterSpacing: '0.05em', // string with em
  lineHeight: 1.2          // unitless number
}
```

## Supported Features

- Text layers: fonts, colors, positioning, effects
- Image layers: positioning, opacity, blend modes
- Layer effects: shadows, glows, strokes
- TypeScript definitions
- React CSSProperties compatibility

## Error Handling

```typescript
import { psd2json, PsdConversionError } from '@ehzero/psd2json';

try {
  const result = await psd2json(buffer);
} catch (error) {
  if (error instanceof PsdConversionError) {
    console.error('PSD Error:', error.message);
  }
}
```

## License

MIT