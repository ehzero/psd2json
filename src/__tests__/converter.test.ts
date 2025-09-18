import { psd2json, validatePsdBuffer } from '../converter';
import { PsdConversionError } from '../errorHandler';

// Mock ag-psd
jest.mock('ag-psd', () => ({
  readPsd: jest.fn()
}));

import { readPsd } from 'ag-psd';
const mockReadPsd = readPsd as jest.MockedFunction<typeof readPsd>;

describe('Converter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePsdBuffer', () => {
    it('should throw error for null buffer', () => {
      expect(() => validatePsdBuffer(null as any)).toThrow(PsdConversionError);
    });

    it('should throw error for empty buffer', () => {
      expect(() => validatePsdBuffer(new ArrayBuffer(0))).toThrow(PsdConversionError);
    });

    it('should throw error for buffer too small', () => {
      expect(() => validatePsdBuffer(new ArrayBuffer(10))).toThrow(PsdConversionError);
    });

    it('should throw error for invalid PSD signature', () => {
      const buffer = new ArrayBuffer(26);
      const view = new Uint8Array(buffer);
      view[0] = 0x00; // Invalid signature
      
      expect(() => validatePsdBuffer(buffer)).toThrow(PsdConversionError);
    });

    it('should pass validation for valid PSD signature', () => {
      const buffer = new ArrayBuffer(26);
      const view = new Uint8Array(buffer);
      view[0] = 0x38; // '8'
      view[1] = 0x42; // 'B'
      view[2] = 0x50; // 'P'
      view[3] = 0x53; // 'S'
      
      expect(() => validatePsdBuffer(buffer)).not.toThrow();
    });
  });

  describe('psd2json', () => {
    const createValidPsdBuffer = (): ArrayBuffer => {
      const buffer = new ArrayBuffer(26);
      const view = new Uint8Array(buffer);
      view[0] = 0x38; // '8'
      view[1] = 0x42; // 'B'
      view[2] = 0x50; // 'P'
      view[3] = 0x53; // 'S'
      return buffer;
    };

    it('should convert empty PSD successfully', async () => {
      const mockPsd = {
        width: 800,
        height: 600,
        children: []
      };
      
      mockReadPsd.mockReturnValue(mockPsd as any);
      
      const result = await psd2json(createValidPsdBuffer());
      
      expect(result).toEqual({
        texts: [],
        images: []
      });
    });

    it('should convert PSD with text layer', async () => {
      const mockPsd = {
        width: 800,
        height: 600,
        children: [
          {
            name: 'Text Layer',
            left: 100,
            top: 50,
            right: 300,
            bottom: 100,
            text: {
              text: 'Hello World',
              style: {
                fontSize: 16,
                fillColor: { r: 1, g: 0, b: 0 }
              }
            },
            opacity: 1
          }
        ]
      };
      
      mockReadPsd.mockReturnValue(mockPsd as any);
      
      const result = await psd2json(createValidPsdBuffer(), { logging: true });
      
      expect(result.texts).toHaveLength(1);
      expect(result.images).toHaveLength(0);
      expect(result.texts[0]?.value).toBe('Hello World');
      expect(result.texts[0]?.position).toBe('absolute');
    });

    it('should convert PSD with image layer', async () => {
      const mockPsd = {
        width: 800,
        height: 600,
        children: [
          {
            name: 'Image Layer',
            left: 0,
            top: 0,
            right: 200,
            bottom: 150,
            canvas: {
              toDataURL: () => 'data:image/png;base64,test'
            },
            opacity: 0.8
          }
        ]
      };
      
      mockReadPsd.mockReturnValue(mockPsd as any);
      
      const result = await psd2json(createValidPsdBuffer());
      
      expect(result.texts).toHaveLength(0);
      expect(result.images).toHaveLength(1);
      expect(result.images[0]?.value).toBe('data:image/png;base64,test');
      expect(result.images[0]?.opacity).toBe(0.8);
    });

    it('should handle pixel units only', async () => {
      const mockPsd = {
        width: 800,
        height: 600,
        children: [
          {
            name: 'Test Layer',
            left: 400,
            top: 300,
            right: 600,
            bottom: 450,
            text: { text: 'Test' },
            opacity: 1
          }
        ]
      };

      mockReadPsd.mockReturnValue(mockPsd as any);

      const result = await psd2json(createValidPsdBuffer());

      expect(result.texts[0]?.left).toBe('400px');
      expect(result.texts[0]?.top).toBe('300px');
      expect(result.texts[0]?.width).toBe('200px');
      expect(result.texts[0]?.height).toBe('150px');
    });

    it('should exclude hidden layers when includeHidden is false', async () => {
      const mockPsd = {
        width: 800,
        height: 600,
        children: [
          {
            name: 'Visible Layer',
            left: 0, top: 0, right: 100, bottom: 100,
            text: { text: 'Visible' },
            hidden: false
          },
          {
            name: 'Hidden Layer',
            left: 0, top: 0, right: 100, bottom: 100,
            text: { text: 'Hidden' },
            hidden: true
          }
        ]
      };
      
      mockReadPsd.mockReturnValue(mockPsd as any);
      
      const result = await psd2json(createValidPsdBuffer(), { includeHidden: false });
      
      expect(result.texts).toHaveLength(1);
      expect(result.texts[0]?.value).toBe('Visible');
    });

    it('should include hidden layers when includeHidden is true', async () => {
      const mockPsd = {
        width: 800,
        height: 600,
        children: [
          {
            name: 'Hidden Layer',
            left: 0, top: 0, right: 100, bottom: 100,
            text: { text: 'Hidden' },
            hidden: true
          }
        ]
      };
      
      mockReadPsd.mockReturnValue(mockPsd as any);
      
      const result = await psd2json(createValidPsdBuffer(), { includeHidden: true });
      
      expect(result.texts).toHaveLength(1);
      expect(result.texts[0]?.value).toBe('Hidden');
    });

    // Test removed - units option no longer exists

    it('should throw error when readPsd fails', async () => {
      mockReadPsd.mockReturnValue(null as any);
      
      await expect(psd2json(createValidPsdBuffer()))
        .rejects.toThrow(PsdConversionError);
    });

    it('should throw error for invalid dimensions', async () => {
      const mockPsd = {
        width: 0,
        height: 0,
        children: []
      };
      
      mockReadPsd.mockReturnValue(mockPsd as any);
      
      await expect(psd2json(createValidPsdBuffer()))
        .rejects.toThrow(PsdConversionError);
    });
  });
});