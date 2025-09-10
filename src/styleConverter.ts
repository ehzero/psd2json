import { CSSProperties } from 'react';
import { Layer, TextStyle } from 'ag-psd';
import {
  ConversionContext,
  EffectInfo,
  LayerBounds,
  TextLayer,
  ImageLayer
} from './types';
import {
  convertDimensionValue,
  normalizeLayerBounds,
  calculateLayerDimensions,
  rgbaToHex,
  convertBlendMode,
  log
} from './utils';

export function convertTextLayer(layer: Layer, context: ConversionContext): TextLayer {
  log(context, `Converting text layer: ${layer.name || 'Unnamed'}`);
  
  const bounds = getLayerBounds(layer);
  const normalizedBounds = normalizeLayerBounds(bounds);
  const dimensions = calculateLayerDimensions(normalizedBounds);
  
  const styles: CSSProperties = {
    position: 'absolute',
    left: convertDimensionValue(normalizedBounds.left, true, context),
    top: convertDimensionValue(normalizedBounds.top, false, context),
    width: convertDimensionValue(dimensions.width, true, context),
    height: convertDimensionValue(dimensions.height, false, context),
  };

  if (layer.opacity !== undefined && layer.opacity < 1) {
    styles.opacity = layer.opacity;
  }

  if (layer.blendMode) {
    const cssBlendMode = convertBlendMode(layer.blendMode);
    if (cssBlendMode) {
      styles.mixBlendMode = cssBlendMode as CSSProperties['mixBlendMode'];
    }
  }

  if (layer.text) {
    const textStyles = convertTextStyles(layer.text, context);
    Object.assign(styles, textStyles);
  }

  const effects = convertLayerEffects(layer, context);
  if (effects.dropShadow) {
    const shadow = effects.dropShadow;
    styles.boxShadow = `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.spread || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`;
  }

  const textLayer: TextLayer = {
    ...styles,
    value: layer.text?.text || ''
  };

  return textLayer;
}

export function convertImageLayer(layer: Layer, context: ConversionContext): ImageLayer {
  log(context, `Converting image layer: ${layer.name || 'Unnamed'}`);
  
  const bounds = getLayerBounds(layer);
  const normalizedBounds = normalizeLayerBounds(bounds);
  const dimensions = calculateLayerDimensions(normalizedBounds);
  
  const styles: CSSProperties = {
    position: 'absolute',
    left: convertDimensionValue(normalizedBounds.left, true, context),
    top: convertDimensionValue(normalizedBounds.top, false, context),
    width: convertDimensionValue(dimensions.width, true, context),
    height: convertDimensionValue(dimensions.height, false, context),
  };

  if (layer.opacity !== undefined && layer.opacity < 1) {
    styles.opacity = layer.opacity;
  }

  if (layer.blendMode) {
    const cssBlendMode = convertBlendMode(layer.blendMode);
    if (cssBlendMode) {
      styles.mixBlendMode = cssBlendMode as CSSProperties['mixBlendMode'];
    }
  }

  const effects = convertLayerEffects(layer, context);
  if (effects.dropShadow) {
    const shadow = effects.dropShadow;
    styles.boxShadow = `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.spread || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`;
  }

  const imageLayer: ImageLayer = {
    ...styles,
    value: getImageDataUrl(layer)
  };

  return imageLayer;
}

