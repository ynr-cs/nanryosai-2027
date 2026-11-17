import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_MAX_BYTES } from '../scripts/process-assets';
import { validateMasterDataObjects } from '../scripts/validate-data';
import type { ProjectMaster, StageSlotMaster } from '@/types/domain';
import {
  ProjectMasterSchema,
  PublicLiveStateDocSchema,
  StageSlotMasterSchema,
  StoreMopConfigSchema,
} from '@/types/schemas';

const ROOT_DIR = path.resolve(__dirname, '..');
const rawMap = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'data', 'campus_map_data.json'), 'utf8'),
) as unknown;
const rawProjects = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'data', 'projects.json'), 'utf8'),
) as ProjectMaster[];
const rawStages = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'data', 'stages.json'), 'utf8'),
) as StageSlotMaster[];

describe('SSOT マスターデータ & Zod スキーマ検証', () => {
  it('リポジトリ内の data/*.json と生成済み WebP アセットが全項目エラーゼロで通過する', () => {
    const report = validateMasterDataObjects({
      rawMap,
      rawProjects,
      rawStages,
    });
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.summary.roomCount).toBe(51);
    expect(report.summary.spotCount).toBe(11);
  });

  it('自由文・@付き・不正ドット配列・ドメイン単体の Instagram ハンドルが projects.json に混入した場合は Zod が即座に拒否する', () => {
    for (const badHandle of [
      '笹森ってインスタで打ったら出てきます',
      '@nanryo_sample_301',
      '...',
      '.leading_dot',
      'trailing_dot.',
      'double..dot',
      'instagram.com',
      'www.instagram.com',
    ]) {
      const invalid = {
        ...rawProjects[0]!,
        instagramHandle: badHandle,
      };
      expect(
        ProjectMasterSchema.safeParse(invalid).success,
        `"${badHandle}" は拒否されるべき`,
      ).toBe(false);
    }
  });

  it('オプショングループ内の選択肢ID重複や single 選択時の maxSelections > 1 を拒否する', () => {
    const dupChoices = {
      ...rawProjects[0]!,
      menu: [
        {
          id: 'dup_opt_item',
          name: '重複オプション検証品',
          priceYen: 200,
          optionGroups: [
            {
              id: 'grp_1',
              label: '味',
              selectionType: 'single' as const,
              required: true,
              choices: [
                { id: 'c1', label: 'A', priceDeltaYen: 0 },
                { id: 'c1', label: 'B', priceDeltaYen: 10 },
              ],
            },
          ],
        },
      ],
    };
    expect(ProjectMasterSchema.safeParse(dupChoices).success).toBe(false);

    const invalidSingleMax = {
      ...rawProjects[0]!,
      menu: [
        {
          id: 'single_max_item',
          name: '不正maxSelections検証品',
          priceYen: 200,
          optionGroups: [
            {
              id: 'grp_1',
              label: '味',
              selectionType: 'single' as const,
              required: true,
              maxSelections: 2,
              choices: [{ id: 'c1', label: 'A', priceDeltaYen: 0 }],
            },
          ],
        },
      ],
    };
    expect(ProjectMasterSchema.safeParse(invalidSingleMax).success).toBe(false);
  });

  it('ギャラリー連番と衝突する企画IDペア（team と team_1 等）を検知する', () => {
    const base = rawProjects[8]!; // hiddenOnMap: true
    const collidingProjects: ProjectMaster[] = [
      { ...base, id: 'team', hasCoverImage: false, galleryCount: 1 },
      { ...base, id: 'team_1', hasCoverImage: false, galleryCount: 0 },
    ];
    const report = validateMasterDataObjects({
      rawMap,
      rawProjects: collidingProjects,
      rawStages: [],
      checkImagesOnDisk: false,
    });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.includes('[企画ID衝突エラー]'))).toBe(true);
  });

  it('hiddenOnMap でない企画で roomId または floor が null の場合は拒否する', () => {
    const missingRoom = {
      ...rawProjects[2]!,
      hiddenOnMap: false,
      roomId: null,
    };
    expect(ProjectMasterSchema.safeParse(missingRoom).success).toBe(false);
  });

  it('MOP設定で per_item 残数モードなのに商品に initialStockCount がない場合は拒否し、initialTotalStock の誤指定も拒否する', () => {
    const brokenPerItem = {
      ...rawProjects[1]!,
      menu: [
        {
          id: 'broken_item',
          name: '初期在庫未設定メニュー',
          priceYen: 300,
        },
      ],
    };
    const perItemRes = ProjectMasterSchema.safeParse(brokenPerItem);
    expect(perItemRes.success).toBe(false);
    if (!perItemRes.success) {
      expect(
        perItemRes.error.issues.some(
          (issue) =>
            issue.path.join('.') === 'menu.0.initialStockCount' &&
            issue.message.includes('stockControlMode="per_item"'),
        ),
      ).toBe(true);
    }

    const perItemWithTotalStock = {
      ...rawProjects[1]!.mopConfig!,
      initialTotalStock: 300,
    };
    expect(StoreMopConfigSchema.safeParse(perItemWithTotalStock).success).toBe(false);
  });

  it('MOP設定で stockControlMode="both"（店舗合計＋商品別残数の併用: D-007）を検証し、initialTotalStock と全商品の initialStockCount を必須とする', () => {
    const validBothProject: ProjectMaster = {
      ...rawProjects[1]!,
      id: 'sample_mop_both',
      mopConfig: {
        storeId: 'sample_mop_both',
        enabled: true,
        kitchenMode: 'on',
        stockControlMode: 'both',
        initialTotalStock: 300,
        maxQuantityPerOrder: 5,
        mopNumberRange: { min: 1000, max: 9999 },
        posNumberRange: { min: 100, max: 999 },
      },
      menu: [
        {
          id: 'crepe_strawberry',
          name: '限定いちごクレープ',
          priceYen: 350,
          initialStockCount: 80,
        },
        {
          id: 'crepe_choco_banana',
          name: 'チョコバナナクレープ',
          priceYen: 300,
          initialStockCount: 300,
        },
      ],
    };

    expect(ProjectMasterSchema.safeParse(validBothProject).success).toBe(true);

    // 境界値: initialTotalStock = 0, initialStockCount = 0 でも整数0以上として通過する
    const zeroBoundaryBoth: ProjectMaster = {
      ...validBothProject,
      mopConfig: {
        ...validBothProject.mopConfig!,
        stockControlMode: 'both',
        initialTotalStock: 0,
      },
      menu: [
        {
          id: 'crepe_soldout_init',
          name: '受付開始前メニュー',
          priceYen: 300,
          initialStockCount: 0,
        },
      ],
    };
    expect(ProjectMasterSchema.safeParse(zeroBoundaryBoth).success).toBe(true);

    // 異常系1: stockControlMode="both" なのに initialTotalStock が欠落している場合
    const missingTotalInBoth = {
      storeId: 'sample_mop_both',
      enabled: true,
      kitchenMode: 'on',
      stockControlMode: 'both',
      maxQuantityPerOrder: 5,
      mopNumberRange: { min: 1000, max: 9999 },
      posNumberRange: { min: 100, max: 999 },
    };
    expect(StoreMopConfigSchema.safeParse(missingTotalInBoth).success).toBe(false);

    // 異常系2: initialTotalStock が負数または上限(20000)超過または小数の場合
    for (const badTotal of [-1, 20001, 10.5]) {
      expect(
        StoreMopConfigSchema.safeParse({
          ...validBothProject.mopConfig,
          initialTotalStock: badTotal,
        }).success,
      ).toBe(false);
    }

    // 異常系3: stockControlMode="both" なのに一部商品に initialStockCount が欠落している場合
    const missingItemStockInBoth = {
      ...validBothProject,
      menu: [
        validBothProject.menu[0]!,
        {
          id: 'crepe_no_cap',
          name: '初期残数未設定クレープ',
          priceYen: 300,
        },
      ],
    };
    const bothMissingItemRes = ProjectMasterSchema.safeParse(missingItemStockInBoth);
    expect(bothMissingItemRes.success).toBe(false);
    if (!bothMissingItemRes.success) {
      expect(
        bothMissingItemRes.error.issues.some(
          (issue) =>
            issue.path.join('.') === 'menu.1.initialStockCount' &&
            issue.message.includes('stockControlMode="both"'),
        ),
      ).toBe(true);
    }

    // 異常系4: stockControlMode="store_total" なのに商品別 initialStockCount が誤設定されている場合（both への誘導）
    const storeTotalWithItemStock = {
      ...rawProjects[0]!, // store_total
      menu: [
        {
          ...rawProjects[0]!.menu[0]!,
          initialStockCount: 80,
        },
      ],
    };
    const storeTotalMisconfigRes = ProjectMasterSchema.safeParse(storeTotalWithItemStock);
    expect(storeTotalMisconfigRes.success).toBe(false);
    if (!storeTotalMisconfigRes.success) {
      expect(
        storeTotalMisconfigRes.error.issues.some(
          (issue) =>
            issue.path.join('.') === 'menu.0.initialStockCount' &&
            issue.message.includes('stockControlMode="both"'),
        ),
      ).toBe(true);
    }

    // 異常系5: 単一企画内でメニュー商品IDが重複している場合も ProjectMasterSchema 単体で拒否する
    const duplicateMenuIdsInProject = {
      ...validBothProject,
      menu: [validBothProject.menu[0]!, { ...validBothProject.menu[1]!, id: 'crepe_strawberry' }],
    };
    expect(ProjectMasterSchema.safeParse(duplicateMenuIdsInProject).success).toBe(false);
  });

  it('存在しない RoomId やフロア階層ズレ（2026年7教室ズレ事故パターン）を確実に検知する', () => {
    const wrongFloorProjects: ProjectMaster[] = [
      {
        ...rawProjects[3]!, // student_1f_homeroom_3_6 (実際は1F)
        floor: 2,
      },
    ];
    const reportFloorMismatch = validateMasterDataObjects({
      rawMap,
      rawProjects: wrongFloorProjects,
      rawStages: [],
      checkImagesOnDisk: false,
    });
    expect(reportFloorMismatch.ok).toBe(false);
    expect(reportFloorMismatch.errors.some((e) => e.includes('[フロア不一致]'))).toBe(true);

    const nonExistentRoomProjects: ProjectMaster[] = [
      {
        ...rawProjects[2]!,
        roomId: 'student_4f_ghost_room',
      },
    ];
    const reportMissingRoom = validateMasterDataObjects({
      rawMap,
      rawProjects: nonExistentRoomProjects,
      rawStages: [],
      checkImagesOnDisk: false,
    });
    expect(reportMissingRoom.ok).toBe(false);
    expect(reportMissingRoom.errors.some((e) => e.includes('[RoomId未存在]'))).toBe(true);
  });

  it('allowSharedRoom なしで通常教室が重複した場合はエラーとし、ステージ会場の共有は許可する', () => {
    const base = rawProjects[2]!;
    const duplicatedClassroom: ProjectMaster[] = [
      { ...base, id: 'dup_a', hasCoverImage: false, galleryCount: 0 },
      { ...base, id: 'dup_b', hasCoverImage: false, galleryCount: 0 },
    ];
    const report = validateMasterDataObjects({
      rawMap,
      rawProjects: duplicatedClassroom,
      rawStages: [],
      checkImagesOnDisk: false,
    });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.includes('[部屋重複エラー]'))).toBe(true);
  });

  it('ステージ枠の終了時刻逆転・linkedProjectId 参照切れ・同一会場時間帯重複を検知する', () => {
    expect(
      StageSlotMasterSchema.safeParse({
        ...rawStages[0]!,
        startTime: '12:00',
        endTime: '11:30',
      }).success,
    ).toBe(false);

    const brokenStages: StageSlotMaster[] = [
      {
        ...rawStages[0]!,
        id: 'slot_a',
        startTime: '11:00',
        endTime: '11:40',
        linkedProjectId: 'unknown_club',
      },
      {
        ...rawStages[0]!,
        id: 'slot_b',
        startTime: '11:30',
        endTime: '12:00',
      },
    ];
    const report = validateMasterDataObjects({
      rawMap,
      rawProjects: [],
      rawStages: brokenStages,
      checkImagesOnDisk: false,
    });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.includes('[ステージ参照切れ]'))).toBe(true);
    expect(report.errors.some((e) => e.includes('[ステージ時間重複]'))).toBe(true);
  });

  it('上限サイズ (90KB) を超える未圧縮 WebP が配置された場合に容量超過エラーで遮断する', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanryo-validate-img-'));
    try {
      const projDir = path.join(tmpDir, 'projects');
      fs.mkdirSync(projDir, { recursive: true });
      fs.writeFileSync(path.join(projDir, 'bloated_proj_thumb.webp'), Buffer.alloc(1024, 1));
      fs.writeFileSync(
        path.join(projDir, 'bloated_proj_hero.webp'),
        Buffer.alloc(HERO_MAX_BYTES + 500, 1),
      );

      const testProject: ProjectMaster = {
        ...rawProjects[2]!,
        id: 'bloated_proj',
        hasCoverImage: true,
        galleryCount: 0,
        menu: [],
      };

      const report = validateMasterDataObjects({
        rawMap,
        rawProjects: [testProject],
        rawStages: [],
        publicImagesDir: tmpDir,
        checkImagesOnDisk: true,
      });

      expect(report.ok).toBe(false);
      expect(report.errors.some((e) => e.includes('[画像容量超過]'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('PublicLiveStateDocSchema が正常ドキュメントを受理し未知フィールドを strict に拒否する', () => {
    const valid = PublicLiveStateDocSchema.safeParse({
      schemaVersion: 1,
      updatedAtIso: '2026-11-17T04:00:00.000Z',
      mopGlobalEnabled: false,
      emergencyBanner: {
        active: true,
        level: 'info',
        message: '体育館開場しました',
      },
      venues: {
        gym_stage: {
          venueId: 'gym_stage',
          congestion: 'medium',
          currentSlotId: 'keion_gym_d1',
          delayMinutes: 5,
          updatedAtIso: '2026-11-17T04:00:00.000Z',
        },
      },
      mopStores: {},
    });
    expect(valid.success).toBe(true);

    const unknownProp = PublicLiveStateDocSchema.safeParse({
      schemaVersion: 1,
      updatedAtIso: '2026-11-17T04:00:00.000Z',
      mopGlobalEnabled: false,
      emergencyBanner: null,
      venues: {},
      mopStores: {},
      injectedField: 'bad',
    });
    expect(unknownProp.success).toBe(false);

    const mismatchedVenueKey = PublicLiveStateDocSchema.safeParse({
      schemaVersion: 1,
      updatedAtIso: '2026-11-17T04:00:00.000Z',
      mopGlobalEnabled: false,
      emergencyBanner: null,
      venues: {
        gym_stage: {
          venueId: 'admin_3f_av_room',
          congestion: 'low',
          currentSlotId: null,
          delayMinutes: 0,
          updatedAtIso: '2026-11-17T04:00:00.000Z',
        },
      },
      mopStores: {},
    });
    expect(mismatchedVenueKey.success).toBe(false);
  });
});
