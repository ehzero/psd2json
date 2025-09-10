import { CSSProperties } from 'react';
import { 
  Layer, 
  LayerTextData,
  Color,
  RGBA,
  RGB,
  FRGB,
  CMYK,
  HSB,
  LAB,
  Grayscale,
  LayerEffectsInfo,
  EffectSolidGradient,
  EffectNoiseGradient,
  Font,
  Justification,
  GradientStyle
} from 'ag-psd';
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

  // Apply layer effects
  const effects = convertLayerEffects(layer, context);
  applyEffectsToStyles(styles, effects, true); // true for text layer

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

  // Apply layer effects
  const effects = convertLayerEffects(layer, context);
  applyEffectsToStyles(styles, effects, false); // false for image layer

  const imageLayer: ImageLayer = {
    ...styles,
    value: getImageDataUrl(layer)
  };

  return imageLayer;
}

function convertTextStyles(textData: LayerTextData, context: ConversionContext): CSSProperties {
  const styles: CSSProperties = {};

  if (textData.style) {
    const textStyle = textData.style;
    
    if (textStyle.font) {
      const font = textStyle.font as Font;
      styles.fontFamily = font.name;
    }

    if (textStyle.fontSize !== undefined) {
      const fontSize = convertDimensionValue(textStyle.fontSize, false, context);
      styles.fontSize = fontSize;
    }

    // Handle font weight (not in standard TextStyle but might exist in extended properties)
    if ('fontWeight' in textStyle) {
      styles.fontWeight = (textStyle as unknown as { fontWeight?: string | number }).fontWeight;
    }

    if (textStyle.fauxBold) {
      styles.fontWeight = 'bold';
    }

    if (textStyle.fauxItalic) {
      styles.fontStyle = 'italic';
    }

    if (textStyle.fillColor) {
      const colorValue = convertColorToHex(textStyle.fillColor);
      if (colorValue) {
        styles.color = colorValue;
      }
    }

    if (textStyle.tracking !== undefined) {
      styles.letterSpacing = `${textStyle.tracking}px`;
    }

    if (textStyle.leading !== undefined) {
      const lineHeight = convertDimensionValue(textStyle.leading, false, context);
      styles.lineHeight = lineHeight;
    }

    if (textStyle.strikethrough) {
      styles.textDecoration = (styles.textDecoration || '') + ' line-through';
    }

    if (textStyle.underline) {
      styles.textDecoration = (styles.textDecoration || '') + ' underline';
    }

    if (textStyle.horizontalScale !== undefined && textStyle.horizontalScale !== 100) {
      styles.transform = `scaleX(${textStyle.horizontalScale / 100})`;
    }

    if (textStyle.baselineShift !== undefined) {
      styles.verticalAlign = `${textStyle.baselineShift}px`;
    }
  }

  if (textData.paragraphStyle) {
    const paragraphStyle = textData.paragraphStyle;
    
    if (paragraphStyle.justification !== undefined) {
      const justificationMap: Record<Justification, CSSProperties['textAlign']> = {
        'left': 'left',
        'right': 'right', 
        'center': 'center',
        'justify-left': 'justify',
        'justify-right': 'justify',
        'justify-center': 'justify',
        'justify-all': 'justify'
      };
      styles.textAlign = justificationMap[paragraphStyle.justification] || 'left';
    }

    if (paragraphStyle.firstLineIndent !== undefined) {
      styles.textIndent = `${paragraphStyle.firstLineIndent}px`;
    }

    if (paragraphStyle.startIndent !== undefined) {
      styles.marginLeft = `${paragraphStyle.startIndent}px`;
    }

    if (paragraphStyle.endIndent !== undefined) {
      styles.marginRight = `${paragraphStyle.endIndent}px`;
    }

    if (paragraphStyle.spaceBefore !== undefined) {
      styles.marginTop = `${paragraphStyle.spaceBefore}px`;
    }

    if (paragraphStyle.spaceAfter !== undefined) {
      styles.marginBottom = `${paragraphStyle.spaceAfter}px`;
    }
  }

  return styles;
}

