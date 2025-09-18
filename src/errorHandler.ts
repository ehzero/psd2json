export class PsdConversionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PsdConversionError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PsdConversionError);
    }
  }
}

export enum ErrorCodes {
  INVALID_BUFFER = 'INVALID_BUFFER',
  INVALID_PSD_FORMAT = 'INVALID_PSD_FORMAT',
  PARSING_FAILED = 'PARSING_FAILED',
  LAYER_CONVERSION_FAILED = 'LAYER_CONVERSION_FAILED',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE',
  MEMORY_ERROR = 'MEMORY_ERROR'
}

export function handleConversionError(error: unknown, context?: string): never {
  if (error instanceof PsdConversionError) {
    throw error;
  }

  if (error instanceof Error) {
    const contextMessage = context ? `${context}: ` : '';
    
    if (error.message.includes('out of memory') || error.message.includes('Cannot allocate')) {
      throw new PsdConversionError(
        `${contextMessage}Memory error during conversion`,
        ErrorCodes.MEMORY_ERROR,
        error
      );
    }

    if (error.message.includes('Invalid PSD') || error.message.includes('signature')) {
      throw new PsdConversionError(
        `${contextMessage}Invalid PSD file format`,
        ErrorCodes.INVALID_PSD_FORMAT,
        error
      );
    }

    throw new PsdConversionError(
      `${contextMessage}${error.message}`,
      ErrorCodes.PARSING_FAILED,
      error
    );
  }

  throw new PsdConversionError(
    `${context ? `${context}: ` : ''}Unknown error occurred`,
    ErrorCodes.PARSING_FAILED,
    error
  );
}

export function validateConversionOptions(options: any): void {
  if (typeof options !== 'object' || options === null) {
    return;
  }

  if (options.logging !== undefined && typeof options.logging !== 'boolean') {
    throw new PsdConversionError(
      'logging option must be a boolean',
      ErrorCodes.INVALID_BUFFER
    );
  }

  if (options.includeHidden !== undefined && typeof options.includeHidden !== 'boolean') {
    throw new PsdConversionError(
      'includeHidden option must be a boolean',
      ErrorCodes.INVALID_BUFFER
    );
  }

  // Units option removed - only px values are supported
}

export function safeLayerConversion<T>(
  layerName: string,
  conversionFn: () => T
): T | null {
  try {
    return conversionFn();
  } catch (error) {
    console.warn(`Failed to convert layer "${layerName}":`, error);
    return null;
  }
}