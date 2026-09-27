import { NextRequest, NextResponse } from 'next/server';
import { createGifEncoder } from '@/lib/utils/gif-encoder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Palette definition for HackFlow signature brutalist theme:
// 0: #ffffff (white)
// 1: #10201d (ink / border / shadow)
// 2: #34433f (dark teal subtext)
// 3: #f7f7f2 (warm cream card bg)
// 4: #f5b726 (signature amber alert)
// 5: #e53927 (urgent red)
// 6: #57726d (muted label)
// 7: #f2f2eb (outer cream bg)
// 8: #e97b77 (coral red for <24h)
const PALETTE = [
  [0xff, 0xff, 0xff], // 0
  [0x10, 0x20, 0x1d], // 1
  [0x34, 0x43, 0x3f], // 2
  [0xf7, 0xf7, 0xf2], // 3
  [0xf5, 0xb7, 0x26], // 4
  [0xe5, 0x39, 0x27], // 5
  [0x57, 0x72, 0x6d], // 6
  [0xf2, 0xf2, 0xeb], // 7
  [0xe9, 0x7b, 0x77], // 8
];

// Clean 5x7 bitmap font for 0-9 and symbols
const FONT_5X7: Record<string, number[]> = {
  '0': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ':': [0b00000, 0b00100, 0b00100, 0b00000, 0b00100, 0b00100, 0b00000],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  'D': [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
  'E': [0b11111, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000, 0b11111],
  'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  'I': [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  'P': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  'S': [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
};

// 3x5 bitmap font for crisp sub-labels
const FONT_3X5: Record<string, number[]> = {
  'A': [0b010, 0b101, 0b111, 0b101, 0b101],
  'C': [0b011, 0b100, 0b100, 0b100, 0b011],
  'D': [0b110, 0b101, 0b101, 0b101, 0b110],
  'E': [0b111, 0b100, 0b110, 0b100, 0b111],
  'H': [0b101, 0b101, 0b111, 0b101, 0b101],
  'I': [0b111, 0b010, 0b010, 0b010, 0b111],
  'M': [0b101, 0b111, 0b101, 0b101, 0b101],
  'N': [0b110, 0b101, 0b101, 0b101, 0b101],
  'O': [0b010, 0b101, 0b101, 0b101, 0b010],
  'P': [0b110, 0b101, 0b110, 0b100, 0b100],
  'R': [0b110, 0b101, 0b110, 0b101, 0b101],
  'S': [0b011, 0b100, 0b010, 0b001, 0b110],
  'U': [0b101, 0b101, 0b101, 0b101, 0b010],
  'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
  ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
};

function renderFrame(
  width: number,
  height: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  passed: boolean
): Uint8Array {
  const pixels = new Uint8Array(width * height).fill(7); // outer background #f2f2eb

  function setPixel(x: number, y: number, colorIdx: number) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      pixels[y * width + x] = colorIdx;
    }
  }

  function fillRect(x: number, y: number, w: number, h: number, colorIdx: number) {
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        setPixel(c, r, colorIdx);
      }
    }
  }

  function draw5x7Char(char: string, startX: number, startY: number, scale: number, colorIdx: number) {
    const glyph = FONT_5X7[char] || FONT_5X7[' '];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          fillRect(startX + col * scale, startY + row * scale, scale, scale, colorIdx);
        }
      }
    }
  }

  function draw3x5Text(text: string, startX: number, startY: number, scale: number, colorIdx: number) {
    let curX = startX;
    for (const ch of text.toUpperCase()) {
      const glyph = FONT_3X5[ch] || FONT_3X5[' '];
      for (let row = 0; row < 5; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 3; col++) {
          if ((bits >> (2 - col)) & 1) {
            fillRect(curX + col * scale, startY + row * scale, scale, scale, colorIdx);
          }
        }
      }
      curX += 4 * scale;
    }
  }

  if (passed) {
    const bannerW = 280;
    const bannerH = 48;
    const bx = Math.floor((width - bannerW) / 2);
    const by = Math.floor((height - bannerH) / 2);

    fillRect(bx + 4, by + 4, bannerW, bannerH, 1);
    fillRect(bx, by, bannerW, bannerH, 5);
    fillRect(bx, by, bannerW, 2, 1);
    fillRect(bx, by + bannerH - 2, bannerW, 2, 1);
    fillRect(bx, by, 2, bannerH, 1);
    fillRect(bx + bannerW - 2, by, 2, bannerH, 1);

    const text = 'DEADLINE PASSED';
    const textWidth = text.length * 6 * 2;
    const textX = bx + Math.floor((bannerW - textWidth) / 2);
    const textY = by + 17;
    for (let i = 0; i < text.length; i++) {
      draw5x7Char(text[i], textX + i * 12, textY, 2, 0);
    }
    return pixels;
  }

  // 4 segmented boxes: Days, Hours, Minutes, Seconds
  const boxWidth = 72;
  const boxHeight = 58;
  const gap = 16;
  const totalWidth = 4 * boxWidth + 3 * gap;
  const startX = Math.floor((width - totalWidth) / 2);
  const startY = Math.floor((height - boxHeight) / 2);

  const totalHours = days * 24 + hours;

  // Box background color depends on urgency
  let cardBg = 3; // cream #f7f7f2
  let textCol = 1; // ink #10201d
  if (totalHours < 6) {
    cardBg = 5; // urgent red #e53927
    textCol = 0; // white text
  } else if (days < 1) {
    cardBg = 8; // coral red #e97b77
    textCol = 1;
  } else if (days < 3) {
    cardBg = 4; // signature amber #f5b726
    textCol = 1;
  }

  const units = [
    { val: days, label: 'DAYS' },
    { val: hours, label: 'HOURS' },
    { val: minutes, label: 'MINS' },
    { val: seconds, label: 'SECS' }
  ];

  units.forEach((u, i) => {
    const bx = startX + i * (boxWidth + gap);
    const by = startY;

    // 1. Brutalist hard drop shadow (+3px, +3px)
    fillRect(bx + 3, by + 3, boxWidth, boxHeight, 1);

    // 2. Box background fill
    fillRect(bx, by, boxWidth, boxHeight, cardBg);

    // 3. 2px solid border
    fillRect(bx, by, boxWidth, 2, 1);
    fillRect(bx, by + boxHeight - 2, boxWidth, 2, 1);
    fillRect(bx, by, 2, boxHeight, 1);
    fillRect(bx + boxWidth - 2, by, 2, boxHeight, 1);

    // 4. Large bold 2-digit number (5x7 at scale 3)
    const padStr = String(Math.max(0, u.val)).padStart(2, '0');
    const digitY = by + 9;
    const digitStartX = bx + Math.floor((boxWidth - (2 * 5 * 3 + 4)) / 2);
    draw5x7Char(padStr[0], digitStartX, digitY, 3, textCol);
    draw5x7Char(padStr[1], digitStartX + 5 * 3 + 4, digitY, 3, textCol);

    // 5. Monospace sub-label (3x5 at scale 1)
    const labelWidth = u.label.length * 4 - 1;
    const labelX = bx + Math.floor((boxWidth - labelWidth) / 2);
    const labelY = by + boxHeight - 14;
    const labelColor = textCol === 0 ? 0 : 6;
    draw3x5Text(u.label, labelX, labelY, 1, labelColor);

    // 6. Colons between boxes
    if (i < 3) {
      const colonX = bx + boxWidth + Math.floor((gap - 4) / 2);
      const colonY = by + Math.floor((boxHeight - 18) / 2) - 3;
      fillRect(colonX, colonY + 4, 3, 3, 1);
      fillRect(colonX, colonY + 12, 3, 3, 1);
    }
  });

  return pixels;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const until = searchParams.get('until');

  if (!until) {
    return new NextResponse('Missing until timestamp parameter', { status: 400 });
  }

  const targetDate = new Date(until);
  if (isNaN(targetDate.getTime())) {
    return new NextResponse('Invalid date format for until parameter', { status: 400 });
  }

  const width = 380;
  const height = 72;
  const encoder = createGifEncoder();

  const nowMs = Date.now();
  const diffMs = targetDate.getTime() - nowMs;

  if (diffMs <= 0) {
    const frame = renderFrame(width, height, 0, 0, 0, 0, true);
    encoder.writeFrame(frame, width, height, {
      palette: PALETTE,
      delay: 5000,
    });
  } else {
    const frameCount = Math.min(60, Math.max(1, Math.floor(diffMs / 1000)));

    for (let i = 0; i < frameCount; i++) {
      const remainingMs = Math.max(0, diffMs - i * 1000);
      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const frame = renderFrame(width, height, days, hours, minutes, seconds, false);
      encoder.writeFrame(frame, width, height, {
        palette: PALETTE,
        delay: 1000,
      });
    }
  }

  encoder.finish();
  const gifBuffer = Buffer.from(encoder.bytes());

  return new NextResponse(gifBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': gifBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
