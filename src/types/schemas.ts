import { z } from 'zod';
import type {
  CampusMapData,
  ProjectMaster,
  PublicLiveStateDoc,
  StageSlotMaster,
  StoreMopConfig,
} from './domain';

/**
 * 南陵祭2027 共通 Zod バリデーションスキーマ（SSOT: D-002 / D-009）
 * - ビルド前検証 CLI (scripts/validate-data.ts)、フロントエンド実行時検証、
 *   および Cloud Functions 2nd Gen (esbuild 経由インラインバンドル) で共有利用する。
 */

export const INSTAGRAM_HANDLE_REGEX = /^[A-Za-z0-9._]{1,30}$/;
export const ENTITY_SLUG_REGEX = /^[a-z0-9_-]{1,40}$/;
export const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const DISALLOWED_BARE_INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
]);

/**
 * 正規化済み Instagram ハンドルの厳格検証（schemas.ts と url-safety.ts の共通 SSOT）
 * - 英数字・ピリオド・アンダースコア 1〜30文字
 * - 先頭ピリオド・末尾ピリオド・連続ピリオド（..）は Instagram 仕様上無効
 * - ドメイン名そのもの（instagram.com 等）の誤混入を拒否
 */
export function isValidNormalizedInstagramHandle(handle: string): boolean {
  if (!INSTAGRAM_HANDLE_REGEX.test(handle)) {
    return false;
  }
  if (handle.startsWith('.') || handle.endsWith('.') || handle.includes('..')) {
    return false;
  }
  if (DISALLOWED_BARE_INSTAGRAM_HOSTS.has(handle.toLowerCase())) {
    return false;
  }
  return true;
}

// 南陵高校周辺（横浜市港南区・栄区・磯子区一帯）の妥当な緯度経度範囲
export const LatLngTupleSchema = z.tuple([
  z.number().min(35.3).max(35.45),
  z.number().min(139.5).max(139.65),
]);

export const FloorNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

// ============================================================================
// 1. キャンパスマップスキーマ
// ============================================================================

export const MapPolygonStyleSchema = z
  .object({
    fillColor: z.string().optional(),
    strokeColor: z.string().optional(),
    fillOpacity: z.number().min(0).max(1).optional(),
    weight: z.number().min(0).max(20).optional(),
  })
  .strict();

export const MapBuildingSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    category: z.string().min(1),
    floors: z.array(FloorNumberSchema),
    hasIndoor: z.boolean(),
    color: z.string().min(1),
    strokeColor: z.string().min(1),
    polygon: z.array(LatLngTupleSchema).min(3),
    style: MapPolygonStyleSchema.optional(),
  })
  .strict();

export const MapOutdoorAreaSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    type: z.string().min(1),
    category: z.string().min(1),
    color: z.string().min(1),
    strokeColor: z.string().min(1),
    polygon: z.array(LatLngTupleSchema).min(3),
  })
  .strict();

export const MapSpotSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    category: z.enum(['stage', 'shop', 'exhibit', 'facility']),
    floor: FloorNumberSchema,
    buildingId: z.string().regex(ENTITY_SLUG_REGEX),
    latlng: LatLngTupleSchema,
    icon: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

export const MapAccessRouteSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    subName: z.string().min(1),
    color: z.string().min(1),
    strokeWidth: z.number().positive(),
    smooth: z.boolean(),
    timeMinutes: z.number().int().positive(),
    distanceMeters: z.number().int().positive(),
    elevationGainMeters: z.number().int().nonnegative(),
    startPoint: z
      .object({
        name: z.string().min(1),
        latlng: LatLngTupleSchema,
      })
      .strict(),
    endPoint: z
      .object({
        name: z.string().min(1),
        latlng: LatLngTupleSchema,
      })
      .strict(),
    polyline: z.array(LatLngTupleSchema).min(2),
  })
  .strict();

export const MapRoomSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    category: z.enum(['classroom', 'special_room', 'stage']),
    floor: FloorNumberSchema,
    buildingId: z.string().regex(ENTITY_SLUG_REGEX),
    polygon: z.array(LatLngTupleSchema).min(3),
    pinCoord: LatLngTupleSchema,
    color: z.string().optional(),
    strokeColor: z.string().optional(),
    style: MapPolygonStyleSchema.optional(),
  })
  .strict();

export const MapCorridorSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    category: z.string().optional(),
    floor: FloorNumberSchema,
    buildingId: z.string().regex(ENTITY_SLUG_REGEX),
    polygon: z.array(LatLngTupleSchema).min(3),
    pinCoord: LatLngTupleSchema.optional(),
    isOverpass: z.boolean().optional(),
    buildingFrom: z.string().optional(),
    buildingTo: z.string().optional(),
    color: z.string().optional(),
    strokeColor: z.string().optional(),
    style: MapPolygonStyleSchema.optional(),
  })
  .strict();

