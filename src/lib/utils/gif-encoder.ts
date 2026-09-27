/**
 * Self-contained GIF89a encoder for dynamic countdown timers.
 * Pure TypeScript implementation with zero external dependencies.
 */

const EOF = -1;
const BITS = 12;
const DEFAULT_HSIZE = 5003;
const MASKS = [
  0x0000, 0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f,
  0x00ff, 0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff,
];

function createStream(initialCapacity = 256) {
  let cursor = 0;
  let contents = new Uint8Array(initialCapacity);

  function expand(newCapacity: number) {
    const prevCapacity = contents.length;
    if (prevCapacity >= newCapacity) return;
    const CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(
      newCapacity,
      (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0
    );
    if (prevCapacity !== 0) newCapacity = Math.max(newCapacity, 256);
    const oldContents = contents;
    contents = new Uint8Array(newCapacity);
    if (cursor > 0) contents.set(oldContents.subarray(0, cursor), 0);
  }

  return {
    reset() {
      cursor = 0;
    },
    bytes() {
      return contents.slice(0, cursor);
    },
    bytesView() {
      return contents.subarray(0, cursor);
    },
    writeByte(byte: number) {
      expand(cursor + 1);
      contents[cursor] = byte;
      cursor++;
    },
    writeBytes(data: number[] | Uint8Array, offset = 0, byteLength = data.length) {
      expand(cursor + byteLength);
      for (let i = 0; i < byteLength; i++) {
        contents[cursor++] = data[i + offset];
      }
    },
    writeBytesView(data: Uint8Array, offset = 0, byteLength = data.byteLength) {
      expand(cursor + byteLength);
      contents.set(data.subarray(offset, offset + byteLength), cursor);
      cursor += byteLength;
    },
  };
}

function lzwEncode(
  width: number,
  height: number,
  pixels: Uint8Array,
  colorDepth: number,
  outStream: ReturnType<typeof createStream>,
  accum = new Uint8Array(256),
  htab = new Int32Array(DEFAULT_HSIZE),
  codetab = new Int32Array(DEFAULT_HSIZE)
) {
  const hsize = htab.length;
  const initCodeSize = Math.max(2, colorDepth);

  accum.fill(0);
  codetab.fill(0);
  htab.fill(-1);

  let cur_accum = 0;
  let cur_bits = 0;
  const init_bits = initCodeSize + 1;
  const g_init_bits = init_bits;

  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = (1 << n_bits) - 1;

  const ClearCode = 1 << (init_bits - 1);
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0;

  let ent = pixels[0];

  let hshift = 0;
  for (let fcode = hsize; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift;

  outStream.writeByte(initCodeSize);
  output(ClearCode);

  const length = pixels.length;
  for (let idx = 1; idx < length; idx++) {
    next_block: {
      const c = pixels[idx];
      const fcode = (c << BITS) + ent;
      let i = (c << hshift) ^ ent;
      if (htab[i] === fcode) {
        ent = codetab[i];
        break next_block;
      }

      const disp = i === 0 ? 1 : hsize - i;
      while (htab[i] >= 0) {
        i -= disp;
        if (i < 0) i += hsize;
        if (htab[i] === fcode) {
          ent = codetab[i];
          break next_block;
        }
      }
      output(ent);
      ent = c;
      if (free_ent < 1 << BITS) {
        codetab[i] = free_ent++;
        htab[i] = fcode;
      } else {
        htab.fill(-1);
        free_ent = ClearCode + 2;
        clear_flg = true;
        output(ClearCode);
      }
    }
  }

  output(ent);
  output(EOFCode);
  outStream.writeByte(0);
  return outStream.bytesView();

  function output(code: number) {
    cur_accum &= MASKS[cur_bits];
    if (cur_bits > 0) cur_accum |= code << cur_bits;
    else cur_accum = code;

    cur_bits += n_bits;

    while (cur_bits >= 8) {
      accum[a_count++] = cur_accum & 0xff;
      if (a_count >= 254) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
      cur_accum >>= 8;
      cur_bits -= 8;
    }

    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = (1 << n_bits) - 1;
        clear_flg = false;
      } else {
        ++n_bits;
        maxcode = n_bits === BITS ? 1 << n_bits : (1 << n_bits) - 1;
      }
    }

    if (code === EOFCode) {
      while (cur_bits > 0) {
        accum[a_count++] = cur_accum & 0xff;
        if (a_count >= 254) {
          outStream.writeByte(a_count);
          outStream.writeBytesView(accum, 0, a_count);
          a_count = 0;
        }
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      if (a_count > 0) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
    }
  }
}

function writeUInt16(stream: ReturnType<typeof createStream>, short: number) {
  stream.writeByte(short & 0xff);
  stream.writeByte((short >> 8) & 0xff);
}

function writeUTFBytes(stream: ReturnType<typeof createStream>, text: string) {
  for (let i = 0; i < text.length; i++) {
    stream.writeByte(text.charCodeAt(i));
  }
}

function colorTableSize(length: number) {
  return Math.max(Math.ceil(Math.log2(length)), 1);
}

function encodeGraphicControlExt(
  stream: ReturnType<typeof createStream>,
  dispose: number,
  delay: number,
  transparent: boolean,
  transparentIndex: number
) {
  stream.writeByte(0x21);
  stream.writeByte(0xf9);
  stream.writeByte(4);

  if (transparentIndex < 0) {
    transparentIndex = 0x00;
    transparent = false;
  }

  let transp: number, disp: number;
  if (!transparent) {
    transp = 0;
    disp = 0;
  } else {
    transp = 1;
    disp = 2;
  }

  if (dispose >= 0) {
    disp = dispose & 7;
  }
  disp <<= 2;

  stream.writeByte(disp | transp);
  writeUInt16(stream, delay);
  stream.writeByte(transparentIndex || 0x00);
  stream.writeByte(0);
}

function encodeLogicalScreenDescriptor(
  stream: ReturnType<typeof createStream>,
  width: number,
  height: number,
  palette: number[][],
  colorDepth = 8
) {
  const globalColorTableFlag = 1;
  const sortFlag = 0;
  const globalColorTableSize = colorTableSize(palette.length) - 1;
  const fields =
    (globalColorTableFlag << 7) |
    ((colorDepth - 1) << 4) |
    (sortFlag << 3) |
    globalColorTableSize;
  const backgroundColorIndex = 0;
  const pixelAspectRatio = 0;
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
}

function encodeNetscapeExt(stream: ReturnType<typeof createStream>, repeat: number) {
  stream.writeByte(0x21);
  stream.writeByte(0xff);
  stream.writeByte(11);
  writeUTFBytes(stream, "NETSCAPE2.0");
  stream.writeByte(3);
  stream.writeByte(1);
  writeUInt16(stream, repeat);
  stream.writeByte(0);
}

function encodeColorTable(stream: ReturnType<typeof createStream>, palette: number[][]) {
  const colorTableLength = 1 << colorTableSize(palette.length);
  for (let i = 0; i < colorTableLength; i++) {
    const color = i < palette.length ? palette[i] : [0, 0, 0];
    stream.writeByte(color[0]);
    stream.writeByte(color[1]);
    stream.writeByte(color[2]);
  }
}

function encodeImageDescriptor(stream: ReturnType<typeof createStream>, width: number, height: number) {
  stream.writeByte(0x2c);
  writeUInt16(stream, 0);
  writeUInt16(stream, 0);
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeByte(0); // global palette
}

export interface WriteFrameOptions {
  palette?: number[][];
  delay?: number;
  dispose?: number;
  transparent?: boolean;
  transparentIndex?: number;
  repeat?: number;
  colorDepth?: number;
}

export function createGifEncoder(initialCapacity = 4096) {
  const stream = createStream(initialCapacity);
  const HSIZE = DEFAULT_HSIZE;
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);
  let hasInit = false;

  return {
    reset() {
      stream.reset();
      hasInit = false;
    },
    finish() {
      stream.writeByte(0x3b); // GIF trailer
    },
    bytes(): Uint8Array {
      return stream.bytes();
    },
    bytesView(): Uint8Array {
      return stream.bytesView();
    },
    writeFrame(pixels: Uint8Array, width: number, height: number, opts: WriteFrameOptions = {}) {
      const {
        transparent = false,
        transparentIndex = 0x00,
        delay = 0,
        palette = null,
        repeat = 0,
        colorDepth = 8,
        dispose = -1,
      } = opts;

      if (!hasInit) {
        if (!palette) {
          throw new Error("First frame must include a { palette } option");
        }
        writeUTFBytes(stream, "GIF89a");
        encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
        encodeColorTable(stream, palette);
        if (repeat >= 0) {
          encodeNetscapeExt(stream, repeat);
        }
        hasInit = true;
      }

      const delayTime = Math.round(delay / 10);
      encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
      encodeImageDescriptor(stream, width, height);
      lzwEncode(width, height, pixels, colorDepth, stream, accum, htab, codetab);
    },
  };
}
