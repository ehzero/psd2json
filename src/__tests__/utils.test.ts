import {
  convertPxToPercent,
  convertDimensionValue,
  rgbaToHex,
  convertBlendMode,
  isTextLayer,
  isImageLayer,
  shouldIncludeLayer
} from '../utils';
import { ConversionContext } from '../types';

describe('Utils', () => {
  const mockContext: ConversionContext = {
    psdDimensions: { width: 800, height: 600 },
    options: { logging: false, includeHidden: false, units: 'px' },
    logging: false
  };

  const mockContextPercent: ConversionContext = {
    psdDimensions: { width: 800, height: 600 },
    options: { logging: false, includeHidden: false, units: 'percent' },
    logging: false
  };

  describe('convertPxToPercent', () => {
    it('should convert pixels to percentage when units is percent', () => {
      const result = convertPxToPercent(400, 800, mockContextPercent);
      expect(result).toBe('50.00%');
    });

    it('should return pixels when units is px', () => {
      const result = convertPxToPercent(400, 800, mockContext);
      expect(result).toBe(400);
    });
  });

  describe('convertDimensionValue', () => {
    it('should convert width dimension to percentage', () => {
      const result = convertDimensionValue(200, true, mockContextPercent);
      expect(result).toBe('25.00%');
    });

    it('should convert height dimension to percentage', () => {
      const result = convertDimensionValue(150, false, mockContextPercent);
      expect(result).toBe('25.00%');
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