export const MapStairSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    floor: FloorNumberSchema,
    buildingId: z.string().regex(ENTITY_SLUG_REGEX),
    polygon: z.array(LatLngTupleSchema).min(3),
    pinCoord: LatLngTupleSchema,
    isAllFloors: z.boolean(),
    connectsFloors: z.array(FloorNumberSchema).min(1),
    floors: z.array(FloorNumberSchema).min(1),
  })
  .strict();

export const MapToiletSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1),
    floor: FloorNumberSchema,
    buildingId: z.string().regex(ENTITY_SLUG_REGEX),
    gender: z.enum(['male', 'female', 'multi']),
    polygon: z.array(LatLngTupleSchema).min(3),
    pinCoord: LatLngTupleSchema,
    color: z.string().optional(),
    strokeColor: z.string().optional(),
    style: MapPolygonStyleSchema.optional(),
  })
  .strict();

export const MapIndoorFloorSchema = z
  .object({
    rooms: z.array(MapRoomSchema),
    corridors: z.array(MapCorridorSchema),
    stairs: z.array(MapStairSchema),
    toilets: z.array(MapToiletSchema),
  })
  .strict();

export const CampusMapDataSchema: z.ZodType<CampusMapData> = z
  .object({
    $schema: z.literal('nanryosai-campus-map-2027-v1'),
    version: z.string().min(1),
    metadata: z
      .object({
        title: z.string().min(1),
        updatedAt: z.string().min(1),
        center: LatLngTupleSchema,
        defaultZoom: z.number().int().min(10).max(24),
        minZoom: z.number().int().min(10).max(24),
        maxZoom: z.number().int().min(10).max(24),
        bounds: z.tuple([LatLngTupleSchema, LatLngTupleSchema]),
      })
      .strict(),
    buildings: z.array(MapBuildingSchema).min(1),
    outdoorAreas: z.array(MapOutdoorAreaSchema).min(1),
    spots: z.array(MapSpotSchema).min(1),
    accessRoutes: z.array(MapAccessRouteSchema).min(1),
    indoorFloors: z
      .object({
        '1': MapIndoorFloorSchema,
        '2': MapIndoorFloorSchema,
        '3': MapIndoorFloorSchema,
        '4': MapIndoorFloorSchema,
        '5': MapIndoorFloorSchema,
      })
      .strict(),
  })
  .strict();

// ============================================================================
// 2. 企画・模擬店・MOP設定 スキーマ
// ============================================================================

export const MenuOptionChoiceSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    label: z.string().min(1).max(40),
    priceDeltaYen: z.number().int().min(-1000).max(5000),
    isAvailable: z.boolean().optional(),
  })
  .strict();

export const MenuOptionGroupSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    label: z.string().min(1).max(40),
    selectionType: z.enum(['single', 'multiple']),
    required: z.boolean(),
    maxSelections: z.number().int().min(1).max(10).optional(),
    choices: z.array(MenuOptionChoiceSchema).min(1),
  })
  .strict()
  .superRefine((group, ctx) => {
    if (group.selectionType === 'single' && group.maxSelections !== undefined && group.maxSelections > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxSelections'],
        message: 'selectionType="single" のオプショングループでは maxSelections に 2 以上を指定できません。',
      });
    }
    const seenChoiceIds = new Set<string>();
    for (const [idx, choice] of group.choices.entries()) {
      if (seenChoiceIds.has(choice.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['choices', idx, 'id'],
          message: `オプショングループ "${group.id}" 内で選択肢ID "${choice.id}" が重複しています。`,
        });
      }
      seenChoiceIds.add(choice.id);
    }
  });

export const MenuItemMasterSchema = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    name: z.string().min(1).max(60),
    priceYen: z.number().int().min(0).max(10000).optional(),
    description: z.string().max(300).optional(),
    allergens: z.array(z.string().min(1).max(30)).optional(),
    hasImage: z.boolean().optional(),
    isRecommended: z.boolean().optional(),
    optionGroups: z.array(MenuOptionGroupSchema).optional(),
    initialStockCount: z.number().int().min(0).max(10000).optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (!item.optionGroups) {
      return;
    }
    const seenGroupIds = new Set<string>();
    for (const [idx, group] of item.optionGroups.entries()) {
      if (seenGroupIds.has(group.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['optionGroups', idx, 'id'],
          message: `商品 "${item.id}" 内でオプショングループID "${group.id}" が重複しています。`,
        });
      }
      seenGroupIds.add(group.id);
    }
  });

