import { ConversionContext, LayerBounds } from './types';
import { UnitsValue } from 'ag-psd';

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

/**
 * 색상 채널 값을 0-255 범위의 정수로 정규화합니다.
 */
export function normalizeColorChannelTo255(value: any): number {
  const n = Number(value)
  if (!isFinite(n)) return 0
  if (n <= 0) return 0
  // 0-1 범위 (float)
  if (n > 0 && n <= 1) return Math.round(n * 255)
  // 0-255 범위 (이미 8bit)
  if (n > 1 && n <= 255) return Math.round(n)
  // 12bit 0-4095 범위로 가정
  if (n > 255 && n <= 4095) return Math.round((n / 4095) * 255)
  // 16bit 0-65535 범위로 가정
  if (n > 4095) return Math.round((n / 65535) * 255)
  return 0
}

/**
 * alpha 값을 0-1 범위로 정규화합니다.
 */
export function normalizeAlphaToUnit(value: any): number {
  if (value === undefined || value === null) return 1
  const n = Number(value)
  if (!isFinite(n) || n <= 0) return 0
  if (n > 0 && n <= 1) return n
  if (n > 1 && n <= 100) return n / 100
  if (n > 100 && n <= 255) return n / 255
  if (n > 255 && n <= 4095) return n / 4095
  if (n > 4095) return n / 65535
  return 1
}

/**
 * UnitsValue | number | undefined → number(px)로 정규화합니다.
 */
export function normalizeUnitsValue(
  value: UnitsValue | number | undefined | null,
  fallback = 0,
): number {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const v = (value as UnitsValue).value
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/**
 * ag-psd Color 객체(FRGB 등)를 {r,g,b,a} (r,g,b는 0-255 정수, a는 0-1)로 정규화합니다.
 */
export function normalizeColorObject(color: any): { r: number; g: number; b: number; a: number } {
  const src: any = color || {}
  const r = normalizeColorChannelTo255(src.r ?? src.red ?? 0)
  const g = normalizeColorChannelTo255(src.g ?? src.green ?? 0)
  const b = normalizeColorChannelTo255(src.b ?? src.blue ?? 0)
  const a = normalizeAlphaToUnit(src.a)
  return {
    r: Math.min(255, Math.max(0, r)),
    g: Math.min(255, Math.max(0, g)),
    b: Math.min(255, Math.max(0, b)),
    a: Math.min(1, Math.max(0, a)),
  }
}

/**
 * 색상 정보를 Hex 형식으로 변환합니다.
 */
export function convertColorToHex(color: any): string {
  const { r, g, b } = normalizeColorObject(color)
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`
}

/**
 * 숫자를 2자리 16진수로 변환합니다.
 */
function toHex2(n: number): string {
  return Math.round(n).toString(16).padStart(2, '0')
}

/**
 * 그라디언트 스톱 위치를 %로 정규화합니다.
 */
export function normalizeStopLocationToPercent(location: any): number {
  const n = Number(location)
  if (!isFinite(n) || n < 0) return 0
  if (n <= 1) return n * 100
  if (n <= 100) return n
  if (n <= 4096) return (n / 4096) * 100
  return (n / 65535) * 100
}

/**
 * 퍼센트를 보기 좋은 형식으로 포맷합니다.
 */
export function formatPercent(p: number): string {
  if (!isFinite(p)) return '0.0'
  const v = Math.max(0, Math.min(100, p))
  return v < 1 ? v.toFixed(2) : v.toFixed(1)
}

/**
 * PSD 텍스트 레이어의 실제 시각적 위치, 크기 계산 (transform matrix 기반)
 */
export function getTextLayerBoundingBox(
  layer: any,
): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
  // 기본 레이어 bounds를 fallback으로 사용
  const defaultBounds = {
    left: layer.left ?? 0,
    top: layer.top ?? 0,
    right: layer.right ?? 0,
    bottom: layer.bottom ?? 0,
  }

  const boundingBox = [
    layer.text?.boundingBox?.left.value ?? defaultBounds.left,
    layer.text?.boundingBox?.top.value ?? defaultBounds.top,
    layer.text?.boundingBox?.right.value ?? defaultBounds.right,
    layer.text?.boundingBox?.bottom.value ?? defaultBounds.bottom,
  ]
  const [left, top, right, bottom] = layer.text?.boxBounds || boundingBox
  const [a, b, c, d, e, f] = layer.text?.transform || []

  // transform이 없거나 모든 값이 0인 경우 기본 bounds 반환
  if (!a && !b && !c && !d && !e && !f) {
    const finalLeft = left || defaultBounds.left
    const finalTop = top || defaultBounds.top
    const finalRight = right || defaultBounds.right
    const finalBottom = bottom || defaultBounds.bottom

    return {
      left: finalLeft,
      top: finalTop,
      right: finalRight,
      bottom: finalBottom,
      width: finalRight - finalLeft,
      height: finalBottom - finalTop,
    }
  }

  // 원래 박스의 4개 꼭짓점
  const points = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ]

  // 변환된 좌표
  const transformed = points.map(([x, y]) => {
    return [
      a * x + c * y + e, // x'
      b * x + d * y + f, // y'
    ]
  })

  const xs = transformed.map((p) => p[0])
  const ys = transformed.map((p) => p[1])

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * 텍스트 레이어의 실제 폰트 크기를 계산합니다 (transform matrix 반영).
 */
export function getRealFontSize(layer: any): number {
  if (!layer.text || !layer.text.style || !layer.text.transform) return 0

  // PSD에서 제공되는 fontSize
  const fontSize = layer.text.style.fontSize || 0

  // transform 행렬에서 x 스케일 추출
  const t = layer.text.transform
  // t = [a, b, c, d, e, f] (2D 변환 행렬)
  const scaleX = Math.sqrt(t[0] * t[0] + t[1] * t[1])

  // 최종 px 크기 계산 (일반적으로 X 방향을 기준)
  const realFontSizeX = fontSize * scaleX

  return realFontSizeX
}