function applyEffectsToStyles(styles: CSSProperties, effects: EffectInfo, isTextLayer: boolean): void {
  const shadowParts: string[] = [];
  
  // Handle drop shadow
  if (effects.dropShadow) {
    const shadow = effects.dropShadow;
    const shadowString = `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.spread ? `${shadow.spread}px ` : ''}${shadow.color || 'rgba(0,0,0,0.5)'}`;
    shadowParts.push(shadowString);
  }
  
  // Handle inner shadow (using inset)
  if (effects.innerShadow) {
    const shadow = effects.innerShadow;
    const shadowString = `inset ${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`;
    shadowParts.push(shadowString);
  }
  
  // Handle bevel
  if (effects.bevel) {
    shadowParts.push(effects.bevel.boxShadow || '');
  }
  
  // Apply box shadows
  if (shadowParts.length > 0) {
    styles.boxShadow = shadowParts.filter(Boolean).join(', ');
  }
  
  // Handle stroke
  if (effects.stroke) {
    const stroke = effects.stroke;
    if (stroke.color && stroke.width) {
      switch (stroke.position) {
        case 'inside':
          // Inside stroke can be approximated with box-shadow inset
          const insetStroke = `inset 0 0 0 ${stroke.width}px ${stroke.color}`;
          shadowParts.push(insetStroke);
          styles.boxShadow = shadowParts.filter(Boolean).join(', ');
          break;
        case 'outside':
        case 'center':
        default:
          styles.border = `${stroke.width}px solid ${stroke.color}`;
          break;
      }
    }
  }
  
  // Handle gradient overlay
  if (effects.gradientOverlay && effects.gradientOverlay.background) {
    if (isTextLayer && effects.gradientOverlay.clipPath) {
      // For text gradient effects
      styles.background = effects.gradientOverlay.background;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.backgroundClip = 'text';
      // Remove the original color to prevent conflicts
      delete styles.color;
    } else {
      // For regular gradient overlays
      styles.background = effects.gradientOverlay.background;
    }
  }
  
  // Handle pattern overlay
  if (effects.patternOverlay && effects.patternOverlay.background) {
    if (isTextLayer && effects.patternOverlay.clipPath) {
      // For text pattern effects
      styles.background = effects.patternOverlay.background;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.backgroundClip = 'text';
      delete styles.color;
    } else {
      styles.background = effects.patternOverlay.background;
    }
  }
  
  // Handle glows (using filter for better effect)
  const glowFilters: string[] = [];
  
  if (effects.outerGlow) {
    const glow = effects.outerGlow;
    if (glow.color && glow.size) {
      glowFilters.push(`drop-shadow(0 0 ${glow.size}px ${glow.color})`);
    }
  }
  
  if (effects.innerGlow) {
    const glow = effects.innerGlow;
    if (glow.color && glow.size) {
      // Inner glow is harder to achieve with CSS, using drop-shadow as approximation
      glowFilters.push(`drop-shadow(0 0 ${glow.size}px ${glow.color})`);
    }
  }
  
  if (glowFilters.length > 0) {
    styles.filter = glowFilters.join(' ');
  }
}

function convertColorToHex(color: Color): string | undefined {
  if ('r' in color && 'g' in color && 'b' in color) {
    // RGBA or RGB
    const rgba = color as RGBA | RGB;
    const alpha = 'a' in rgba ? rgba.a : undefined;
    return rgbaToHex(rgba.r / 255, rgba.g / 255, rgba.b / 255, alpha !== undefined ? alpha / 255 : undefined);
  }
  
  if ('fr' in color && 'fg' in color && 'fb' in color) {
    // FRGB (float RGB)
    const frgb = color as FRGB;
    return rgbaToHex(frgb.fr, frgb.fg, frgb.fb);
  }
  
  if ('k' in color) {
    // Grayscale
    const gray = color as Grayscale;
    const value = 1 - (gray.k / 255); // Grayscale k is inverted
    return rgbaToHex(value, value, value);
  }
  
  if ('h' in color && 's' in color && 'b' in color) {
    // HSB - convert to RGB
    const hsb = color as HSB;
    const rgb = hsbToRgb(hsb.h, hsb.s, hsb.b);
    return rgbaToHex(rgb.r, rgb.g, rgb.b);
  }
  
  if ('c' in color && 'm' in color && 'y' in color && 'k' in color) {
    // CMYK - convert to RGB
    const cmyk = color as CMYK;
    const rgb = cmykToRgb(cmyk.c / 255, cmyk.m / 255, cmyk.y / 255, cmyk.k / 255);
    return rgbaToHex(rgb.r, rgb.g, rgb.b);
  }
  
  if ('l' in color && 'a' in color && 'b' in color) {
    // LAB - simplified conversion to RGB
    const lab = color as LAB;
    const rgb = labToRgb(lab.l, lab.a, lab.b);
    return rgbaToHex(rgb.r, rgb.g, rgb.b);
  }
  
  return undefined;
}