const StoreMopCommonFields = {
  storeId: z.string().regex(ENTITY_SLUG_REGEX),
  enabled: z.boolean(),
  kitchenMode: z.enum(['on', 'off']),
  maxQuantityPerOrder: z.number().int().min(1).max(20),
  mopNumberRange: z
    .object({
      min: z.literal(1000),
      max: z.literal(9999),
    })
    .strict(),
  posNumberRange: z
    .object({
      min: z.literal(100),
      max: z.literal(999),
    })
    .strict(),
};

export const StoreMopConfigSchema: z.ZodType<StoreMopConfig> = z.discriminatedUnion(
  'stockControlMode',
  [
    z
      .object({
        ...StoreMopCommonFields,
        stockControlMode: z.literal('store_total'),
        initialTotalStock: z.number().int().min(0).max(20000),
      })
      .strict(),
    z
      .object({
        ...StoreMopCommonFields,
        stockControlMode: z.literal('per_item'),
      })
      .strict(),
    z
      .object({
        ...StoreMopCommonFields,
        stockControlMode: z.literal('both'),
        initialTotalStock: z.number().int().min(0).max(20000),
      })
      .strict(),
  ],
);

export const ProjectMasterSchema: z.ZodType<ProjectMaster> = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,32}$/),
    groupName: z.string().min(1).max(60),
    name: z.string().min(1).max(80),
    catchphrase: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    category: z.enum(['cooking', 'shop', 'exhibit', 'stage']),
    votingCategory: z.enum(['cooking', 'shop', 'exhibit', 'stage', 'none']),
    placeLabel: z.string().min(1).max(80),
    subPlaceNote: z.string().min(1).max(200).optional(),
    hiddenOnMap: z.boolean().optional(),
    allowSharedRoom: z.boolean().optional(),
    floor: FloorNumberSchema.nullable(),
    roomId: z.string().regex(ENTITY_SLUG_REGEX).nullable(),
    instagramHandle: z
      .string()
      .refine(
        isValidNormalizedInstagramHandle,
        'Instagramハンドルは @ やURL・先頭/末尾/連続ピリオド・ドメイン単体を含めず、有効な半角英数字・ピリオド・アンダースコア1〜30文字で指定してください（自由文は description へ記載）',
      )
      .optional(),
    tags: z.array(z.string().min(1).max(30)).max(12),
    hasCoverImage: z.boolean(),
    galleryCount: z.number().int().min(0).max(9),
    menuNote: z.string().min(1).max(300).optional(),
    menu: z.array(MenuItemMasterSchema),
    mopConfig: StoreMopConfigSchema.optional(),
  })
  .strict()
  .superRefine((project, ctx) => {
    // 1. マップ表示対象企画は floor / roomId が必須（非表示企画でも片方のみ null は不整合として拒否）
    if (!project.hiddenOnMap) {
      if (project.floor === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['floor'],
          message: 'hiddenOnMap が true でない企画は floor の指定が必須です。',
        });
      }
      if (project.roomId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['roomId'],
          message: 'hiddenOnMap が true でない企画は roomId の指定が必須です。',
        });
      }
    } else if ((project.floor === null) !== (project.roomId === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roomId'],
        message: 'hiddenOnMap が true の企画で場所を省略する場合は floor と roomId の双方を null にしてください。',
      });
    }

    // 2. 企画内のメニュー商品ID重複チェック（Cloud Functions 単体実行時も自己完結で整合保証）
    const seenMenuItemIds = new Set<string>();
    for (const [idx, item] of project.menu.entries()) {
      if (seenMenuItemIds.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['menu', idx, 'id'],
          message: `企画 "${project.id}" 内でメニュー商品ID "${item.id}" が重複しています。`,
        });
      }
      seenMenuItemIds.add(item.id);
    }

    // 3. MOP対象店舗の整合性チェック（D-007 / D-008）
    if (project.mopConfig) {
      if (project.mopConfig.storeId !== project.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mopConfig', 'storeId'],
          message: `mopConfig.storeId ("${project.mopConfig.storeId}") は企画 id ("${project.id}") と一致させてください。`,
        });
      }
      if (project.menu.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['menu'],
          message: 'MOP設定がある企画には少なくとも1件のメニュー商品が必要です。',
        });
      }
      for (const [idx, item] of project.menu.entries()) {
        if (item.priceYen === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['menu', idx, 'priceYen'],
            message: `MOP対象商品 "${item.name}" には priceYen（整数・円）の設定が必須です。`,
          });
        }
        if (
          project.mopConfig.stockControlMode === 'store_total' &&
          item.initialStockCount !== undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['menu', idx, 'initialStockCount'],
            message: `stockControlMode="store_total" の店舗では商品 "${item.name}" に initialStockCount は指定できません。店舗合計と商品別の両方で残数管理する場合は stockControlMode="both" を指定してください。`,
          });
        }
        if (
          (project.mopConfig.stockControlMode === 'per_item' ||
            project.mopConfig.stockControlMode === 'both') &&
          item.initialStockCount === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['menu', idx, 'initialStockCount'],
            message: `stockControlMode="${project.mopConfig.stockControlMode}" の店舗では商品 "${item.name}" に initialStockCount（商品別初期残数）が必須です。`,
          });
        }
      }
    }
  });

