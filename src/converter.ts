import { readPsd, Psd, Layer } from 'ag-psd';
import {
  ConversionOptions,
  ConversionResult,
  ConversionContext,
  PsdDimensions,
  TextLayer,
  ImageLayer
} from './types';
import {
  log,
  isTextLayer,
  isImageLayer,
  shouldIncludeLayer
} from './utils';
import {
  convertTextLayer,
  convertImageLayer
} from './styleConverter';
import {
  PsdConversionError,
  ErrorCodes,
  handleConversionError,
  validateConversionOptions,
  safeLayerConversion
} from './errorHandler';

const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  logging: false,
  includeHidden: false
};

export async function psd2json(
  psdBuffer: ArrayBuffer,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    validatePsdBuffer(psdBuffer);
    validateConversionOptions(options);
    
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    const psd = readPsd(psdBuffer, { useImageData: true });
    
    if (!psd) {
      throw new PsdConversionError(
        'Failed to parse PSD file',
        ErrorCodes.PARSING_FAILED
      );
    }

    const psdDimensions: PsdDimensions = {
      width: psd.width || 0,
      height: psd.height || 0
    };

    if (psdDimensions.width === 0 || psdDimensions.height === 0) {
      throw new PsdConversionError(
        `Invalid PSD dimensions: ${psdDimensions.width}x${psdDimensions.height}`,
        ErrorCodes.INVALID_DIMENSIONS
      );
    }

    const context: ConversionContext = {
      psdDimensions,
      options: mergedOptions,
      logging: mergedOptions.logging
    };

    log(context, `Starting PSD conversion - ${psdDimensions.width}x${psdDimensions.height}`);
    log(context, `Options:`, mergedOptions);

    const result = await processPsdLayers(psd, context);
    
    log(context, `Conversion completed - ${result.texts.length} text layers, ${result.images.length} image layers`);
    
    return result;
  } catch (error) {
    handleConversionError(error, 'PSD conversion');
  }
}

async function processPsdLayers(psd: Psd, context: ConversionContext): Promise<ConversionResult> {
  const texts: TextLayer[] = [];
  const images: ImageLayer[] = [];

  if (!psd.children || psd.children.length === 0) {
    log(context, 'No layers found in PSD file');
    return { texts, images };
  }

  const allLayers = flattenLayers(psd.children);
  log(context, `Found ${allLayers.length} total layers`);

  for (const layer of allLayers) {
    if (!shouldIncludeLayer(layer, context.options.includeHidden)) {
      log(context, `Skipping hidden layer: ${layer.name || 'Unnamed'}`);
      continue;
    }

    if (isTextLayer(layer)) {
      const textLayer = safeLayerConversion(
        layer.name || 'Unnamed',
        () => convertTextLayer(layer, context)
      );
      if (textLayer) {
        texts.push(textLayer);
        log(context, `Converted text layer: ${layer.name || 'Unnamed'}`);
      }
    } else if (isImageLayer(layer)) {
      const imageLayer = safeLayerConversion(
        layer.name || 'Unnamed',
        () => convertImageLayer(layer, context)
      );
      if (imageLayer) {
        images.push(imageLayer);
        log(context, `Converted image layer: ${layer.name || 'Unnamed'}`);
      }
    } else {
      log(context, `Skipping unsupported layer type: ${layer.name || 'Unnamed'}`);
    }
  }

  return { texts, images };
}

function flattenLayers(layers: Layer[]): Layer[] {
  const result: Layer[] = [];
  
  for (const layer of layers) {
    result.push(layer);
    
    if (layer.children && layer.children.length > 0) {
      result.push(...flattenLayers(layer.children));
    }
  }
  
  return result;
}

export function validatePsdBuffer(buffer: ArrayBuffer): void {
  if (!buffer || buffer.byteLength === 0) {
    throw new PsdConversionError(
      'Invalid or empty PSD buffer',
      ErrorCodes.INVALID_BUFFER
    );
  }

  if (buffer.byteLength < 26) {
    throw new PsdConversionError(
      'PSD buffer too small - not a valid PSD file',
      ErrorCodes.INVALID_PSD_FORMAT
    );
  }

  const signature = new Uint8Array(buffer, 0, 4);
  const expectedSignature = new Uint8Array([0x38, 0x42, 0x50, 0x53]);
  
  for (let i = 0; i < 4; i++) {
    if (signature[i] !== expectedSignature[i]) {
      throw new PsdConversionError(
        'Invalid PSD file signature',
        ErrorCodes.INVALID_PSD_FORMAT
      );
    }
  }
}