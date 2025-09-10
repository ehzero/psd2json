# psd2json

A powerful TypeScript library that converts Adobe Photoshop PSD files to structured JSON format with React CSSProperties styling.

![npm version](https://img.shields.io/npm/v/psd2json.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-brightgreen.svg)

## ✨ Features

- 🎨 **Convert PSD to JSON**: Transform Photoshop documents into structured data
- ⚛️ **React Ready**: Output styles as React.CSSProperties for seamless integration
- 🎯 **Layer Separation**: Automatically separates text and image layers
- 📏 **Multiple Units**: Support for both pixels (`px`) and percentage (`%`) units
- 🔍 **Comprehensive Parsing**: Extracts fonts, colors, positioning, effects, and more
- 🛡️ **TypeScript First**: Full TypeScript support with strict type checking
- 🚀 **Optimized Performance**: Built on the reliable ag-psd library
- 🔧 **Flexible Options**: Configurable parsing with hidden layer control

## 📦 Installation

```bash
npm install psd2json
```

## 🚀 Quick Start

```typescript
import { psd2json } from 'psd2json';
import { readFileSync } from 'fs';

// Load your PSD file
const psdBuffer = readFileSync('design.psd');
const buffer = psdBuffer.buffer.slice(
  psdBuffer.byteOffset,
  psdBuffer.byteOffset + psdBuffer.byteLength
);

// Convert to JSON
const result = await psd2json(buffer);

console.log('Text layers:', result.texts.length);
console.log('Image layers:', result.images.length);
```

## 📖 API Reference

### `psd2json(buffer, options?)`

Converts a PSD file buffer to structured JSON format.

**Parameters:**

- `buffer: ArrayBuffer` - The PSD file as an ArrayBuffer
- `options?: ConversionOptions` - Optional configuration

**Returns:** `Promise<ConversionResult>`

### ConversionOptions

```typescript
interface ConversionOptions {
  logging?: boolean;        // Enable conversion progress logs (default: false)
  includeHidden?: boolean;  // Include hidden layers (default: false)
  units?: 'px' | 'percent'; // Output units (default: 'px')
}
```

### ConversionResult

```typescript
interface ConversionResult {
  texts: TextLayer[];   // Array of text layers
  images: ImageLayer[]; // Array of image layers
}
```

### Layer Types

Both `TextLayer` and `ImageLayer` extend `React.CSSProperties` with additional properties:

```typescript
interface TextLayer extends React.CSSProperties {
  value: string | undefined; // Text content
}

interface ImageLayer extends React.CSSProperties {
  value: string | undefined; // Image data URL (base64)
}
```

## 🎯 Usage Examples

### Basic Usage

```typescript
import { psd2json } from 'psd2json';

const result = await psd2json(psdBuffer, {
  logging: true,
  includeHidden: false,
  units: 'px'
});

// Access text layers
result.texts.forEach((textLayer, index) => {
  console.log(`Text ${index + 1}:`, textLayer.value);
  console.log('Position:', { 
    left: textLayer.left, 
    top: textLayer.top 
  });
  console.log('Font:', textLayer.fontFamily);
});

// Access image layers
result.images.forEach((imageLayer, index) => {
  console.log(`Image ${index + 1} dimensions:`, {
    width: imageLayer.width,
    height: imageLayer.height
  });
});
```

### Percentage Units

```typescript
const result = await psd2json(psdBuffer, {
  units: 'percent'
});

// All dimensions will be in percentage relative to PSD dimensions
console.log(result.texts[0]?.left); // "25.50%"
console.log(result.texts[0]?.width); // "50.00%"
```

### React Integration

```tsx
import React from 'react';
import { psd2json, TextLayer, ImageLayer } from 'psd2json';

function PsdRenderer({ psdData }: { psdData: { texts: TextLayer[], images: ImageLayer[] } }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Render text layers */}
      {psdData.texts.map((textLayer, index) => (
        <div key={`text-${index}`} style={textLayer}>
          {textLayer.value}
        </div>
      ))}
      
      {/* Render image layers */}
      {psdData.images.map((imageLayer, index) => (
        <div
          key={`image-${index}`}
          style={{
            ...imageLayer,
            backgroundImage: imageLayer.value ? `url(${imageLayer.value})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      ))}
    </div>
  );
}