function hsbToRgb(h: number, s: number, b: number): { r: number; g: number; b: number } {
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;
  
  let r: number, g: number, bl: number;
  
  if (h >= 0 && h < 60) {
    [r, g, bl] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, bl] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, bl] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, bl] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, bl] = [x, 0, c];
  } else {
    [r, g, bl] = [c, 0, x];
  }
  
  return {
    r: r + m,
    g: g + m,
    b: bl + m
  };
}

function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  return {
    r: 1 - Math.min(1, c * (1 - k) + k),
    g: 1 - Math.min(1, m * (1 - k) + k),
    b: 1 - Math.min(1, y * (1 - k) + k)
  };
}

function labToRgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  // Simplified LAB to RGB conversion
  // This is not colorimetrically accurate but provides reasonable approximation
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;
  
  const xyz = {
    x: 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787),
    y: 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787),
    z: 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787)
  };
  
  let r = xyz.x *  3.2406 + xyz.y * -1.5372 + xyz.z * -0.4986;
  let g = xyz.x * -0.9689 + xyz.y *  1.8758 + xyz.z *  0.0415;
  let bl = xyz.x *  0.0557 + xyz.y * -0.2040 + xyz.z *  1.0570;
  
  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
  bl = (bl > 0.0031308) ? (1.055 * Math.pow(bl, 1/2.4) - 0.055) : 12.92 * bl;
  
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, bl))
  };
}

