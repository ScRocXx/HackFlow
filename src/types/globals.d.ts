declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'gifenc' {
  export interface GIFEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface WriteFrameOptions {
    palette?: number[][];
    delay?: number;
    dispose?: number;
    transparent?: boolean;
    transparentIndex?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame(pixels: Uint8Array | number[], width: number, height: number, opts?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;
  export function quantize(rgba: Uint8Array | number[], maxColors?: number, opts?: any): number[][];
  export function applyPalette(rgba: Uint8Array | number[], palette: number[][], format?: string): Uint8Array;
}
