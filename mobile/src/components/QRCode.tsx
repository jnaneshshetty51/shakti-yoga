import React from "react";
import Svg, { Rect } from "react-native-svg";

/**
 * Minimal QR code generator — renders a QR code as an SVG using react-native-svg.
 *
 * Only supports alphanumeric mode (version 2, ECC-L) which gives up to ~34
 * characters — more than enough for a cuid user-ID. For anything larger a
 * full encoder library would be needed, but this keeps the zero-extra-deps
 * constraint intact.
 *
 * Implementation: uses a pre-computed bit layout. For a real production QR
 * we generate the data using a lightweight encoding routine below.
 */

// ---------------------------------------------------------------------------
// QR bit-level encoding (version 2, 25×25, ECC-L, byte mode)
// ---------------------------------------------------------------------------

const SIZE = 25; // version 2 QR code size

/** Generate a simple QR code matrix from input data string. */
function generateQRMatrix(data: string): boolean[][] {
  // Create a blank matrix
  const matrix: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => false)
  );
  const reserved: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => false)
  );

  // Add finder patterns (top-left, top-right, bottom-left)
  const addFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= SIZE || mc < 0 || mc >= SIZE) continue;
        const isOuter = r === -1 || r === 7 || c === -1 || c === 7;
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[mr][mc] = isBorder || isInner;
        if (!isOuter) reserved[mr][mc] = true;
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, SIZE - 7);
  addFinderPattern(SIZE - 7, 0);

  // Timing patterns
  for (let i = 8; i < SIZE - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  // Alignment pattern for version 2 at (18, 18)
  const ax = 18, ay = 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[ay + r][ax + c] = isBorder || isCenter;
      reserved[ay + r][ax + c] = true;
    }
  }

  // Dark module
  matrix[SIZE - 8][8] = true;
  reserved[SIZE - 8][8] = true;

  // Reserve format info areas
  for (let i = 0; i < 15; i++) {
    // Horizontal (around top-left finder)
    if (i < 8) reserved[8][i === 6 ? 7 : i] = true;
    else reserved[8][SIZE - 15 + i] = true;
    // Vertical (around top-left finder)
    if (i < 8) reserved[i === 6 ? 7 : i][8] = true;
    else reserved[SIZE - 15 + i][8] = true;
  }

  // Encode data bytes
  const bytes = encodeDataBytes(data);

  // Place data bits in the matrix using the upward-then-downward zigzag
  let bitIndex = 0;
  let upward = true;

  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    const rows = upward
      ? Array.from({ length: SIZE }, (_, i) => SIZE - 1 - i)
      : Array.from({ length: SIZE }, (_, i) => i);

    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (reserved[row][col]) continue;
        if (bitIndex < bytes.length * 8) {
          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdx = 7 - (bitIndex % 8);
          matrix[row][col] = ((bytes[byteIdx] >> bitIdx) & 1) === 1;
          bitIndex++;
        }
        reserved[row][col] = true;
      }
    }
    upward = !upward;
  }

  // Apply mask pattern 0 (checkerboard: (row + col) % 2 === 0)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isDataModule(r, c)) {
        if ((r + c) % 2 === 0) matrix[r][c] = !matrix[r][c];
      }
    }
  }

  // Write format information (mask 0, ECC-L)
  const formatBits = 0b111011111000100; // L, mask 0
  writeFormatInfo(matrix, formatBits);

  return matrix;
}

function isDataModule(row: number, col: number): boolean {
  // Check if module is NOT a function pattern
  // Finder patterns
  if (row < 9 && col < 9) return false; // top-left finder + format
  if (row < 9 && col >= SIZE - 8) return false; // top-right finder + format
  if (row >= SIZE - 8 && col < 9) return false; // bottom-left finder + format
  // Timing patterns
  if (row === 6 || col === 6) return false;
  // Alignment pattern (version 2)
  if (row >= 16 && row <= 20 && col >= 16 && col <= 20) return false;
  // Dark module
  if (row === SIZE - 8 && col === 8) return false;
  return true;
}

function writeFormatInfo(matrix: boolean[][], formatBits: number) {
  const bits: boolean[] = [];
  for (let i = 14; i >= 0; i--) bits.push(((formatBits >> i) & 1) === 1);

  // Around top-left finder (horizontal)
  const hPositions = [0, 1, 2, 3, 4, 5, 7, 8];
  for (let i = 0; i < 8; i++) matrix[8][hPositions[i]] = bits[i];
  for (let i = 8; i < 15; i++) matrix[8][SIZE - 15 + i] = bits[i];

  // Around top-left finder (vertical)
  const vPositions = [0, 1, 2, 3, 4, 5, 7, 8];
  for (let i = 0; i < 8; i++) matrix[vPositions[7 - i]][8] = bits[i];
  for (let i = 8; i < 15; i++) matrix[SIZE - 15 + i][8] = bits[i];
}

function encodeDataBytes(data: string): number[] {
  const dataBytes: number[] = [];

  // Mode indicator: byte mode (0100)
  // Character count (8 bits for version 2 byte mode)
  dataBytes.push((0x40 | (data.length >> 4)) & 0xff);
  dataBytes.push(((data.length & 0x0f) << 4) | (data.charCodeAt(0) >> 4));

  for (let i = 0; i < data.length; i++) {
    const curr = data.charCodeAt(i) & 0xff;
    const next = i + 1 < data.length ? data.charCodeAt(i + 1) & 0xff : 0;
    if (i === 0) {
      // Already partially written
    } else {
      dataBytes.push(((data.charCodeAt(i - 1) & 0x0f) << 4) | (curr >> 4));
    }
    if (i === data.length - 1) {
      dataBytes.push((curr & 0x0f) << 4);
    }
  }

  // Pad to required data codeword count (version 2, L: 34 data codewords)
  const totalDataCodewords = 34;
  while (dataBytes.length < totalDataCodewords) {
    dataBytes.push(dataBytes.length % 2 === 0 ? 0xec : 0x11);
  }
  dataBytes.length = totalDataCodewords;

  // Compute ECC (version 2-L uses 10 error correction codewords)
  const eccCount = 10;
  const ecc = computeReedSolomon(dataBytes, eccCount);

  return [...dataBytes, ...ecc];
}

// Reed-Solomon error correction over GF(256)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function computeReedSolomon(data: number[], eccCount: number): number[] {
  // Generator polynomial for eccCount
  let gen = [1];
  for (let i = 0; i < eccCount; i++) {
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j];
      newGen[j + 1] ^= gfMul(gen[j], GF_EXP[i]);
    }
    gen = newGen;
  }

  const msg = [...data, ...new Array(eccCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// ---------------------------------------------------------------------------
// React Native component
// ---------------------------------------------------------------------------

interface QRCodeProps {
  /** The string data to encode (max ~34 chars for version 2-L). */
  value: string;
  /** Overall width/height of the SVG in points. Default 200. */
  size?: number;
  /** Color of the dark modules. Default "#2D4739" (brand primary). */
  color?: string;
  /** Background color. Default "#FFFFFF". */
  backgroundColor?: string;
}

export function QRCode({
  value,
  size = 200,
  color = "#2D4739",
  backgroundColor = "#FFFFFF",
}: QRCodeProps) {
  const matrix = React.useMemo(() => generateQRMatrix(value), [value]);
  const cellSize = size / (SIZE + 2); // +2 for quiet zone
  const offset = cellSize; // 1-module quiet zone

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={0} y={0} width={size} height={size} fill={backgroundColor} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <Rect
              key={`${r}-${c}`}
              x={offset + c * cellSize}
              y={offset + r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </Svg>
  );
}
