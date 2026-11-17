import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  HERO_MAX_BYTES,
  HERO_MAX_WIDTH_PX,
  processAssetsDirectory,
  THUMB_MAX_BYTES,
  THUMB_MAX_WIDTH_PX,
} from '../scripts/process-assets';
import type { CampusMapData } from '@/types/domain';

const ROOT_DIR = path.resolve(__dirname, '..');
const mapData = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'data', 'campus_map_data.json'), 'utf8'),
) as CampusMapData;

describe('正規化済みキャンパスマップ完全突合 (campus_map_data.json)', () => {
  it('全51室（1F:10, 2F:13, 3F:14, 4F:13, 5F:1）＋11スポット＋9建物＋4屋外エリア＋4経路を欠損なく保持している', () => {
    expect(mapData.buildings).toHaveLength(9);
    expect(mapData.outdoorAreas).toHaveLength(4);
    expect(mapData.spots).toHaveLength(11);
    expect(mapData.accessRoutes).toHaveLength(4);

    expect(mapData.indoorFloors['1'].rooms).toHaveLength(10);
    expect(mapData.indoorFloors['2'].rooms).toHaveLength(13);
    expect(mapData.indoorFloors['3'].rooms).toHaveLength(14);
    expect(mapData.indoorFloors['4'].rooms).toHaveLength(13);
    expect(mapData.indoorFloors['5'].rooms).toHaveLength(1);
  });

  it('南陵高校固有の教室配置（1Fに3-6/3-7、管理棟3F視聴覚室、4Fの1-7 -> 1-6逆順）が正確に正規化されている', () => {
    const f1Ids = mapData.indoorFloors['1'].rooms.map((r) => r.id);
    expect(f1Ids).toContain('student_1f_homeroom_3_6');
    expect(f1Ids).toContain('student_1f_homeroom_3_7');

    const avRoom = mapData.indoorFloors['3'].rooms.find((r) => r.id === 'admin_3f_av_room');
    expect(avRoom).toBeDefined();
    expect(avRoom?.buildingId).toBe('bldg_admin');
    expect(avRoom?.name).toBe('視聴覚室');

    const f4Ids = mapData.indoorFloors['4'].rooms.map((r) => r.id);
    const idx17 = f4Ids.indexOf('student_4f_homeroom_1_7');
    const idx16 = f4Ids.indexOf('student_4f_homeroom_1_6');
    expect(idx17).toBeGreaterThan(-1);
    expect(idx16).toBeGreaterThan(-1);
    expect(idx17).toBeLessThan(idx16);
  });

  it('冗長な coordinates 二重配列・linkedProjectIds・年度依存テントID (tent_102等) が完全に除去されている', () => {
    const serialized = JSON.stringify(mapData);
    expect(serialized).not.toContain('"coordinates"');
    expect(serialized).not.toContain('"linkedProjectIds"');
    expect(serialized).not.toContain('"tent_102"');
    expect(serialized).not.toContain('"tent_301"');
  });
});