function convertLayerEffects(layer: Layer, _context: ConversionContext): EffectInfo {
  const effects: EffectInfo = {};

  if (layer.effects) {
    const layerEffects = layer.effects as LayerEffectsInfo;
    
    // Handle drop shadow
    if (layerEffects.dropShadow && layerEffects.dropShadow.length > 0) {
      const dropShadow = layerEffects.dropShadow[0]; // Use first drop shadow
      if (dropShadow && dropShadow.enabled !== false) {
        const color = dropShadow.color ? convertColorToHex(dropShadow.color) : undefined;
        const distance = dropShadow.distance?.value || 0;
        const angle = dropShadow.angle || 0;
        const angleRad = (angle * Math.PI) / 180;
        
        effects.dropShadow = {
          color,
          offsetX: Math.cos(angleRad) * distance,
          offsetY: Math.sin(angleRad) * distance,
          blur: dropShadow.size?.value,
          spread: dropShadow.choke?.value
        };
      }
    }

    // Handle inner shadow
    if (layerEffects.innerShadow && layerEffects.innerShadow.length > 0) {
      const innerShadow = layerEffects.innerShadow[0]; // Use first inner shadow
      if (innerShadow && innerShadow.enabled !== false) {
        const color = innerShadow.color ? convertColorToHex(innerShadow.color) : undefined;
        const distance = innerShadow.distance?.value || 0;
        const angle = innerShadow.angle || 0;
        const angleRad = (angle * Math.PI) / 180;
        
        effects.innerShadow = {
          color,
          offsetX: Math.cos(angleRad) * distance,
          offsetY: Math.sin(angleRad) * distance,
          blur: innerShadow.size?.value
        };
      }
    }

    // Handle outer glow
    if (layerEffects.outerGlow && layerEffects.outerGlow.enabled !== false) {
      const outerGlow = layerEffects.outerGlow;
      const color = outerGlow.color ? convertColorToHex(outerGlow.color) : undefined;
      
      effects.outerGlow = {
        color,
        size: outerGlow.size?.value,
        spread: outerGlow.choke?.value
      };
    }

    // Handle inner glow
    if (layerEffects.innerGlow && layerEffects.innerGlow.enabled !== false) {
      const innerGlow = layerEffects.innerGlow;
      const color = innerGlow.color ? convertColorToHex(innerGlow.color) : undefined;
      
      effects.innerGlow = {
        color,
        size: innerGlow.size?.value,
        spread: innerGlow.choke?.value
      };
    }

    // Handle stroke
    if (layerEffects.stroke && layerEffects.stroke.length > 0) {
      const stroke = layerEffects.stroke[0]; // Use first stroke
      if (stroke && stroke.enabled !== false) {
        const color = stroke.color ? convertColorToHex(stroke.color) : undefined;
        
        effects.stroke = {
          color,
          width: stroke.size?.value,
          position: stroke.position
        };
      }
    }

    // Handle gradient overlay
    if (layerEffects.gradientOverlay && layerEffects.gradientOverlay.length > 0) {
      const gradientOverlay = layerEffects.gradientOverlay[0]; // Use first gradient overlay
      if (gradientOverlay && gradientOverlay.enabled !== false && gradientOverlay.gradient) {
        const background = convertGradientToCss(gradientOverlay.gradient, gradientOverlay.type, gradientOverlay.angle);
        
        effects.gradientOverlay = {
          background,
          clipPath: true // Enable text clipping for gradient text effects
        };
      }
    }

    // Handle pattern overlay
    if (layerEffects.patternOverlay && layerEffects.patternOverlay.enabled !== false) {
      const patternOverlay = layerEffects.patternOverlay;
      
      if (patternOverlay.pattern) {
        // For pattern overlays, we'd need the pattern data to create a CSS background
        // This is a simplified implementation
        effects.patternOverlay = {
          background: `url(data:image/png;base64,${patternOverlay.pattern.name || ''})`,
          clipPath: true
        };
      }
    }

    // Handle bevel and emboss
    if (layerEffects.bevel && layerEffects.bevel.enabled !== false) {
      const bevel = layerEffects.bevel;
      const highlightColor = bevel.highlightColor ? convertColorToHex(bevel.highlightColor) : 'rgba(255,255,255,0.5)';
      const shadowColor = bevel.shadowColor ? convertColorToHex(bevel.shadowColor) : 'rgba(0,0,0,0.5)';
      const size = bevel.size?.value || 1;
      const angle = bevel.angle || 120;
      const angleRad = (angle * Math.PI) / 180;
      
      const highlightX = Math.cos(angleRad) * size;
      const highlightY = Math.sin(angleRad) * size;
      const shadowX = -highlightX;
      const shadowY = -highlightY;
      
      effects.bevel = {
        boxShadow: `${highlightX}px ${highlightY}px 0px ${highlightColor}, ${shadowX}px ${shadowY}px 0px ${shadowColor}`
      };
    }
  }

  return effects;
}

function convertGradientToCss(
  gradient: EffectSolidGradient | EffectNoiseGradient, 
  type?: GradientStyle, 
  angle?: number
): string {
  if (gradient.type === 'noise') {
    // Noise gradients are complex and don't have a direct CSS equivalent
    // Return a simplified solid color or pattern
    return 'linear-gradient(45deg, #888, #aaa)';
  }

  const solidGradient = gradient as EffectSolidGradient;
  if (!solidGradient.colorStops || solidGradient.colorStops.length === 0) {
    return 'transparent';
  }

  // Convert color stops
  const colorStops = solidGradient.colorStops
    .map(stop => {
      const color = convertColorToHex(stop.color);
      const position = `${(stop.location * 100).toFixed(1)}%`;
      return color ? `${color} ${position}` : null;
    })
    .filter(Boolean)
    .join(', ');

  if (!colorStops) {
    return 'transparent';
  }

  // Convert gradient type and angle to CSS
  const gradientAngle = angle !== undefined ? angle : 0;
  
  switch (type) {
    case 'radial':
      return `radial-gradient(circle at center, ${colorStops})`;
    
    case 'angle':
      return `conic-gradient(from ${gradientAngle}deg at center, ${colorStops})`;
    
    case 'reflected':
      // CSS doesn't have reflected gradients, use repeating linear
      return `repeating-linear-gradient(${gradientAngle}deg, ${colorStops})`;
    
    case 'diamond':
      // Diamond gradients don't have a direct CSS equivalent, use radial
      return `radial-gradient(ellipse at center, ${colorStops})`;
    
    case 'linear':
    default:
      return `linear-gradient(${gradientAngle}deg, ${colorStops})`;
  }
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