// Usage
const MyComponent = () => {
  const [psdData, setPsdData] = useState(null);

  useEffect(() => {
    const loadPsd = async () => {
      const buffer = /* load your PSD buffer */;
      const data = await psd2json(buffer, { units: 'percent' });
      setPsdData(data);
    };
    loadPsd();
  }, []);

  return psdData ? <PsdRenderer psdData={psdData} /> : <div>Loading...</div>;
};
```

### Error Handling

```typescript
import { psd2json, PsdConversionError } from 'psd2json';

try {
  const result = await psd2json(buffer);
  console.log('Conversion successful:', result);
} catch (error) {
  if (error instanceof PsdConversionError) {
    console.error('PSD conversion error:', error.message);
    console.error('Error code:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 🎨 Supported Features

### Text Layer Properties
- ✅ Font family, size, weight
- ✅ Text color and opacity
- ✅ Text alignment and indentation  
- ✅ Letter spacing and line height
- ✅ Text transforms (uppercase, small caps)
- ✅ Text decorations (underline, strikethrough)
- ✅ Layer positioning and dimensions

### Image Layer Properties
- ✅ Layer positioning and dimensions
- ✅ Opacity and blend modes
- ✅ Image data as base64 data URLs
- ✅ Canvas rendering support

### Layer Effects
- ✅ Drop shadows
- ✅ Inner shadows
- ✅ Outer glow
- ✅ Stroke effects
- ✅ Blend mode conversion

### Units and Positioning
- ✅ Pixel units (`px`)
- ✅ Percentage units (`%`) relative to PSD dimensions
- ✅ Absolute positioning (`position: absolute`)
- ✅ Proper coordinate system handling

## 🔧 Advanced Configuration

### Node.js Environment

When using in Node.js, you may need to initialize canvas support for image processing:

```typescript
import { initializeCanvas } from 'ag-psd';
import * as canvas from 'canvas';

// Initialize canvas for Node.js
initializeCanvas(canvas.createCanvas);
```

### Browser Environment

For browser environments, consider using a bundler that properly handles ArrayBuffer:

```typescript
// Reading file in browser
const handleFileSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const buffer = await file.arrayBuffer();
    const result = await psd2json(buffer);
    console.log('Converted:', result);
  }
};
```

## 🚨 Important Notes

### Performance Considerations
- Large PSD files may take time to process
- Consider using Web Workers for heavy processing in browsers
- Memory usage scales with PSD complexity and layer count

### Known Limitations
- Complex blend modes may not have CSS equivalents
- Some advanced Photoshop effects cannot be replicated in CSS
- Text styling may vary slightly due to font rendering differences
- Vector layers are not currently supported

### File Size
- The library automatically excludes test files and development dependencies when published
- Only essential runtime files are included in the npm package

## 📝 Examples

Check out the `/examples` directory (coming soon) for complete implementation examples:

- Basic PSD to React conversion
- Vue.js integration
- Node.js server processing
- Batch conversion scripts

## 🛡️ Error Handling

The library provides comprehensive error handling:

```typescript
// Error codes available
enum ErrorCodes {
  INVALID_BUFFER = 'INVALID_BUFFER',
  INVALID_PSD_FORMAT = 'INVALID_PSD_FORMAT', 
  PARSING_FAILED = 'PARSING_FAILED',
  LAYER_CONVERSION_FAILED = 'LAYER_CONVERSION_FAILED',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE',
  MEMORY_ERROR = 'MEMORY_ERROR'
}
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📊 Changelog

### v1.0.0
- Initial release
- Full TypeScript support
- React CSSProperties integration
- Comprehensive PSD parsing
- Unit conversion (px/percentage)
- Error handling system

## 🙏 Acknowledgments

- Built on top of the excellent [ag-psd](https://github.com/Agamnentzar/ag-psd) library
- Inspired by the need for better PSD-to-web workflows
- TypeScript and React community for excellent tooling

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yty/psd2json/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yty/psd2json/discussions)
- 📖 **Documentation**: [GitHub Wiki](https://github.com/yty/psd2json/wiki)

---

**Made with ❤️ for designers and developers who love pixel-perfect implementations.**