function convertTextStyles(textData: any, context: ConversionContext): CSSProperties {
  const styles: CSSProperties = {};

  if (textData.style) {
    const textStyle = textData.style as TextStyle;
    
    if (textStyle.font) {
      const font = textStyle.font as any;
      styles.fontFamily = font.name || font;
    }

    if (textStyle.fontSize !== undefined) {
      const fontSize = convertDimensionValue(textStyle.fontSize, false, context);
      styles.fontSize = fontSize;
    }

    const textStyleAny = textStyle as any;
    if (textStyleAny.fontWeight !== undefined) {
      styles.fontWeight = textStyleAny.fontWeight;
    }

    if (textStyle.fillColor) {
      const color = textStyle.fillColor as any;
      if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
        styles.color = rgbaToHex(color.r, color.g, color.b, color.a);
      }
    }

    if (textStyle.tracking !== undefined) {
      styles.letterSpacing = `${textStyle.tracking}px`;
    }

    if (textStyle.leading !== undefined) {
      const lineHeight = convertDimensionValue(textStyle.leading, false, context);
      styles.lineHeight = lineHeight;
    }

    if (textStyleAny.strikethrough) {
      styles.textDecoration = (styles.textDecoration || '') + ' line-through';
    }

    if (textStyleAny.underline) {
      styles.textDecoration = (styles.textDecoration || '') + ' underline';
    }

    if (textStyleAny.allCaps) {
      styles.textTransform = 'uppercase';
    } else if (textStyleAny.smallCaps) {
      styles.fontVariant = 'small-caps';
    }
  }

  if (textData.paragraphStyle) {
    const paragraphStyle = textData.paragraphStyle as any;
    
    if (paragraphStyle.align !== undefined) {
      const alignmentMap: { [key: number]: CSSProperties['textAlign'] } = {
        0: 'left',
        1: 'center',
        2: 'right',
        3: 'justify'
      };
      styles.textAlign = alignmentMap[paragraphStyle.align] || 'left';
    }

    if (paragraphStyle.indent !== undefined) {
      styles.textIndent = `${paragraphStyle.indent}px`;
    }
  }

  return styles;
}

function convertLayerEffects(layer: Layer, _context: ConversionContext): EffectInfo {
  const effects: EffectInfo = {};

  if (layer.effects) {
    const effectsArray = Array.isArray(layer.effects) ? layer.effects : Object.values(layer.effects);
    for (const effect of effectsArray) {
      const effectAny = effect as any;
      switch (effectAny.type) {
        case 'dropShadow':
          const dropShadowColor = effectAny.color ? 
            rgbaToHex(effectAny.color.r || 0, effectAny.color.g || 0, effectAny.color.b || 0, effectAny.opacity) : 
            undefined;
          effects.dropShadow = {
            color: dropShadowColor,
            offsetX: effectAny.distance ? Math.cos(effectAny.angle || 0) * effectAny.distance : undefined,
            offsetY: effectAny.distance ? Math.sin(effectAny.angle || 0) * effectAny.distance : undefined,
            blur: effectAny.size,
            spread: effectAny.spread
          };
          break;
        case 'innerShadow':
          const innerShadowColor = effectAny.color ? 
            rgbaToHex(effectAny.color.r || 0, effectAny.color.g || 0, effectAny.color.b || 0, effectAny.opacity) : 
            undefined;
          effects.innerShadow = {
            color: innerShadowColor,
            offsetX: effectAny.distance ? Math.cos(effectAny.angle || 0) * effectAny.distance : undefined,
            offsetY: effectAny.distance ? Math.sin(effectAny.angle || 0) * effectAny.distance : undefined,
            blur: effectAny.size
          };
          break;
        case 'outerGlow':
          const outerGlowColor = effectAny.color ? 
            rgbaToHex(effectAny.color.r || 0, effectAny.color.g || 0, effectAny.color.b || 0, effectAny.opacity) : 
            undefined;
          effects.outerGlow = {
            color: outerGlowColor,
            size: effectAny.size,
            spread: effectAny.spread
          };
          break;
        case 'stroke':
          const strokeColor = effectAny.color ? 
            rgbaToHex(effectAny.color.r || 0, effectAny.color.g || 0, effectAny.color.b || 0, effectAny.opacity) : 
            undefined;
          effects.stroke = {
            color: strokeColor,
            width: effectAny.size
          };
          break;
      }
    }
  }

  return effects;
}

function getLayerBounds(layer: Layer): LayerBounds {
  return {
    left: layer.left || 0,
    top: layer.top || 0,
    right: layer.right || 0,
    bottom: layer.bottom || 0
  };
}

function getImageDataUrl(layer: Layer): string | undefined {
  if (layer.canvas && typeof layer.canvas.toDataURL === 'function') {
    try {
      return layer.canvas.toDataURL();
    } catch (error) {
      console.warn('Failed to convert canvas to data URL:', error);
    }
  }
  
  return undefined;
}