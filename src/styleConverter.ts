import { CSSProperties } from "react";
import {
  Layer,
  LayerEffectsInfo,
  EffectSolidGradient,
  EffectNoiseGradient,
  Font,
  GradientStyle,
} from "ag-psd";
import {
  ConversionContext,
  EffectInfo,
  LayerBounds,
  TextLayer,
  ImageLayer,
} from "./types";
import {
  convertDimensionValue,
  convertBlendMode,
  log,
  normalizeColorObject,
  normalizeUnitsValue,
  convertColorToHex,
  getTextLayerBoundingBox,
  getRealFontSize,
  normalizeStopLocationToPercent,
  formatPercent,
} from "./utils";

export function convertTextLayer(
  layer: Layer,
  context: ConversionContext
): TextLayer {
  log(context, `Converting text layer: ${layer.name || "Unnamed"}`);

  // 텍스트 레이어는 transform matrix를 고려한 정확한 위치 계산 사용
  const textBounds = getTextLayerBoundingBox(layer);
  const styles = getBaseLayerStyles(layer, context, textBounds);

  // 텍스트 특화 스타일 적용
  if (layer.text) {
    const textStyles = convertTextStyles(layer, context);
    Object.assign(styles, textStyles);
  }

  // Apply layer effects
  const effects = convertLayerEffects(layer);
  applyEffectsToStyles(styles, effects, true); // true for text layer

  return {
    ...styles,
    value: layer.text?.text || "",
  };
}

export function convertImageLayer(
  layer: Layer,
  context: ConversionContext
): ImageLayer {
  log(context, `Converting image layer: ${layer.name || "Unnamed"}`);

  const styles = getBaseLayerStyles(layer, context);

  // Apply layer effects
  const effects = convertLayerEffects(layer);
  applyEffectsToStyles(styles, effects, false); // false for image layer

  return {
    ...styles,
    value: getImageDataUrl(layer),
  };
}

