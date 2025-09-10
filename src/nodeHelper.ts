import { initializeCanvas } from 'ag-psd';

/**
 * Initialize canvas for Node.js environment
 * This is required for processing PSD files with image data in Node.js
 * 
 * @param canvasPackage - The canvas package import (require('canvas'))
 * @example
 * ```typescript
 * import * as canvas from 'canvas';
 * import { initializePsd2JsonForNode } from 'psd2json/node';
 * 
 * initializePsd2JsonForNode(canvas);
 * ```
 */
export function initializePsd2JsonForNode(canvasPackage: any): void {
  if (!canvasPackage?.createCanvas) {
    throw new Error(
      'Invalid canvas package. Please install and pass the canvas package:\n' +
      'npm install canvas\n' +
      'import * as canvas from "canvas";\n' +
      'initializePsd2JsonForNode(canvas);'
    );
  }
  
  initializeCanvas(canvasPackage.createCanvas);
}