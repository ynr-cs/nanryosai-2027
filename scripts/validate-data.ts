import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type {
  CampusMapData,
  FloorKey,
  FloorNumber,
  ProjectMaster,
  StageSlotMaster,
} from '../src/types/domain';
import {
  CampusMapDataSchema,
  ProjectMasterSchema,
  StageSlotMasterSchema,
} from '../src/types/schemas';
import { HERO_MAX_BYTES, THUMB_MAX_BYTES } from './process-assets';

/**
 * 南陵祭2027 マスターデータ総合整合性バリデーション CLI（D-009）
 * 1) Zod スキーマ検証（campus_map_data.json / projects.json / stages.json）
 * 2) 全企画の roomId が指定 floor の屋内部屋またはスポットに実在すること（2026年「7教室ズレ事故」根絶）
 * 3) 意図しない部屋重複の遮断（ステージ会場または明示的 allowSharedRoom: true のみ共有許可）
 * 4) ステージ出演枠の linkedProjectId 実在突合＆同一会場・同一日時の時間帯重複チェック
 * 5) 参照 WebP 画像の実在およびバイト上限（thumb/item <= 45KB, hero/gallery <= 90KB）検査
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 複数団体が入れ替わりで出演するステージ会場は部屋共有を標準許可
const STAGE_SHARED_VENUE_IDS = new Set([
  'gym_stage',
  'admin_3f_av_room',
  'student_4f_music_room',
]);

export interface ValidationReport {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly summary: {
    readonly roomCount: number;
    readonly spotCount: number;
    readonly projectCount: number;
    readonly mopStoreCount: number;
    readonly stageSlotCount: number;
    readonly verifiedImageCount: number;
  };
}

function hhmmToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  return Number(hStr) * 60 + Number(mStr);
}

export function validateMasterDataObjects(params: {
  readonly rawMap: unknown;
  readonly rawProjects: unknown;
  readonly rawStages: unknown;
  readonly publicImagesDir?: string;
  readonly checkImagesOnDisk?: boolean;
}): ValidationReport {
  const errors: string[] = [];
  const checkImages = params.checkImagesOnDisk ?? true;
  const imagesDir =
    params.publicImagesDir ?? path.resolve(PROJECT_ROOT, 'public', 'images');

  const mapParsed = CampusMapDataSchema.safeParse(params.rawMap);
  if (!mapParsed.success) {
    for (const issue of mapParsed.error.issues) {
      errors.push(`[campus_map_data.json] ${issue.path.join('.')}: ${issue.message}`);
    }
  }

  const projectsParsed = z.array(ProjectMasterSchema).safeParse(params.rawProjects);
  if (!projectsParsed.success) {
    for (const issue of projectsParsed.error.issues) {
      errors.push(`[projects.json] ${issue.path.join('.')}: ${issue.message}`);
    }
  }

  const stagesParsed = z.array(StageSlotMasterSchema).safeParse(params.rawStages);
  if (!stagesParsed.success) {
    for (const issue of stagesParsed.error.issues) {
      errors.push(`[stages.json] ${issue.path.join('.')}: ${issue.message}`);
    }
  }

  if (!mapParsed.success || !projectsParsed.success || !stagesParsed.success) {
    return {
      ok: false,
      errors,
      summary: {
        roomCount: 0,
        spotCount: 0,
        projectCount: 0,
        mopStoreCount: 0,
        stageSlotCount: 0,
        verifiedImageCount: 0,
      },
    };
  }

  const mapData: CampusMapData = mapParsed.data;
  const projects: readonly ProjectMaster[] = projectsParsed.data;
  const stages: readonly StageSlotMaster[] = stagesParsed.data;

  // マップ全ロケーション索引（ID -> floor, category, kind）
  const locationIndex = new Map<
    string,
    { floor: FloorNumber; category: string; name: string; kind: 'room' | 'spot' }
  >();

  const floorKeys: readonly FloorKey[] = ['1', '2', '3', '4', '5'];
  let roomCount = 0;
  for (const fk of floorKeys) {
    for (const room of mapData.indoorFloors[fk].rooms) {
      roomCount += 1;
      if (locationIndex.has(room.id)) {
        errors.push(`[campus_map_data.json] 重複する部屋IDが存在します: "${room.id}"`);
      }
      locationIndex.set(room.id, {
        floor: room.floor,
        category: room.category,
        name: room.name,
        kind: 'room',
      });
    }
  }

  for (const spot of mapData.spots) {
    if (locationIndex.has(spot.id)) {
      errors.push(`[campus_map_data.json] 部屋IDとスポットIDが衝突しています: "${spot.id}"`);
    }
    locationIndex.set(spot.id, {
      floor: spot.floor,
      category: spot.category,
      name: spot.name,
      kind: 'spot',
    });
  }

  // 企画ID一意性・RoomId実在＆フロア一致・商品ID一意性・画像検査
  const projectMap = new Map<string, ProjectMaster>();
  const globalItemIds = new Set<string>();
  const roomOccupants = new Map<string, ProjectMaster[]>();
  let verifiedImageCount = 0;
  let mopStoreCount = 0;

  const verifySingleImage = (relPathFromImages: string, maxBytes: number, ownerLabel: string) => {
    if (!checkImages) {
      return;
    }
    const fullPath = path.join(imagesDir, relPathFromImages);
    if (!fs.existsSync(fullPath)) {
      errors.push(
        `[画像欠損] ${ownerLabel} が参照する画像 "/images/${relPathFromImages.replace(/\\/g, '/')}" が存在しません（npm run process-assets を実行してください）。`,
      );
      return;
    }
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      errors.push(`[画像破損] "/images/${relPathFromImages}" のファイルサイズが 0 byte です。`);
      return;
    }
    if (stat.size > maxBytes) {
      errors.push(
        `[画像容量超過] "/images/${relPathFromImages}" (${stat.size} bytes) が上限 ${maxBytes} bytes を超えています。`,
      );
      return;
    }
    verifiedImageCount += 1;
  };

  for (const project of projects) {
    if (projectMap.has(project.id)) {
      errors.push(`[projects.json] 企画ID "${project.id}" が重複しています。`);
    }
    projectMap.set(project.id, project);

    if (project.mopConfig?.enabled) {
      mopStoreCount += 1;
    }

    if (project.roomId !== null) {
      const loc = locationIndex.get(project.roomId);
      if (!loc) {
        errors.push(
          `[RoomId未存在] 企画 "${project.id}" (${project.groupName}) の roomId "${project.roomId}" は campus_map_data.json に存在しません。`,
        );
      } else if (project.floor !== loc.floor) {
        errors.push(
          `[フロア不一致] 企画 "${project.id}" (${project.groupName}) の floor=${String(project.floor)} が マップ上の "${project.roomId}" (${loc.name}, ${loc.floor}F) と一致しません。`,
        );
      } else {
        const list = roomOccupants.get(project.roomId) ?? [];
        list.push(project);
        roomOccupants.set(project.roomId, list);
      }
    }

    if (project.hasCoverImage) {
      verifySingleImage(
        path.join('projects', `${project.id}_thumb.webp`),
        THUMB_MAX_BYTES,
        `企画 "${project.id}" サムネイル`,
      );
      verifySingleImage(
        path.join('projects', `${project.id}_hero.webp`),
        HERO_MAX_BYTES,
        `企画 "${project.id}" ヒーロー画像`,
      );
    }

    for (let i = 1; i <= project.galleryCount; i += 1) {
      verifySingleImage(
        path.join('projects', `${project.id}_${i}.webp`),
        HERO_MAX_BYTES,
        `企画 "${project.id}" ギャラリー#${i}`,
      );
    }

    for (const item of project.menu) {
      if (globalItemIds.has(item.id)) {
        errors.push(
          `[projects.json] 商品ID "${item.id}" (企画 "${project.id}") が他商品と重複しています。`,
        );
      }
      globalItemIds.add(item.id);

      if (item.hasImage) {
        verifySingleImage(
          path.join('items', `${item.id}.webp`),
          THUMB_MAX_BYTES,
          `商品 "${item.id}" (企画 "${project.id}")`,
        );
      }
    }
  }

  // 企画IDとギャラリー連番ファイル名の衝突検査（例: "team" と "team_1" の共存による元画像名曖昧化を遮断）
  for (const project of projects) {
    for (let idx = 1; idx <= 9; idx += 1) {
      const collidingId = `${project.id}_${idx}`;
      if (projectMap.has(collidingId)) {
        errors.push(
          `[企画ID衝突エラー] 企画ID "${collidingId}" は企画 "${project.id}" のギャラリー画像連番（${project.id}_1〜9）とファイル名が衝突します。別のIDを指定してください。`,
        );
      }
    }
  }

  // 意図しない部屋重複チェック
  for (const [roomId, occupants] of roomOccupants.entries()) {
    if (occupants.length <= 1) {
      continue;
    }
    if (STAGE_SHARED_VENUE_IDS.has(roomId)) {
      continue;
    }
    const allExplicitlyShared = occupants.every((p) => p.allowSharedRoom === true);
    if (!allExplicitlyShared) {
      const names = occupants.map((p) => `${p.id}(${p.groupName})`).join(', ');
      errors.push(
        `[部屋重複エラー] roomId "${roomId}" に複数の企画 [${names}] が割り当てられています。共同展示の場合は全該当企画に "allowSharedRoom": true を明記してください。`,
      );
    }
  }

  // ステージ枠の一意性・linkedProjectId 突合・時間帯重複検査
  const stageIds = new Set<string>();
  const slotsByDayAndVenue = new Map<string, StageSlotMaster[]>();

  for (const slot of stages) {
    if (stageIds.has(slot.id)) {
      errors.push(`[stages.json] ステージ枠ID "${slot.id}" が重複しています。`);
    }
    stageIds.add(slot.id);

    if (!locationIndex.has(slot.venueId)) {
      errors.push(
        `[stages.json] ステージ枠 "${slot.id}" の venueId "${slot.venueId}" がマップに存在しません。`,
      );
    }

    if (slot.linkedProjectId !== undefined && !projectMap.has(slot.linkedProjectId)) {
      errors.push(
        `[ステージ参照切れ] ステージ枠 "${slot.id}" (${slot.groupName}) の linkedProjectId "${slot.linkedProjectId}" が projects.json に存在しません。`,
      );
    }

    const bucketKey = `day${slot.day}:${slot.venueId}`;
    const bucket = slotsByDayAndVenue.get(bucketKey) ?? [];
    bucket.push(slot);
    slotsByDayAndVenue.set(bucketKey, bucket);
  }

  for (const [bucketKey, bucket] of slotsByDayAndVenue.entries()) {
    const sorted = [...bucket].sort(
      (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (hhmmToMinutes(curr.startTime) < hhmmToMinutes(prev.endTime)) {
        errors.push(
          `[ステージ時間重複] ${bucketKey} で "${prev.id}" (${prev.startTime}-${prev.endTime}) と "${curr.id}" (${curr.startTime}-${curr.endTime}) の時間帯が重複しています。`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      roomCount,
      spotCount: mapData.spots.length,
      projectCount: projects.length,
      mopStoreCount,
      stageSlotCount: stages.length,
      verifiedImageCount,
    },
  };
}

function main(): void {
  const mapPath = path.resolve(PROJECT_ROOT, 'data', 'campus_map_data.json');
  const projectsPath = path.resolve(PROJECT_ROOT, 'data', 'projects.json');
  const stagesPath = path.resolve(PROJECT_ROOT, 'data', 'stages.json');

  const rawMap = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as unknown;
  const rawProjects = JSON.parse(fs.readFileSync(projectsPath, 'utf8')) as unknown;
  const rawStages = JSON.parse(fs.readFileSync(stagesPath, 'utf8')) as unknown;

  const report = validateMasterDataObjects({
    rawMap,
    rawProjects,
    rawStages,
  });

  if (!report.ok) {
    console.error(`[validate:data] 検証エラー (${report.errors.length} 件):`);
    for (const err of report.errors) {
      console.error(`  ✗ ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `[validate:data] 全項目検証OK: 屋内部屋=${report.summary.roomCount}, スポット=${report.summary.spotCount}, 企画=${report.summary.projectCount} (うちMOP店=${report.summary.mopStoreCount}), ステージ枠=${report.summary.stageSlotCount}, 検証済WebP画像=${report.summary.verifiedImageCount}`,
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  main();
}
