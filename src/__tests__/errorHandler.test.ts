import {
  PsdConversionError,
  ErrorCodes,
  handleConversionError,
  validateConversionOptions,
  safeLayerConversion
} from '../errorHandler';

describe('ErrorHandler', () => {
  describe('PsdConversionError', () => {
    it('should create error with message, code, and details', () => {
      const error = new PsdConversionError('Test message', ErrorCodes.INVALID_BUFFER, { detail: 'test' });
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(ErrorCodes.INVALID_BUFFER);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('PsdConversionError');
    });
  });

  describe('handleConversionError', () => {
    it('should re-throw PsdConversionError as is', () => {
      const originalError = new PsdConversionError('Original error', ErrorCodes.PARSING_FAILED);
      
      expect(() => {
        handleConversionError(originalError);
      }).toThrow(originalError);
    });

    it('should convert memory errors', () => {
      const memoryError = new Error('out of memory error occurred');
      
      expect(() => {
        handleConversionError(memoryError, 'Memory test');
      }).toThrow(PsdConversionError);
    });

    it('should convert PSD format errors', () => {
      const formatError = new Error('Invalid PSD format');
      
      expect(() => {
        handleConversionError(formatError);
      }).toThrow(PsdConversionError);
    });

    it('should handle unknown errors', () => {
      const unknownError = 'unknown error';
      
      expect(() => {
        handleConversionError(unknownError);
      }).toThrow(PsdConversionError);
    });
  });

  describe('validateConversionOptions', () => {
    it('should accept valid options', () => {
      expect(() => {
        validateConversionOptions({
          logging: true,
          includeHidden: false
        });
      }).not.toThrow();
    });

    it('should accept undefined/null options', () => {
      expect(() => {
        validateConversionOptions(null);
        validateConversionOptions(undefined);
      }).not.toThrow();
    });

    it('should reject invalid logging option', () => {
      expect(() => {
        validateConversionOptions({ logging: 'invalid' });
      }).toThrow(PsdConversionError);
    });

    it('should reject invalid includeHidden option', () => {
      expect(() => {
        validateConversionOptions({ includeHidden: 'invalid' });
      }).toThrow(PsdConversionError);
    });

    // Test removed - units option no longer exists
  });

  describe('safeLayerConversion', () => {
    it('should return result on successful conversion', () => {
      const result = safeLayerConversion('test-layer', () => ({ test: 'data' }));
      expect(result).toEqual({ test: 'data' });
    });

    it('should return null on conversion failure', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = safeLayerConversion('test-layer', () => {
        throw new Error('Conversion failed');
      });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to convert layer "test-layer":',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});