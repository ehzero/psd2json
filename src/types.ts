import { CSSProperties } from 'react';

export interface ConversionOptions {
  logging?: boolean;
  includeHidden?: boolean;
  units?: 'px' | 'percent';
}

export interface TextLayer extends CSSProperties {
  value: string | undefined;
}

export interface ImageLayer extends CSSProperties {
  value: string | undefined;
}

export interface ConversionResult {
  texts: TextLayer[];
  images: ImageLayer[];
}

export interface PsdDimensions {
  width: number;
  height: number;
}

export interface LayerBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ConversionContext {
  psdDimensions: PsdDimensions;
  options: Required<ConversionOptions>;
  logging: boolean;
}

export interface TextStyleInfo {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: string;
  textDecoration?: string;
}

export interface EffectInfo {
  dropShadow?: {
    color: string | undefined;
    offsetX: number | undefined;
    offsetY: number | undefined;
    blur: number | undefined;
    spread: number | undefined;
  };
  innerShadow?: {
    color: string | undefined;
    offsetX: number | undefined;
    offsetY: number | undefined;
    blur: number | undefined;
  };
  outerGlow?: {
    color: string | undefined;
    size: number | undefined;
    spread: number | undefined;
  };
  innerGlow?: {
    color: string | undefined;
    size: number | undefined;
    spread: number | undefined;
  };
  stroke?: {
    color: string | undefined;
    width: number | undefined;
    position: 'inside' | 'center' | 'outside' | undefined;
  };
  gradientOverlay?: {
    background: string | undefined;
    clipPath?: boolean; // For text gradient effects
  };
  patternOverlay?: {
    background: string | undefined;
    clipPath?: boolean;
  };
  bevel?: {
    boxShadow: string | undefined;
  };
}