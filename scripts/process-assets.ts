import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

/**
 * 南陵祭2027 画像アセット一括最適化パイプライン（D-002 / D-009）
 * - 2026年の `.resize()` 欠落による 1MB WebP 爆弾事故を根絶するため、厳格な上限サイズで2段階WebPを生成する。
 *   1) 企画カバー `{id}.{ext}` -> `public/images/projects/{id}_thumb.webp` (400px, q=75, <=45KB)
 *                              + `public/images/projects/{id}_hero.webp`  (800px, q=80, <=90KB)
 *   2) ギャラリー `{id}_{1..9}.{ext}` -> `public/images/projects/{id}_{n}.webp` (800px, q=80, <=90KB)
 *   3) 商品画像   `items/{itemId}.{ext}` -> `public/images/items/{itemId}.webp` (400px, q=75, <=45KB)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const THUMB_MAX_WIDTH_PX = 400;
export const HERO_MAX_WIDTH_PX = 800;
export const THUMB_MAX_BYTES = 45 * 1024; // 45 KB
export const HERO_MAX_BYTES = 90 * 1024; // 90 KB

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.heic',
  '.heif',
]);

const GALLERY_FILENAME_REGEX = /^([a-z0-9_-]+)_([1-9])$/;
const ENTITY_ID_REGEX = /^[a-z0-9_-]{1,40}$/;

export interface ProcessedAssetRecord {
  readonly sourceFile: string;
  readonly outputFile: string;
  readonly widthPx: number;
  readonly sizeBytes: number;
  readonly qualityUsed: number;
}

async function decodeInputBuffer(filePath: string): Promise<Buffer> {
  const rawBuffer = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.heic' || ext === '.heif') {
    const converted = await heicConvert({
      buffer: rawBuffer,
      format: 'JPEG',
      quality: 0.92,
    });
    return Buffer.isBuffer(converted) ? converted : Buffer.from(converted);
  }
  return rawBuffer;
}

/**
 * Exif回転補正 + 長辺リサイズ (fit: 'inside') + 段階的WebP圧縮
 * - 縦長写真・ポスターでも高さが肥大化しないよう width/height 双方の上限を maxWidthPx で拘束する。
 * - 高周波の線画イラスト等で等倍のまま低品質 (q=25) へ劣化・失敗するのを防ぐため、
 *   適正品質で収まらない場合は長辺スケールを段階的に縮小して確実に上限バイト以内へ収束させる。
 */
export async function encodeBoundedWebp(
  inputBuffer: Buffer,
  options: {
    readonly maxWidthPx: number;
    readonly initialQuality: number;
    readonly maxBytes: number;
    readonly label: string;
  },
): Promise<{ readonly buffer: Buffer; readonly widthPx: number; readonly qualityUsed: number }> {
  const passes: ReadonlyArray<{ readonly scale: number; readonly qualities: readonly number[] }> = [
    {
      scale: 1.0,
      qualities: [options.initialQuality, Math.max(55, options.initialQuality - 12), 45],
    },
    { scale: 0.85, qualities: [68, 55, 45] },
    { scale: 0.72, qualities: [65, 52, 42] },
    { scale: 0.6, qualities: [60, 48, 38] },
    { scale: 0.5, qualities: [55, 42, 32] },
  ];

  for (const pass of passes) {
    const targetDim = Math.max(160, Math.round(options.maxWidthPx * pass.scale));
    for (const quality of pass.qualities) {
      const { data, info } = await sharp(inputBuffer)
        .rotate() // Exif Orientation をピクセルへ反映しメタデータを除去
        .resize({
          width: targetDim,
          height: targetDim,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 5,
        })
        .toBuffer({ resolveWithObject: true });

      if (data.byteLength <= options.maxBytes) {
        return {
          buffer: data,
          widthPx: info.width,
          qualityUsed: quality,
        };
      }
    }
  }

  throw new Error(
    `[process-assets] 画像 "${options.label}" を上限 ${options.maxBytes} bytes 以下に圧縮できませんでした。元画像を確認してください。`,
  );
}