function convertTextStyles(
  layer: Layer,
  _context: ConversionContext
): CSSProperties {
  const styles: CSSProperties = {};
  const textData = layer.text;

  if (textData?.style) {
    const textStyle = textData.style;

    if (textStyle.font) {
      const font = textStyle.font as Font;
      styles.fontFamily = font.name;
    }

    // 개선된 폰트 크기 계산 (transform matrix 반영)
    if (textStyle.fontSize !== undefined) {
      const realFontSize = getRealFontSize(layer);
      if (realFontSize > 0) {
        styles.fontSize = `${realFontSize}px`;
      } else {
        const fontSize = convertDimensionValue(
          textStyle.fontSize
        );
        styles.fontSize = fontSize;
      }
    }

    // Handle font weight (not in standard TextStyle but might exist in extended properties)
    if ("fontWeight" in textStyle) {
      styles.fontWeight = (
        textStyle as unknown as { fontWeight?: string | number }
      ).fontWeight;
    }

    if (textStyle.fauxBold) {
      styles.fontWeight = "bold";
    }

    if (textStyle.fauxItalic) {
      styles.fontStyle = "italic";
    }

    // 개선된 색상 변환 (다양한 색상 형식 지원)
    if (textStyle.fillColor) {
      const colorValue = convertColorToHex(textStyle.fillColor);
      if (colorValue) {
        styles.color = colorValue;
      }
    }

    // 개선된 자간 처리 (tracking을 em 단위로 변환)
    if (textStyle.tracking !== undefined) {
      // tracking을 em 단위로 변환 (PSD tracking은 1/1000 em 단위)
      styles.letterSpacing = `${(textStyle.tracking / 1000).toFixed(3)}em`;
    }

    // 개선된 줄 높이 계산 (leading을 fontSize 대비 비율로 변환)
    if (textStyle.leading !== undefined) {
      const fontSize = textStyle.fontSize || 12;
      styles.lineHeight = Math.max(1, textStyle.leading / fontSize);
    }

    // 텍스트 정렬 (styleRunAlignment 사용)
    if (textStyle.styleRunAlignment !== undefined) {
      styles.textAlign = convertTextAlignment(textStyle.styleRunAlignment);
    }

    // 텍스트 장식 개선
    const decorations = [];
    if (textStyle.underline) decorations.push("underline");
    if (textStyle.strikethrough) decorations.push("line-through");
    if (decorations.length > 0) {
      styles.textDecoration = decorations.join(" ");
    }

    if (
      textStyle.horizontalScale !== undefined &&
      textStyle.horizontalScale !== 100
    ) {
      styles.transform = `scaleX(${textStyle.horizontalScale / 100})`;
    }

    // 베이스라인
    if (textStyle.baselineShift !== undefined) {
      styles.verticalAlign = `${textStyle.baselineShift}px`;
    }

    // 자동 커닝
    if (textStyle.autoKerning === false) {
      styles.fontKerning = "none";
    }

    // 리가처
    if (textStyle.ligatures === false) {
      styles.fontVariantLigatures = "none";
    }
  }

  if (textData?.paragraphStyle) {
    const paragraphStyle = textData.paragraphStyle;

    if (paragraphStyle.justification !== undefined) {
      if (typeof paragraphStyle.justification === 'number') {
        const justificationMap: Record<number, CSSProperties["textAlign"]> = {
          0: "left",
          1: "center",
          2: "right",
          3: "justify"
        };
        styles.textAlign = justificationMap[paragraphStyle.justification] || "left";
      } else if (typeof paragraphStyle.justification === 'string') {
        styles.textAlign = paragraphStyle.justification as CSSProperties["textAlign"];
      }
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

/**
 * 텍스트 정렬을 CSS 호환 형식으로 변환합니다.
 */
function convertTextAlignment(alignment: any): CSSProperties["textAlign"] {
  if (typeof alignment === "string") {
    const alignmentMap: Record<string, CSSProperties["textAlign"]> = {
      left: "left",
      center: "center",
      right: "right",
      justify: "justify",
    };
    return alignmentMap[alignment.toLowerCase()] || "left";
  }

  // PSD 정수 값으로 정렬이 저장된 경우
  if (typeof alignment === "number") {
    const alignmentMap: Record<number, CSSProperties["textAlign"]> = {
      0: "left",
      1: "right",
      2: "center",
      3: "justify",
    };
    return alignmentMap[alignment] || "left";
  }

  return "left";
}

/**
 * 레이어의 기본 스타일(위치, 크기, 투명도, 블렌드 모드)을 생성합니다.
 */
function getBaseLayerStyles(
  layer: Layer,
  _context: ConversionContext,
  customBounds?: { left: number; top: number; width: number; height: number }
): CSSProperties {
  let left: number, top: number, width: number, height: number;

  if (customBounds) {
    ({ left, top, width, height } = customBounds);
  } else {
    const bounds = getLayerBounds(layer);
    left = bounds.left;
    top = bounds.top;
    width = bounds.right - bounds.left;
    height = bounds.bottom - bounds.top;
  }

  const styles: CSSProperties = {
    position: "absolute",
    left: convertDimensionValue(left),
    top: convertDimensionValue(top),
    width: convertDimensionValue(width),
    height: convertDimensionValue(height),
  };

  if (layer.opacity !== undefined && layer.opacity < 1) {
    styles.opacity = layer.opacity;
  }

  if (layer.blendMode) {
    const cssBlendMode = convertBlendMode(layer.blendMode);
    if (cssBlendMode) {
      styles.mixBlendMode = cssBlendMode as CSSProperties["mixBlendMode"];
    }
  }

  return styles;
}

function applyEffectsToStyles(
  styles: CSSProperties,
  effects: EffectInfo,
  isTextLayer: boolean
): void {
  const shadowParts: string[] = [];
  const textShadowParts: string[] = [];

  // Handle drop shadow - 개선된 적용
  if (effects.dropShadow) {
    const shadow = effects.dropShadow;
    const shadowString = `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${
      shadow.blur || 0
    }px${shadow.spread && !isTextLayer ? ` ${shadow.spread}px` : ""} ${
      shadow.color || "rgba(0,0,0,0.5)"
    }`;

    if (isTextLayer) {
      textShadowParts.push(shadowString);
    } else {
      shadowParts.push(shadowString);
    }
  }

  // Handle inner shadow (using inset)
  if (effects.innerShadow) {
    const shadow = effects.innerShadow;
    const shadowString = `inset ${shadow.offsetX || 0}px ${
      shadow.offsetY || 0
    }px ${shadow.blur || 0}px ${shadow.color || "rgba(0,0,0,0.5)"}`;
    shadowParts.push(shadowString);
  }

  // Handle outer glow - box-shadow/text-shadow로 적용
  if (effects.outerGlow) {
    const glow = effects.outerGlow;
    if (glow.color && glow.size) {
      const glowString = `0px 0px ${glow.size}px${
        glow.spread && !isTextLayer ? ` ${glow.spread}px` : ""
      } ${glow.color}`;

      if (isTextLayer) {
        textShadowParts.push(glowString);
      } else {
        shadowParts.push(glowString);
      }
    }
  }

  // Handle inner glow - inset box-shadow로 적용
  if (effects.innerGlow) {
    const glow = effects.innerGlow;
    if (glow.color && glow.size) {
      if (!isTextLayer) {
        const glowString = `inset 0px 0px ${glow.size}px ${glow.color}`;
        shadowParts.push(glowString);
      }
    }
  }

  // Handle bevel
  if (effects.bevel) {
    shadowParts.push(effects.bevel.boxShadow || "");
  }

  // Apply shadows
  if (shadowParts.length > 0) {
    styles.boxShadow = shadowParts.filter(Boolean).join(", ");
  }

  if (textShadowParts.length > 0) {
    styles.textShadow = textShadowParts.filter(Boolean).join(", ");
  }

  // Handle stroke - 개선된 스트로크 처리
  if (effects.stroke) {
    const stroke = effects.stroke;
    if (stroke.color && stroke.width) {
      if (isTextLayer) {
        // 텍스트 레이어는 WebkitTextStroke 사용
        styles.WebkitTextStrokeWidth = `${stroke.width}px`;
        styles.WebkitTextStrokeColor = stroke.color;
      } else {
        // 이미지 레이어는 border 또는 box-shadow 사용
        switch (stroke.position) {
          case "inside":
            const insetStroke = `inset 0 0 0 ${stroke.width}px ${stroke.color}`;
            const existingBoxShadow = styles.boxShadow || "";
            styles.boxShadow = existingBoxShadow
              ? `${existingBoxShadow}, ${insetStroke}`
              : insetStroke;
            break;
          case "outside":
          case "center":
          default:
            styles.border = `${stroke.width}px solid ${stroke.color}`;
            break;
        }
      }
    }
  }

  // Handle gradient overlay - 개선된 그라디언트 처리
  if (effects.gradientOverlay && effects.gradientOverlay.background) {
    if (isTextLayer && effects.gradientOverlay.clipPath) {
      // 텍스트 그라디언트 효과
      styles.background = effects.gradientOverlay.background;
      styles.WebkitBackgroundClip = "text";
      styles.WebkitTextFillColor = "transparent";
      styles.backgroundClip = "text";
      styles.color = "transparent";
    } else {
      // 일반 그라디언트 오버레이
      styles.background = effects.gradientOverlay.background;
    }
  }

  // Handle pattern overlay
  if (effects.patternOverlay && effects.patternOverlay.background) {
    if (isTextLayer && effects.patternOverlay.clipPath) {
      styles.background = effects.patternOverlay.background;
      styles.WebkitBackgroundClip = "text";
      styles.WebkitTextFillColor = "transparent";
      styles.backgroundClip = "text";
      styles.color = "transparent";
    } else {
      styles.background = effects.patternOverlay.background;
    }
  }
}

function convertLayerEffects(layer: Layer): EffectInfo {
  const effects: EffectInfo = {};

  if (layer.effects) {
    const layerEffects = layer.effects as LayerEffectsInfo;

    // Handle drop shadow
    if (layerEffects.dropShadow && layerEffects.dropShadow.length > 0) {
      const firstShadow = layerEffects.dropShadow[0];
      if (firstShadow && firstShadow.enabled !== false) {
        const distance = normalizeUnitsValue(firstShadow.distance);
        const angle = ((firstShadow.angle || 0) * Math.PI) / 180;
        const color = firstShadow.color
          ? convertColorToHex(firstShadow.color)
          : undefined;

        effects.dropShadow = {
          color,
          offsetX: Math.round(distance * Math.cos(angle)),
          offsetY: Math.round(distance * Math.sin(angle)),
          blur: normalizeUnitsValue(firstShadow.size),
          spread: normalizeUnitsValue(firstShadow.choke),
        };
      }
    }

    // Handle inner shadow - 개선된 구현
    if (layerEffects.innerShadow && layerEffects.innerShadow.length > 0) {
      const innerShadow = layerEffects.innerShadow[0];
      if (innerShadow && innerShadow.enabled !== false) {
        const distance = normalizeUnitsValue(innerShadow.distance);
        const angle = ((innerShadow.angle || 0) * Math.PI) / 180;
        const color = innerShadow.color
          ? convertColorToHex(innerShadow.color)
          : undefined;

        effects.innerShadow = {
          color,
          offsetX: Math.round(distance * Math.cos(angle)),
          offsetY: Math.round(distance * Math.sin(angle)),
          blur: normalizeUnitsValue(innerShadow.size),
        };
      }
    }

    // Handle outer glow - 개선된 구현
    if (layerEffects.outerGlow && layerEffects.outerGlow.enabled !== false) {
      const outerGlow = layerEffects.outerGlow;
      const color = outerGlow.color
        ? convertColorToHex(outerGlow.color)
        : undefined;

      effects.outerGlow = {
        color,
        size: normalizeUnitsValue(outerGlow.size),
        spread: normalizeUnitsValue(outerGlow.choke),
      };
    }

    // Handle inner glow - 개선된 구현
    if (layerEffects.innerGlow && layerEffects.innerGlow.enabled !== false) {
      const innerGlow = layerEffects.innerGlow;
      const color = innerGlow.color
        ? convertColorToHex(innerGlow.color)
        : undefined;

      effects.innerGlow = {
        color,
        size: normalizeUnitsValue(innerGlow.size),
        spread: normalizeUnitsValue(innerGlow.choke),
      };
    }

    // Handle stroke - 개선된 구현
    if (layerEffects.stroke && layerEffects.stroke.length > 0) {
      const stroke = layerEffects.stroke[0];
      if (stroke && stroke.enabled !== false) {
        const color = stroke.color
          ? convertColorToHex(stroke.color)
          : undefined;

        effects.stroke = {
          color,
          width: normalizeUnitsValue(stroke.size),
          position: stroke.position,
        };
      }
    }

    // Handle gradient overlay - 개선된 구현
    if (
      layerEffects.gradientOverlay &&
      layerEffects.gradientOverlay.length > 0
    ) {
      const gradientOverlay = layerEffects.gradientOverlay[0];
      if (
        gradientOverlay &&
        gradientOverlay.enabled !== false &&
        gradientOverlay.gradient
      ) {
        const background = convertGradientToCss(
          gradientOverlay.gradient,
          gradientOverlay.type,
          gradientOverlay.angle
        );

        effects.gradientOverlay = {
          background,
          clipPath: true,
        };
      }
    }

    // Handle pattern overlay
    if (
      layerEffects.patternOverlay &&
      layerEffects.patternOverlay.enabled !== false
    ) {
      const patternOverlay = layerEffects.patternOverlay;

      if (patternOverlay.pattern) {
        effects.patternOverlay = {
          background: `url(data:image/png;base64,${
            patternOverlay.pattern.name || ""
          })`,
          clipPath: true,
        };
      }
    }

    // Handle bevel and emboss
    if (layerEffects.bevel && layerEffects.bevel.enabled !== false) {
      const bevel = layerEffects.bevel;
      const highlightColor = bevel.highlightColor
        ? convertColorToHex(bevel.highlightColor)
        : "rgba(255,255,255,0.5)";
      const shadowColor = bevel.shadowColor
        ? convertColorToHex(bevel.shadowColor)
        : "rgba(0,0,0,0.5)";
      const size = normalizeUnitsValue(bevel.size) || 1;
      const angle = bevel.angle || 120;
      const angleRad = (angle * Math.PI) / 180;

      const highlightX = Math.cos(angleRad) * size;
      const highlightY = Math.sin(angleRad) * size;
      const shadowX = -highlightX;
      const shadowY = -highlightY;

      effects.bevel = {
        boxShadow: `${highlightX}px ${highlightY}px 0px ${highlightColor}, ${shadowX}px ${shadowY}px 0px ${shadowColor}`,
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
  if (gradient.type === "noise") {
    return "linear-gradient(45deg, #888, #aaa)";
  }

  const solidGradient = gradient as EffectSolidGradient;
  if (!solidGradient.colorStops || solidGradient.colorStops.length === 0) {
    return "transparent";
  }

  // 개선된 색상 스톱 변환
  const rawStops: any[] = (solidGradient as any).colorStops || [];
  const mappedStops = rawStops.map((stop: any, index: number) => {
    const color = stop.color || { r: 0, g: 0, b: 0 };
    const { r, g, b } = normalizeColorObject(color);
    const hexColor = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
    const pos = normalizeStopLocationToPercent(stop.location);
    return { hexColor, pos, index };
  });

  // 모든 위치가 같거나 유효하지 않으면 균등 분포로 재계산
  const validPositions = mappedStops.map((s) =>
    isFinite(s.pos) ? s.pos : NaN
  );
  const minPos = Math.min(...validPositions);
  const maxPos = Math.max(...validPositions);
  const allInvalid = validPositions.every((p) => isNaN(p));
  const allEqual = !allInvalid && minPos === maxPos;

  const n = mappedStops.length;
  const distributedStops = mappedStops.map((s, i) => {
    let pos = s.pos;
    if (allInvalid || allEqual) {
      pos = n > 1 ? (i / (n - 1)) * 100 : 0;
    }
    pos = Math.max(0, Math.min(100, pos));
    return { ...s, pos };
  });

  // 위치 기준으로 정렬
  distributedStops.sort((a, b) => a.pos - b.pos || a.index - b.index);

  const colorStops = distributedStops
    .map((s) => `${s.hexColor} ${formatPercent(s.pos)}%`)
    .join(", ");

  if (!colorStops) {
    return "transparent";
  }

  // 각도 변환 (PSD는 시계방향, CSS는 반시계방향)
  const gradientAngle = angle !== undefined ? angle : 0;
  const cssAngle = (90 - gradientAngle) % 360;

  switch (type) {
    case "radial":
      return `radial-gradient(circle at center, ${colorStops})`;

    case "angle":
      return `conic-gradient(from ${gradientAngle}deg at center, ${colorStops})`;

    case "reflected":
      return `repeating-linear-gradient(${cssAngle}deg, ${colorStops})`;

    case "diamond":
      return `radial-gradient(ellipse at center, ${colorStops})`;

    case "linear":
    default:
      return `linear-gradient(${cssAngle}deg, ${colorStops})`;
  }
}

/**
 * 숫자를 2자리 16진수로 변환합니다.
 */
function toHex2(n: number): string {
  return Math.round(n).toString(16).padStart(2, "0");
}

function getLayerBounds(layer: Layer): LayerBounds {
  return {
    left: layer.left || 0,
    top: layer.top || 0,
    right: layer.right || 0,
    bottom: layer.bottom || 0,
  };
}

function getImageDataUrl(layer: Layer): string | undefined {
  // 우선 canvas에서 시도
  if (layer.canvas && typeof layer.canvas.toDataURL === "function") {
    try {
      return layer.canvas.toDataURL("image/png");
    } catch (error) {
      console.warn("Failed to convert canvas to data URL:", error);
    }
  }

  // imageData에서 시도 (브라우저 환경에서만)
  if (layer.imageData && typeof document !== 'undefined') {
    try {
      const pixelData = layer.imageData;
      if (pixelData.width <= 0 || pixelData.height <= 0 || !pixelData.data) {
        return undefined;
      }

      const canvas = document.createElement("canvas");
      canvas.width = pixelData.width;
      canvas.height = pixelData.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const imageData = new ImageData(
          new Uint8ClampedArray(pixelData.data),
          pixelData.width,
          pixelData.height
        );
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL("image/png");
      }
    } catch (error) {
      console.warn("Failed to convert imageData to data URL:", error);
    }
  }

  return undefined;
}
