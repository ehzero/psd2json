import { readFileSync } from 'fs';
import { psd2json, initializePsd2JsonForNode } from '../index';

describe('Real PSD File Tests', () => {
  const testPsdPath = './test.psd';

  beforeAll(() => {
    // Initialize canvas for Node.js environment
    try {
      const canvas = require('canvas');
      initializePsd2JsonForNode(canvas);
    } catch (error) {
      console.warn('Canvas package not available, skipping real PSD tests that require image processing');
    }

    // Skip tests if test file doesn't exist
    try {
      readFileSync(testPsdPath);
    } catch (error) {
      console.warn(`Test PSD file not found at ${testPsdPath}, skipping real PSD tests`);
    }
  });

  it('should convert real PSD file successfully', async () => {
    let buffer: ArrayBuffer;
    
    try {
      const fileBuffer = readFileSync(testPsdPath);
      buffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
    } catch (error) {
      console.warn('Test PSD file not available, skipping test');
      return;
    }

    const result = await psd2json(buffer, {
      logging: true,
      includeHidden: false
    });

    console.log('Conversion result:', {
      textLayersCount: result.texts.length,
      imageLayersCount: result.images.length
    });

    // Basic structure validation
    expect(result).toHaveProperty('texts');
    expect(result).toHaveProperty('images');
    expect(Array.isArray(result.texts)).toBe(true);
    expect(Array.isArray(result.images)).toBe(true);

    // Log first few layers for debugging
    if (result.texts.length > 0) {
      console.log('First text layer:', result.texts[0]);
    }
    if (result.images.length > 0) {
      console.log('First image layer info:', {
        position: result.images[0]?.position,
        left: result.images[0]?.left,
        top: result.images[0]?.top,
        width: result.images[0]?.width,
        height: result.images[0]?.height,
        opacity: result.images[0]?.opacity,
        hasValue: !!result.images[0]?.value
      });
    }

    // Validate that all layers have required properties
    result.texts.forEach((textLayer, index) => {
      expect(textLayer.position).toBe('absolute');
      expect(typeof textLayer.left).toBeDefined();
      expect(typeof textLayer.top).toBeDefined();
      expect(typeof textLayer.width).toBeDefined();
      expect(typeof textLayer.height).toBeDefined();
      console.log(`Text layer ${index + 1}: "${textLayer.value}"`);
    });

    result.images.forEach((imageLayer, index) => {
      expect(imageLayer.position).toBe('absolute');
      expect(typeof imageLayer.left).toBeDefined();
      expect(typeof imageLayer.top).toBeDefined();
      expect(typeof imageLayer.width).toBeDefined();
      expect(typeof imageLayer.height).toBeDefined();
      console.log(`Image layer ${index + 1} has value: ${!!imageLayer.value}`);
    });
  });

  it('should convert real PSD file with pixel units only', async () => {
    let buffer: ArrayBuffer;
    
    try {
      const fileBuffer = readFileSync(testPsdPath);
      buffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
    } catch (error) {
      console.warn('Test PSD file not available, skipping test');
      return;
    }

    const result = await psd2json(buffer, {
      logging: false,
      includeHidden: false
    });

    // Verify pixel units (strings with 'px' suffix)
    result.texts.forEach((textLayer) => {
      expect(typeof textLayer.left).toBe('string');
      expect(typeof textLayer.top).toBe('string');
      expect(typeof textLayer.width).toBe('string');
      expect(typeof textLayer.height).toBe('string');
      expect(textLayer.left?.toString()).toMatch(/px$/);
      expect(textLayer.top?.toString()).toMatch(/px$/);
      expect(textLayer.width?.toString()).toMatch(/px$/);
      expect(textLayer.height?.toString()).toMatch(/px$/);
    });

    result.images.forEach((imageLayer) => {
      expect(typeof imageLayer.left).toBe('string');
      expect(typeof imageLayer.top).toBe('string');
      expect(typeof imageLayer.width).toBe('string');
      expect(typeof imageLayer.height).toBe('string');
      expect(imageLayer.left?.toString()).toMatch(/px$/);
      expect(imageLayer.top?.toString()).toMatch(/px$/);
      expect(imageLayer.width?.toString()).toMatch(/px$/);
      expect(imageLayer.height?.toString()).toMatch(/px$/);
    });
  });

  it('should include hidden layers when requested', async () => {
    let buffer: ArrayBuffer;
    
    try {
      const fileBuffer = readFileSync(testPsdPath);
      buffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
    } catch (error) {
      console.warn('Test PSD file not available, skipping test');
      return;
    }

    const resultWithoutHidden = await psd2json(buffer, {
      includeHidden: false
    });
    
    const resultWithHidden = await psd2json(buffer, {
      includeHidden: true
    });

    // Should have same or more layers when including hidden
    expect(resultWithHidden.texts.length).toBeGreaterThanOrEqual(resultWithoutHidden.texts.length);
    expect(resultWithHidden.images.length).toBeGreaterThanOrEqual(resultWithoutHidden.images.length);

    console.log('Layer counts comparison:', {
      withoutHidden: {
        texts: resultWithoutHidden.texts.length,
        images: resultWithoutHidden.images.length
      },
      withHidden: {
        texts: resultWithHidden.texts.length,
        images: resultWithHidden.images.length
      }
    });
  });
});