function loadDefaultKnownProjectIds(): ReadonlySet<string> | undefined {
  const projectsJsonPath = path.resolve(PROJECT_ROOT, 'data', 'projects.json');
  if (!fs.existsSync(projectsJsonPath)) {
    return undefined;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) {
      return undefined;
    }
    const ids = new Set<string>();
    for (const entry of raw) {
      if (typeof entry === 'object' && entry !== null && 'id' in entry) {
        const id = (entry as { id: unknown }).id;
        if (typeof id === 'string' && id.length > 0) {
          ids.add(id);
        }
      }
    }
    return ids;
  } catch {
    return undefined;
  }
}

function classifyRootProjectAsset(
  baseName: string,
  allBaseNames: ReadonlySet<string>,
  knownProjectIds: ReadonlySet<string> | undefined,
):
  | { readonly kind: 'cover'; readonly projectId: string }
  | { readonly kind: 'gallery'; readonly projectId: string; readonly galleryIndex: string } {
  // 1. 既知の企画IDと完全一致する場合は（末尾が _1〜_9 でも）必ずカバー画像として扱う
  if (knownProjectIds?.has(baseName)) {
    return { kind: 'cover', projectId: baseName };
  }

  const galleryMatch = GALLERY_FILENAME_REGEX.exec(baseName);
  if (galleryMatch) {
    const candidateProjectId = galleryMatch[1]!;
    const galleryIndex = galleryMatch[2]!;

    if (knownProjectIds !== undefined && knownProjectIds.has(candidateProjectId)) {
      return { kind: 'gallery', projectId: candidateProjectId, galleryIndex };
    }

    // スタンドアロン実行時: 自身にさらに _1 ギャラリーが存在する場合はカバー画像と判定
    if (!allBaseNames.has(`${baseName}_1`)) {
      const parentExistsInDir =
        allBaseNames.has(candidateProjectId) ||
        (Number(galleryIndex) > 1 && allBaseNames.has(`${candidateProjectId}_1`));
      if (parentExistsInDir) {
        return { kind: 'gallery', projectId: candidateProjectId, galleryIndex };
      }
    }
  }

  return { kind: 'cover', projectId: baseName };
}

