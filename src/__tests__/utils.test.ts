import {
  convertPxToPercent,
  convertDimensionValue,
  rgbaToHex,
  convertBlendMode,
  isTextLayer,
  isImageLayer,
  shouldIncludeLayer
} from '../utils';

describe('Utils', () => {
  // Mock context removed - no longer needed for simplified functions

  describe('convertPxToPercent', () => {
    it('should return pixel values only', () => {
      const result = convertPxToPercent(400);
      expect(result).toBe(400);
    });
  });

  describe('convertDimensionValue', () => {
    it('should return pixel values with px unit', () => {
      const result = convertDimensionValue(200);
      expect(result).toBe('200px');
    });
  });

  describe('rgbaToHex', () => {
    it('should convert RGB to hex', () => {
      const result = rgbaToHex(1, 0.5, 0);
      expect(result).toBe('#ff8000');
    });

    it('should convert RGBA to rgba string when alpha < 1', () => {
      const result = rgbaToHex(1, 0, 0, 0.5);
      expect(result).toBe('rgba(255, 0, 0, 0.50)');
    });
  });

  describe('convertBlendMode', () => {
    it('should convert supported blend modes', () => {
      expect(convertBlendMode('multiply')).toBe('multiply');
      expect(convertBlendMode('screen')).toBe('screen');
      expect(convertBlendMode('overlay')).toBe('overlay');
    });

    it('should return undefined for unsupported blend modes', () => {
      expect(convertBlendMode('unknown-mode')).toBeUndefined();
      expect(convertBlendMode()).toBeUndefined();
    });
  });

  describe('isTextLayer', () => {
    it('should return true for text layers', () => {
      const layer = { text: { text: 'Hello World' } };
      expect(isTextLayer(layer)).toBe(true);
    });

    it('should return false for non-text layers', () => {
      const layer = { canvas: {} };
      expect(isTextLayer(layer)).toBe(false);
    });
  });

  describe('isImageLayer', () => {
    it('should return true for image layers with canvas', () => {
      const layer = { canvas: {} };
      expect(isImageLayer(layer)).toBe(true);
    });

    it('should return true for image layers with imageData', () => {
      const layer = { imageData: {} };
      expect(isImageLayer(layer)).toBe(true);
    });

    it('should return false for text layers', () => {
      const layer = { text: { text: 'Hello' } };
      expect(isImageLayer(layer)).toBe(false);
    });
  });

  describe('shouldIncludeLayer', () => {
    it('should include visible layers when includeHidden is false', () => {
      const layer = { hidden: false };
      expect(shouldIncludeLayer(layer, false)).toBe(true);
    });

    it('should exclude hidden layers when includeHidden is false', () => {
      const layer = { hidden: true };
      expect(shouldIncludeLayer(layer, false)).toBe(false);
    });

    it('should include hidden layers when includeHidden is true', () => {
      const layer = { hidden: true };
      expect(shouldIncludeLayer(layer, true)).toBe(true);
    });
  });
});