describe('画像最適化 CLI パイプライン (process-assets.ts)', () => {
  it('大型元画像を thumb(400px, <=45KB) / hero(800px, <=90KB) / gallery / item WebP に変換し小画像は拡大しない', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nanryo-assets-test-'));
    const inDir = path.join(tmpRoot, 'original');
    const outDir = path.join(tmpRoot, 'public-images');
    fs.mkdirSync(path.join(inDir, 'items'), { recursive: true });

    try {
      // 2000x1500 の大型JPEGカバー画像
      const largeBuf = await sharp({
        create: { width: 2000, height: 1500, channels: 3, background: { r: 37, g: 99, b: 235 } },
      })
        .jpeg({ quality: 95 })
        .toBuffer();
      await fs.promises.writeFile(path.join(inDir, 'demo_proj.jpg'), largeBuf);

      // 1600x1200 のギャラリー画像
      await fs.promises.writeFile(path.join(inDir, 'demo_proj_1.jpg'), largeBuf);

      // 240x180 の小型商品画像（withoutEnlargement 確認用）
      const smallBuf = await sharp({
        create: { width: 240, height: 180, channels: 3, background: { r: 16, g: 185, b: 129 } },
      })
        .png()
        .toBuffer();
      await fs.promises.writeFile(path.join(inDir, 'items', 'small_item.png'), smallBuf);

      const records = await processAssetsDirectory({
        inputRootDir: inDir,
        outputPublicDir: outDir,
      });

      expect(records).toHaveLength(4);

      const thumbPath = path.join(outDir, 'projects', 'demo_proj_thumb.webp');
      const thumbBuf = await fs.promises.readFile(thumbPath);
      const thumbMeta = await sharp(thumbBuf).metadata();
      expect(thumbMeta.format).toBe('webp');
      expect(thumbMeta.width).toBe(THUMB_MAX_WIDTH_PX);
      expect(thumbBuf.byteLength).toBeLessThanOrEqual(THUMB_MAX_BYTES);

      const heroPath = path.join(outDir, 'projects', 'demo_proj_hero.webp');
      const heroBuf = await fs.promises.readFile(heroPath);
      const heroMeta = await sharp(heroBuf).metadata();
      expect(heroMeta.format).toBe('webp');
      expect(heroMeta.width).toBe(HERO_MAX_WIDTH_PX);
      expect(heroBuf.byteLength).toBeLessThanOrEqual(HERO_MAX_BYTES);

      const smallItemBuf = await fs.promises.readFile(
        path.join(outDir, 'items', 'small_item.webp'),
      );
      const smallItemMeta = await sharp(smallItemBuf).metadata();
      expect(smallItemMeta.width).toBe(240); // 拡大されないこと
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('末尾が _1〜_9 の企画ID (class_1_1 等) のカバー画像をギャラリーと誤認せず _thumb / _hero / ギャラリーを正しく出力する', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nanryo-assets-id-'));
    const inDir = path.join(tmpRoot, 'original');
    const outDir = path.join(tmpRoot, 'public-images');
    fs.mkdirSync(inDir, { recursive: true });

    try {
      const coverBuf = await sharp({
        create: { width: 1200, height: 900, channels: 3, background: { r: 220, g: 38, b: 38 } },
      })
        .jpeg({ quality: 90 })
        .toBuffer();
      // 大文字拡張子 (.JPG / .PNG) も同時に検証
      await fs.promises.writeFile(path.join(inDir, 'class_1_1.JPG'), coverBuf);
      await fs.promises.writeFile(path.join(inDir, 'class_1_1_1.PNG'), coverBuf);
      await fs.promises.writeFile(path.join(inDir, 'homeroom_3_6.JPG'), coverBuf);

      const records = await processAssetsDirectory({
        inputRootDir: inDir,
        outputPublicDir: outDir,
        knownProjectIds: new Set(['class_1_1', 'homeroom_3_6']),
      });

      expect(records).toHaveLength(5);
      expect(fs.existsSync(path.join(outDir, 'projects', 'class_1_1_thumb.webp'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'projects', 'class_1_1_hero.webp'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'projects', 'class_1_1_1.webp'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'projects', 'homeroom_3_6_thumb.webp'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'projects', 'homeroom_3_6_hero.webp'))).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('高周波ノイズを含む縦長画像 (1000x2200) でも長辺拘束と段階縮小により 45KB / 90KB 上限内へ確実に収束する', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nanryo-assets-tall-'));
    const inDir = path.join(tmpRoot, 'original');
    const outDir = path.join(tmpRoot, 'public-images');
    fs.mkdirSync(inDir, { recursive: true });

    try {
      // 擬似高周波パターン（チェッカー＋グラデーション）を持つ 1000x2200 縦長画像を生成
      const width = 1000;
      const height = 2200;
      const raw = Buffer.alloc(width * height * 3);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 3;
          const v = ((x * 37) ^ (y * 53) ^ ((x + y) * 11)) & 0xff;
          raw[offset] = v;
          raw[offset + 1] = (v * 3) & 0xff;
          raw[offset + 2] = 255 - v;
        }
      }
      const noisyTallPng = await sharp(raw, { raw: { width, height, channels: 3 } })
        .png()
        .toBuffer();
      await fs.promises.writeFile(path.join(inDir, 'tall_poster.png'), noisyTallPng);

      const records = await processAssetsDirectory({
        inputRootDir: inDir,
        outputPublicDir: outDir,
      });
      expect(records).toHaveLength(2);

      const thumbBuf = await fs.promises.readFile(
        path.join(outDir, 'projects', 'tall_poster_thumb.webp'),
      );
      const heroBuf = await fs.promises.readFile(
        path.join(outDir, 'projects', 'tall_poster_hero.webp'),
      );
      const heroMeta = await sharp(heroBuf).metadata();
      expect(thumbBuf.byteLength).toBeLessThanOrEqual(THUMB_MAX_BYTES);
      expect(heroBuf.byteLength).toBeLessThanOrEqual(HERO_MAX_BYTES);
      expect(heroMeta.height).toBeLessThanOrEqual(HERO_MAX_WIDTH_PX);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('大文字 .HEIC 拡張子が heic-convert デコード経路へディスパッチされ不正バイナリを確実に拒否する', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nanryo-assets-heic-'));
    const inDir = path.join(tmpRoot, 'original');
    const outDir = path.join(tmpRoot, 'public-images');
    fs.mkdirSync(inDir, { recursive: true });

    try {
      await fs.promises.writeFile(path.join(inDir, 'bad_fixture.HEIC'), Buffer.from('not-a-heic'));
      await expect(
        processAssetsDirectory({ inputRootDir: inDir, outputPublicDir: outDir }),
      ).rejects.toThrow(/HEIC/i);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