// ============================================================================
// 3. ステージタイムテーブル スキーマ
// ============================================================================

const VENUE_LABEL_MAP = {
  gym_stage: '体育館',
  admin_3f_av_room: '視聴覚室',
  student_4f_music_room: '音楽室',
} as const;

export const StageVenueIdSchema = z.enum([
  'gym_stage',
  'admin_3f_av_room',
  'student_4f_music_room',
]);

export const StageSlotMasterSchema: z.ZodType<StageSlotMaster> = z
  .object({
    id: z.string().regex(ENTITY_SLUG_REGEX),
    day: z.union([z.literal(1), z.literal(2)]),
    sessionType: z.enum(['day1', 'day2_public', 'after_festival']),
    venueId: StageVenueIdSchema,
    venueLabel: z.enum(['体育館', '視聴覚室', '音楽室']),
    startTime: z.string().regex(TIME_HHMM_REGEX, 'HH:MM 形式で指定してください'),
    endTime: z.string().regex(TIME_HHMM_REGEX, 'HH:MM 形式で指定してください'),
    groupName: z.string().min(1).max(80),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    linkedProjectId: z.string().regex(/^[a-z0-9_-]{1,32}$/).optional(),
    tags: z.array(z.string().min(1).max(30)).max(10),
  })
  .strict()
  .superRefine((slot, ctx) => {
    if (slot.startTime >= slot.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: `終了時刻 (${slot.endTime}) は開始時刻 (${slot.startTime}) より後である必要があります。`,
      });
    }
    if (VENUE_LABEL_MAP[slot.venueId] !== slot.venueLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['venueLabel'],
        message: `venueId "${slot.venueId}" に対する venueLabel は "${VENUE_LABEL_MAP[slot.venueId]}" である必要があります。`,
      });
    }
    if (slot.day === 1 && slot.sessionType !== 'day1') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sessionType'],
        message: '1日目のステージ枠の sessionType は "day1" である必要があります。',
      });
    }
    if (slot.day === 2 && slot.sessionType === 'day1') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sessionType'],
        message: '2日目のステージ枠の sessionType は "day2_public" または "after_festival" を指定してください。',
      });
    }
  });

// ============================================================================
// 4. 第1層 public/live_state スキーマ
// ============================================================================

export const LiveVenueStatusSchema = z
  .object({
    venueId: StageVenueIdSchema,
    congestion: z.enum(['low', 'medium', 'high', 'restricted']),
    currentSlotId: z.string().nullable(),
    delayMinutes: z.number().int().min(-60).max(180),
    note: z.string().max(120).optional(),
    updatedAtIso: z.string().min(1),
  })
  .strict();

export const LiveMopStoreSummarySchema = z
  .object({
    storeId: z.string().regex(/^[a-z0-9_-]{1,32}$/),
    status: z.enum(['preparing', 'open', 'paused', 'sold_out', 'closed']),
    remainingTotal: z.number().int().min(0).optional(),
    soldOutItemIds: z.array(z.string()),
    updatedAtIso: z.string().min(1),
  })
  .strict();

export const PublicLiveStateDocSchema: z.ZodType<PublicLiveStateDoc> = z
  .object({
    schemaVersion: z.literal(1),
    updatedAtIso: z.string().min(1),
    mopGlobalEnabled: z.boolean(),
    emergencyBanner: z
      .object({
        active: z.boolean(),
        level: z.enum(['info', 'warning', 'critical']),
        message: z.string().min(1).max(300),
      })
      .strict()
      .nullable(),
    venues: z.record(z.string(), LiveVenueStatusSchema),
    mopStores: z.record(z.string(), LiveMopStoreSummarySchema),
  })
  .strict()
  .superRefine((stateDoc, ctx) => {
    for (const [key, venue] of Object.entries(stateDoc.venues)) {
      if (venue.venueId !== key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['venues', key, 'venueId'],
          message: `venues の辞書キー "${key}" と venueId "${venue.venueId}" が一致していません。`,
        });
      }
    }
    for (const [key, store] of Object.entries(stateDoc.mopStores)) {
      if (store.storeId !== key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mopStores', key, 'storeId'],
          message: `mopStores の辞書キー "${key}" と storeId "${store.storeId}" が一致していません。`,
        });
      }
    }
  });
