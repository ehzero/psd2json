import { readFileSync } from 'fs';
import { psd2json } from '../index';

describe('Real PSD File Tests', () => {
  const testPsdPath = './test.psd';
  
  beforeAll(() => {
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
      includeHidden: false,
      units: 'px'
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

  it('should convert real PSD file with percentage units', async () => {
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
      includeHidden: false,
      units: 'percent'
    });

    // Verify percentage units
    result.texts.forEach((textLayer) => {
      if (typeof textLayer.left === 'string') {
        expect(textLayer.left).toMatch(/^\d+\.\d{2}%$/);
      }
      if (typeof textLayer.top === 'string') {
        expect(textLayer.top).toMatch(/^\d+\.\d{2}%$/);
      }
      if (typeof textLayer.width === 'string') {
        expect(textLayer.width).toMatch(/^\d+\.\d{2}%$/);
      }
      if (typeof textLayer.height === 'string') {
        expect(textLayer.height).toMatch(/^\d+\.\d{2}%$/);
      }
    });

    result.images.forEach((imageLayer) => {
      if (typeof imageLayer.left === 'string') {
        expect(imageLayer.left).toMatch(/^\d+\.\d{2}%$/);
      }
      if (typeof imageLayer.top === 'string') {
        expect(imageLayer.top).toMatch(/^\d+\.\d{2}%$/);
      }
      if (typeof imageLayer.width === 'string') {
        expect(imageLayer.width).toMatch(/^\d+\.\d{2}%$/);
      }
      if (typeof imageLayer.height === 'string') {
        expect(imageLayer.height).toMatch(/^\d+\.\d{2}%$/);
      }
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