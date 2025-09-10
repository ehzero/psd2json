import { ConversionContext, LayerBounds } from './types';

export function log(context: ConversionContext, message: string, ...args: unknown[]): void {
  if (context.logging) {
    console.log(`[psd2json] ${message}`, ...args);
  }
}

export function convertPxToPercent(
  value: number,
  reference: number,
  context: ConversionContext
): string | number {
  if (context.options.units === 'percent') {
    const percentage = (value / reference) * 100;
    return `${percentage.toFixed(2)}%`;
  }
  return value;
}

export function convertDimensionValue(
  value: number,
  isWidth: boolean,
  context: ConversionContext
): string | number {
  const reference = isWidth ? context.psdDimensions.width : context.psdDimensions.height;
  return convertPxToPercent(value, reference, context);
}

export function normalizeLayerBounds(bounds: LayerBounds): LayerBounds {
  return {
    left: Math.round(bounds.left),
    top: Math.round(bounds.top),
    right: Math.round(bounds.right),
    bottom: Math.round(bounds.bottom)
  };
}

export function calculateLayerDimensions(bounds: LayerBounds): { width: number; height: number } {
  return {
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top
  };
}

export function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const toHex = (n: number): string => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  if (a !== undefined && a < 1) {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(2)})`;
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function convertBlendMode(blendMode?: string): string | undefined {
  const blendModeMap: { [key: string]: string } = {
    'normal': 'normal',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'soft-light': 'soft-light',
    'hard-light': 'hard-light',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'darken': 'darken',
    'lighten': 'lighten',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity'
  };

  return blendMode ? blendModeMap[blendMode.toLowerCase()] : undefined;
}

export function isTextLayer(layer: any): boolean {
  return !!(layer.text && layer.text.text);
}

export function isImageLayer(layer: any): boolean {
  return !!(layer.canvas || layer.imageData) && !isTextLayer(layer);
}

export function shouldIncludeLayer(layer: any, includeHidden: boolean): boolean {
  if (!includeHidden && layer.hidden) {
    return false;
  }
  return true;
}