export async function processAssetsDirectory(options?: {
  readonly inputRootDir?: string;
  readonly outputPublicDir?: string;
  readonly knownProjectIds?: ReadonlySet<string>;
}): Promise<readonly ProcessedAssetRecord[]> {
  const inputRoot =
    options?.inputRootDir ?? path.resolve(PROJECT_ROOT, 'assets', 'original');
  const outputPublic =
    options?.outputPublicDir ?? path.resolve(PROJECT_ROOT, 'public', 'images');
  const knownProjectIds =
    options?.knownProjectIds ??
    (options?.inputRootDir === undefined ? loadDefaultKnownProjectIds() : undefined);

  const projectsOutDir = path.join(outputPublic, 'projects');
  const itemsOutDir = path.join(outputPublic, 'items');

  await fs.promises.mkdir(projectsOutDir, { recursive: true });
  await fs.promises.mkdir(itemsOutDir, { recursive: true });

  const results: ProcessedAssetRecord[] = [];

  if (!fs.existsSync(inputRoot)) {
    return results;
  }

  // 1. ルート直下の企画カバー画像 & ギャラリー画像を処理
  const rootEntries = await fs.promises.readdir(inputRoot, { withFileTypes: true });
  const supportedRootFiles = rootEntries.filter(
    (entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
  );
  const allBaseNames = new Set(
    supportedRootFiles.map((entry) => path.basename(entry.name, path.extname(entry.name))),
  );

  for (const entry of supportedRootFiles) {
    const baseName = path.basename(entry.name, path.extname(entry.name));
    const sourcePath = path.join(inputRoot, entry.name);
    const decoded = await decodeInputBuffer(sourcePath);

    const classification = classifyRootProjectAsset(baseName, allBaseNames, knownProjectIds);
    if (classification.kind === 'gallery') {
      const outName = `${classification.projectId}_${classification.galleryIndex}.webp`;
      const outPath = path.join(projectsOutDir, outName);
      const encoded = await encodeBoundedWebp(decoded, {
        maxWidthPx: HERO_MAX_WIDTH_PX,
        initialQuality: 80,
        maxBytes: HERO_MAX_BYTES,
        label: outName,
      });
      await fs.promises.writeFile(outPath, encoded.buffer);
      results.push({
        sourceFile: sourcePath,
        outputFile: outPath,
        widthPx: encoded.widthPx,
        sizeBytes: encoded.buffer.byteLength,
        qualityUsed: encoded.qualityUsed,
      });
      continue;
    }

    if (!ENTITY_ID_REGEX.test(baseName)) {
      throw new Error(
        `[process-assets] 不正なファイル名 "${entry.name}"。企画IDは半角英小文字・数字・ハイフン・アンダースコアにしてください。`,
      );
    }

    // カバー画像 -> _thumb.webp (400px) + _hero.webp (800px)
    const thumbName = `${baseName}_thumb.webp`;
    const thumbPath = path.join(projectsOutDir, thumbName);
    const thumbEncoded = await encodeBoundedWebp(decoded, {
      maxWidthPx: THUMB_MAX_WIDTH_PX,
      initialQuality: 75,
      maxBytes: THUMB_MAX_BYTES,
      label: thumbName,
    });
    await fs.promises.writeFile(thumbPath, thumbEncoded.buffer);
    results.push({
      sourceFile: sourcePath,
      outputFile: thumbPath,
      widthPx: thumbEncoded.widthPx,
      sizeBytes: thumbEncoded.buffer.byteLength,
      qualityUsed: thumbEncoded.qualityUsed,
    });

    const heroName = `${baseName}_hero.webp`;
    const heroPath = path.join(projectsOutDir, heroName);
    const heroEncoded = await encodeBoundedWebp(decoded, {
      maxWidthPx: HERO_MAX_WIDTH_PX,
      initialQuality: 80,
      maxBytes: HERO_MAX_BYTES,
      label: heroName,
    });
    await fs.promises.writeFile(heroPath, heroEncoded.buffer);
    results.push({
      sourceFile: sourcePath,
      outputFile: heroPath,
      widthPx: heroEncoded.widthPx,
      sizeBytes: heroEncoded.buffer.byteLength,
      qualityUsed: heroEncoded.qualityUsed,
    });
  }

  // 2. items/ 配下の商品画像を処理
  const itemsInputDir = path.join(inputRoot, 'items');
  if (fs.existsSync(itemsInputDir)) {
    const itemEntries = await fs.promises.readdir(itemsInputDir, { withFileTypes: true });
    for (const entry of itemEntries) {
      if (!entry.isFile()) {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        continue;
      }
      const itemId = path.basename(entry.name, path.extname(entry.name));
      if (!ENTITY_ID_REGEX.test(itemId)) {
        throw new Error(`[process-assets] 不正な商品画像ファイル名 "${entry.name}"。`);
      }
      const sourcePath = path.join(itemsInputDir, entry.name);
      const decoded = await decodeInputBuffer(sourcePath);
      const outName = `${itemId}.webp`;
      const outPath = path.join(itemsOutDir, outName);
      const encoded = await encodeBoundedWebp(decoded, {
        maxWidthPx: THUMB_MAX_WIDTH_PX,
        initialQuality: 75,
        maxBytes: THUMB_MAX_BYTES,
        label: `items/${outName}`,
      });
      await fs.promises.writeFile(outPath, encoded.buffer);
      results.push({
        sourceFile: sourcePath,
        outputFile: outPath,
        widthPx: encoded.widthPx,
        sizeBytes: encoded.buffer.byteLength,
        qualityUsed: encoded.qualityUsed,
      });
    }
  }

  return results;
}

async function main(): Promise<void> {
  const records = await processAssetsDirectory();
  console.log(`[process-assets] 変換完了: 計 ${records.length} ファイル出力`);
  for (const r of records) {
    const relOut = path.relative(PROJECT_ROOT, r.outputFile).replace(/\\/g, '/');
    console.log(
      `  - ${relOut} (${r.widthPx}px, ${(r.sizeBytes / 1024).toFixed(1)} KB, q=${r.qualityUsed})`,
    );
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
