import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CampusMapData,
  FloorKey,
  FloorNumber,
  LatLngTuple,
  MapAccessRoute,
  MapBuilding,
  MapCorridor,
  MapIndoorFloor,
  MapOutdoorArea,
  MapPolygonStyle,
  MapRoom,
  MapSpot,
  MapStair,
  MapToilet,
} from '../src/types/domain';
import { CampusMapDataSchema } from '../src/types/schemas';

/**
 * 2026年 campus_map_data.json -> 2027年 正規化ID SSOT 変換スクリプト（D-001 / D-009）
 * - 機械的な連番推測を一切行わず、全51室・11スポット・9建物・4屋外エリア・4アクセス経路を
 *   明示的1対1辞書で変換し、名称・階層・総件数の完全一致をアサートする。
 * - 冗長な coordinates 二重配列・linkedProjectIds・年度クラス名直書きを除去する。
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_PATH = path.resolve(
  PROJECT_ROOT,
  '..',
  'nanryosai-2026',
  'nanryosai-2026',
  'main',
  'data',
  'campus_map_data.json',
);
const DEFAULT_OUTPUT_PATH = path.resolve(PROJECT_ROOT, 'data', 'campus_map_data.json');

export const BUILDING_ID_MAP: Readonly<Record<string, { id: string; expectedName: string }>> = {
  生徒棟: { id: 'bldg_student', expectedName: '生徒棟' },
  体育館: { id: 'bldg_gym', expectedName: '体育館' },
  管理棟: { id: 'bldg_admin', expectedName: '管理棟' },
  格技場: { id: 'bldg_martial_arts', expectedName: '格技場' },
  健康福祉棟: { id: 'bldg_health_welfare', expectedName: '健康福祉棟' },
  新体育館: { id: 'bldg_new_gym', expectedName: '新体育館' },
  プール: { id: 'bldg_pool', expectedName: 'プール' },
  校庭: { id: 'bldg_ground', expectedName: '校庭' },
  弓道場: { id: 'bldg_archery', expectedName: '弓道場' },
};

export const OUTDOOR_AREA_ID_MAP: Readonly<Record<string, { id: string; expectedName: string }>> = {
  outdoor_994289: { id: 'area_courtyard_main', expectedName: '中庭・メイン広場' },
  outdoor_023880: { id: 'area_student_gym_passage', expectedName: '生徒棟-体育館間 通路エリア' },
  outdoor_045671: { id: 'area_west_perimeter', expectedName: '西側外周エリア' },
  outdoor_094547: { id: 'area_south_admin_welfare', expectedName: '南側管理・福祉棟間エリア' },
};

export const ACCESS_ROUTE_ID_MAP: Readonly<Record<string, { id: string; expectedName: string }>> = {
  route_180112: {
    id: 'route_yokodai_north_kamiooka',
    expectedName: '洋光台北口 (上大岡・港南中央・上永谷方面)',
  },
  route_938688: {
    id: 'route_yokodai_north_konandai',
    expectedName: '洋光台北口 (洋光台・港南台方面)',
  },
  route_290409: {
    id: 'route_hino_park_entrance',
    expectedName: '日野中央公園入口 (上大岡・港南中央・上永谷方面)',
  },
  route_875650: {
    id: 'route_hino_elementary',
    expectedName: '日野小学校前',
  },
};

export const SPOT_ID_MAP: Readonly<
  Record<
    string,
    {
      id: string;
      expectedOldName: string;
      normalizedName: string;
      normalizedDescription: string;
    }
  >
> = {
  room_gym_main: {
    id: 'gym_stage',
    expectedOldName: '体育館',
    normalizedName: '体育館',
    normalizedDescription: '体育館ステージ発表会場（演劇・ダンス・音楽・有志発表）',
  },
  tent_102: {
    id: 'courtyard_tent_1',
    expectedOldName: '中庭テント (1-2)',
    normalizedName: '中庭テント 1',
    normalizedDescription: '中庭 屋外模擬店テント区画 1',
  },
  tent_301: {
    id: 'courtyard_tent_2',
    expectedOldName: '中庭テント (3-1)',
    normalizedName: '中庭テント 2',
    normalizedDescription: '中庭 屋外模擬店テント区画 2',
  },
  tent_302: {
    id: 'courtyard_tent_3',
    expectedOldName: '中庭テント (3-2)',
    normalizedName: '中庭テント 3',
    normalizedDescription: '中庭 屋外模擬店テント区画 3',
  },
  tent_306: {
    id: 'courtyard_tent_4',
    expectedOldName: '中庭テント (3-6)',
    normalizedName: '中庭テント 4',
    normalizedDescription: '中庭 屋外模擬店テント区画 4',
  },
  tent_304: {
    id: 'entrance_tent_1',
    expectedOldName: '昇降口前テント (3-4)',
    normalizedName: '昇降口前テント 1',
    normalizedDescription: '昇降口前 屋外模擬店テント区画 1',
  },
  tent_305: {
    id: 'entrance_tent_2',
    expectedOldName: '昇降口前テント (3-5)',
    normalizedName: '昇降口前テント 2',
    normalizedDescription: '昇降口前 屋外模擬店テント区画 2',
  },
  tent_307: {
    id: 'entrance_tent_3',
    expectedOldName: '昇降口前テント (3-7)',
    normalizedName: '昇降口前テント 3',
    normalizedDescription: '昇降口前 屋外模擬店テント区画 3',
  },
  piloti_1f: {
    id: 'piloti_1f',
    expectedOldName: '1F ピロティ',
    normalizedName: '1F ピロティ',
    normalizedDescription: '生徒棟 1F ピロティ販売スペース',
  },
  health_bldg: {
    id: 'health_welfare_bldg',
    expectedOldName: '健康福祉棟',
    normalizedName: '健康福祉棟',
    normalizedDescription: '健康福祉棟',
  },
  spot_corridor_2f: {
    id: 'student_2f_overpass',
    expectedOldName: '生徒棟 2F 渡り廊下',
    normalizedName: '生徒棟 2F 渡り廊下',
    normalizedDescription: '生徒棟 2F 渡り廊下 展示スペース',
  },
};

export const ROOM_ID_MAP: Readonly<
  Record<string, { id: string; expectedName: string; expectedFloor: FloorNumber }>
> = {
  // === 1F (10室: 生徒棟1Fに 3年6組・3年7組 が配置されている南陵固有構造) ===
  room_102_2577: { id: 'student_1f_memorial_room', expectedName: '記念室', expectedFloor: 1 },
  room_103_2577: { id: 'student_1f_homeroom_3_6', expectedName: '3年6組 教室', expectedFloor: 1 },
  room_104_2577: { id: 'student_1f_homeroom_3_7', expectedName: '3年7組 教室', expectedFloor: 1 },
  room_105_2577: { id: 'student_1f_elective_3', expectedName: '選択教室3', expectedFloor: 1 },
  room_106_2577: { id: 'student_1f_council_room', expectedName: '生徒会室', expectedFloor: 1 },
  room_107_2577: { id: 'student_1f_career_room', expectedName: '進路指導室', expectedFloor: 1 },
  special_room_656395: {
    id: 'student_1f_cooking_room',
    expectedName: '食事室・調理室',
    expectedFloor: 1,
  },
  special_room_802197: {
    id: 'student_1f_chemistry_prep',
    expectedName: '化学準備室',
    expectedFloor: 1,
  },
  special_room_818121: {
    id: 'student_1f_chemistry_lab',
    expectedName: '化学実験室',
    expectedFloor: 1,
  },
  special_room_911070: { id: 'student_1f_infirmary', expectedName: '保健室', expectedFloor: 1 },

  // === 2F (13室) ===
  room_202_3256: { id: 'student_2f_homeroom_3_1', expectedName: '3年1組 教室', expectedFloor: 2 },
  room_203_3256: { id: 'student_2f_homeroom_3_2', expectedName: '3年2組 教室', expectedFloor: 2 },
  room_204_3256: { id: 'student_2f_homeroom_3_3', expectedName: '3年3組 教室', expectedFloor: 2 },
  room_205_3256: { id: 'student_2f_homeroom_3_4', expectedName: '3年4組 教室', expectedFloor: 2 },
  room_206_3256: { id: 'student_2f_homeroom_3_5', expectedName: '3年5組 教室', expectedFloor: 2 },
  room_206_2637: {
    id: 'student_2f_resource_prep',
    expectedName: 'リソースルーム準備室',
    expectedFloor: 2,
  },
  room_207_2637: {
    id: 'student_2f_computer_room',
    expectedName: 'コンピュータ室',
    expectedFloor: 2,
  },
  special_room_188905: { id: 'student_2f_etiquette_room', expectedName: '作法室', expectedFloor: 2 },
  special_room_203688: { id: 'student_2f_clothing_room', expectedName: '被服室', expectedFloor: 2 },
  special_room_337807: {
    id: 'student_2f_calligraphy_room',
    expectedName: '書道室',
    expectedFloor: 2,
  },
  special_room_364626: {
    id: 'student_2f_calligraphy_prep',
    expectedName: '書道準備室',
    expectedFloor: 2,
  },
  special_room_818121_2f: {
    id: 'student_2f_physics_lab',
    expectedName: '物理実験室',
    expectedFloor: 2,
  },
  special_room_802197_2f: {
    id: 'student_2f_physics_prep',
    expectedName: '物理準備室',
    expectedFloor: 2,
  },

  // === 3F (14室: 管理棟3F 視聴覚室 を含む) ===
  room_202_3256_3f: { id: 'student_3f_homeroom_2_1', expectedName: '2年1組 教室', expectedFloor: 3 },
  room_203_3256_3f: { id: 'student_3f_homeroom_2_2', expectedName: '2年2組 教室', expectedFloor: 3 },
  room_204_3256_3f: { id: 'student_3f_homeroom_2_3', expectedName: '2年3組 教室', expectedFloor: 3 },
  room_205_3256_3f: { id: 'student_3f_homeroom_2_4', expectedName: '2年4組 教室', expectedFloor: 3 },
  room_206_3256_3f: { id: 'student_3f_homeroom_2_5', expectedName: '2年5組 教室', expectedFloor: 3 },
  room_206_2637_3f: { id: 'student_3f_homeroom_2_6', expectedName: '2年6組 教室', expectedFloor: 3 },
  room_207_2637_3f: { id: 'student_3f_homeroom_2_7', expectedName: '2年7組 教室', expectedFloor: 3 },
  special_room_188905_3f: {
    id: 'student_3f_resource_2',
    expectedName: 'リソースルーム2',
    expectedFloor: 3,
  },
  special_room_203688_3f: {
    id: 'student_3f_elective_2',
    expectedName: '選択教室2',
    expectedFloor: 3,
  },
  special_room_337807_3f: { id: 'student_3f_art_room', expectedName: '美術室', expectedFloor: 3 },
  special_room_364626_3f: {
    id: 'student_3f_art_prep',
    expectedName: '美術準備室',
    expectedFloor: 3,
  },
  special_room_818121_3f: {
    id: 'student_3f_biology_lab',
    expectedName: '生物実験室',
    expectedFloor: 3,
  },
  special_room_802197_3f: {
    id: 'student_3f_biology_prep',
    expectedName: '生物準備室',
    expectedFloor: 3,
  },
  room_admin_301_av: { id: 'admin_3f_av_room', expectedName: '視聴覚室', expectedFloor: 3 },

  // === 4F (13室: 特別教室を挟んで 1年7組 -> 1年6組 の逆順配置に完全対応) ===
  room_202_3256_4f: { id: 'student_4f_homeroom_1_1', expectedName: '1年1組 教室', expectedFloor: 4 },
  room_203_3256_4f: { id: 'student_4f_homeroom_1_2', expectedName: '1年2組 教室', expectedFloor: 4 },
  room_204_3256_4f: { id: 'student_4f_homeroom_1_3', expectedName: '1年3組 教室', expectedFloor: 4 },
  room_205_3256_4f: { id: 'student_4f_homeroom_1_4', expectedName: '1年4組 教室', expectedFloor: 4 },
  room_206_3256_4f: { id: 'student_4f_homeroom_1_5', expectedName: '1年5組 教室', expectedFloor: 4 },
  room_206_2637_4f: {
    id: 'student_4f_resource_1',
    expectedName: 'リソースルーム1',
    expectedFloor: 4,
  },
  room_207_2637_4f: { id: 'student_4f_elective_1', expectedName: '選択教室1', expectedFloor: 4 },
  special_room_188905_4f: {
    id: 'student_4f_homeroom_1_7',
    expectedName: '1年7組 教室',
    expectedFloor: 4,
  },
  special_room_203688_4f: {
    id: 'student_4f_homeroom_1_6',
    expectedName: '1年6組 教室',
    expectedFloor: 4,
  },
  special_room_337807_4f: { id: 'student_4f_music_room', expectedName: '音楽室', expectedFloor: 4 },
  special_room_364626_4f: {
    id: 'student_4f_music_prep',
    expectedName: '音楽準備室',
    expectedFloor: 4,
  },
  special_room_818121_4f: {
    id: 'student_4f_subject_prep',
    expectedName: '教科準備室',
    expectedFloor: 4,
  },
  special_room_802197_4f: { id: 'student_4f_storage', expectedName: '倉庫', expectedFloor: 4 },

  // === 5F (1室) ===
  room_501_library: { id: 'student_5f_sky_library', expectedName: '天空の図書館', expectedFloor: 5 },
};

interface LegacyMapRaw {
  metadata: {
    center: [number, number];
    defaultZoom: number;
    minZoom: number;
    maxZoom: number;
    bounds: [[number, number], [number, number]];
  };
  buildings: Array<{
    id: string;
    name: string;
    category: string;
    floors: FloorNumber[];
    hasIndoor: boolean;
    color: string;
    strokeColor: string;
    polygon: Array<[number, number]>;
    style?: MapPolygonStyle;
  }>;
  outdoorAreas: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    color: string;
    strokeColor: string;
    polygon: Array<[number, number]>;
  }>;
  spots: Array<{
    id: string;
    name: string;
    category: 'stage' | 'shop' | 'exhibit' | 'facility';
    floor: FloorNumber;
    buildingId: string;
    latlng: [number, number];
    icon: string;
    description: string;
  }>;
  accessRoutes: Array<{
    id: string;
    name: string;
    subName: string;
    color: string;
    strokeWidth: number;
    smooth: boolean;
    timeMinutes: number;
    distanceMeters: number;
    elevationGainMeters: number;
    startPoint: { name: string; latlng: [number, number] };
    endPoint: { name: string; latlng: [number, number] };
    polyline: Array<[number, number]>;
  }>;
  indoorFloors: Record<
    FloorKey,
    {
      rooms: Array<{
        id: string;
        name: string;
        category: 'classroom' | 'special_room' | 'stage';
        floor: FloorNumber;
        buildingId: string;
        polygon: Array<[number, number]>;
        pinCoord: [number, number];
        color?: string;
        strokeColor?: string;
        style?: MapPolygonStyle;
      }>;
      corridors: Array<{
        id: string;
        name: string;
        category?: string;
        floor: FloorNumber;
        buildingId: string;
        polygon: Array<[number, number]>;
        pinCoord?: [number, number];
        isOverpass?: boolean;
        buildingFrom?: string;
        buildingTo?: string;
        color?: string;
        strokeColor?: string;
        style?: MapPolygonStyle;
      }>;
      stairs: Array<{
        id: string;
        name: string;
        floor: FloorNumber;
        buildingId: string;
        polygon: Array<[number, number]>;
        pinCoord: [number, number];
        isAllFloors: boolean;
        connectsFloors: FloorNumber[];
        floors: FloorNumber[];
      }>;
      toilets: Array<{
        id: string;
        name: string;
        floor: FloorNumber;
        buildingId: string;
        gender: 'male' | 'female' | 'multi';
        polygon: Array<[number, number]>;
        pinCoord: [number, number];
        color?: string;
        strokeColor?: string;
        style?: MapPolygonStyle;
      }>;
    }
  >;
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[migrate-map-2026 アサート失敗] ${message}`);
  }
}

function normalizeParentAreaOrBuildingId(legacyId: string): string {
  const bldg = BUILDING_ID_MAP[legacyId];
  if (bldg) {
    return bldg.id;
  }
  const area = OUTDOOR_AREA_ID_MAP[legacyId];
  if (area) {
    return area.id;
  }
  throw new Error(`未定義の親建物/屋外エリアIDです: "${legacyId}"`);
}

export function migrateCampusMapFromLegacy(raw: LegacyMapRaw): CampusMapData {
  const buildings: MapBuilding[] = raw.buildings.map((b) => {
    const mapped = BUILDING_ID_MAP[b.id];
    assertCondition(mapped !== undefined, `未知の建物ID: "${b.id}"`);
    assertCondition(
      b.name === mapped.expectedName,
      `建物名不一致 (${b.id}): expected "${mapped.expectedName}", got "${b.name}"`,
    );
    return {
      id: mapped.id,
      name: b.name,
      category: b.category,
      floors: b.floors,
      hasIndoor: b.hasIndoor,
      color: b.color,
      strokeColor: b.strokeColor,
      polygon: b.polygon as readonly LatLngTuple[],
      ...(b.style ? { style: b.style } : {}),
    };
  });

  const outdoorAreas: MapOutdoorArea[] = raw.outdoorAreas.map((a) => {
    const mapped = OUTDOOR_AREA_ID_MAP[a.id];
    assertCondition(mapped !== undefined, `未知の屋外エリアID: "${a.id}"`);
    assertCondition(
      a.name === mapped.expectedName,
      `屋外エリア名不一致 (${a.id}): expected "${mapped.expectedName}", got "${a.name}"`,
    );
    return {
      id: mapped.id,
      name: a.name,
      type: a.type,
      category: a.category,
      color: a.color,
      strokeColor: a.strokeColor,
      polygon: a.polygon as readonly LatLngTuple[],
    };
  });

  const spots: MapSpot[] = raw.spots.map((s) => {
    const mapped = SPOT_ID_MAP[s.id];
    assertCondition(mapped !== undefined, `未知のスポットID: "${s.id}"`);
    assertCondition(
      s.name === mapped.expectedOldName,
      `スポット名不一致 (${s.id}): expected "${mapped.expectedOldName}", got "${s.name}"`,
    );
    return {
      id: mapped.id,
      name: mapped.normalizedName,
      category: s.category,
      floor: s.floor,
      buildingId: normalizeParentAreaOrBuildingId(s.buildingId),
      latlng: s.latlng,
      icon: s.icon,
      description: mapped.normalizedDescription,
    };
  });

  const accessRoutes: MapAccessRoute[] = raw.accessRoutes.map((r) => {
    const mapped = ACCESS_ROUTE_ID_MAP[r.id];
    assertCondition(mapped !== undefined, `未知のアクセス経路ID: "${r.id}"`);
    assertCondition(
      r.name === mapped.expectedName,
      `アクセス経路名不一致 (${r.id}): expected "${mapped.expectedName}", got "${r.name}"`,
    );
    return {
      id: mapped.id,
      name: r.name,
      subName: r.subName,
      color: r.color,
      strokeWidth: r.strokeWidth,
      smooth: r.smooth,
      timeMinutes: r.timeMinutes,
      distanceMeters: r.distanceMeters,
      elevationGainMeters: r.elevationGainMeters,
      startPoint: {
        name: r.startPoint.name,
        latlng: r.startPoint.latlng,
      },
      endPoint: {
        name: r.endPoint.name,
        latlng: r.endPoint.latlng,
      },
      polyline: r.polyline as readonly LatLngTuple[],
    };
  });

  const floorKeys: readonly FloorKey[] = ['1', '2', '3', '4', '5'];
  const indoorFloors = {} as Record<FloorKey, MapIndoorFloor>;
  const seenNormalizedRoomIds = new Set<string>();
  let totalInputRooms = 0;
  let totalOutputRooms = 0;

  for (const fk of floorKeys) {
    const srcFloor = raw.indoorFloors[fk];
    assertCondition(srcFloor !== undefined, `フロア "${fk}" が元データに存在しません`);

    totalInputRooms += srcFloor.rooms.length;

    const rooms: MapRoom[] = srcFloor.rooms.map((r) => {
      const mapped = ROOM_ID_MAP[r.id];
      assertCondition(mapped !== undefined, `未知の部屋ID (Floor ${fk}): "${r.id}" (${r.name})`);
      assertCondition(
        r.name === mapped.expectedName,
        `部屋名不一致 (${r.id}): expected "${mapped.expectedName}", got "${r.name}"`,
      );
      assertCondition(
        r.floor === mapped.expectedFloor && String(r.floor) === fk,
        `部屋階層不一致 (${r.id}): expected ${mapped.expectedFloor}, got ${r.floor}`,
      );
      assertCondition(
        !seenNormalizedRoomIds.has(mapped.id),
        `正規化後の部屋IDが重複しています: "${mapped.id}"`,
      );
      seenNormalizedRoomIds.add(mapped.id);

      return {
        id: mapped.id,
        name: r.name,
        category: r.category,
        floor: r.floor,
        buildingId: normalizeParentAreaOrBuildingId(r.buildingId),
        polygon: r.polygon as readonly LatLngTuple[],
        pinCoord: r.pinCoord,
        ...(r.color ? { color: r.color } : {}),
        ...(r.strokeColor ? { strokeColor: r.strokeColor } : {}),
        ...(r.style ? { style: r.style } : {}),
      };
    });

    totalOutputRooms += rooms.length;

    const corridors: MapCorridor[] = srcFloor.corridors.map((c) => ({
      id: c.id,
      name: c.name,
      ...(c.category ? { category: c.category } : {}),
      floor: c.floor,
      buildingId: normalizeParentAreaOrBuildingId(c.buildingId),
      polygon: c.polygon as readonly LatLngTuple[],
      ...(c.pinCoord ? { pinCoord: c.pinCoord } : {}),
      ...(c.isOverpass !== undefined ? { isOverpass: c.isOverpass } : {}),
      ...(c.buildingFrom ? { buildingFrom: normalizeParentAreaOrBuildingId(c.buildingFrom) } : {}),
      ...(c.buildingTo ? { buildingTo: normalizeParentAreaOrBuildingId(c.buildingTo) } : {}),
      ...(c.color ? { color: c.color } : {}),
      ...(c.strokeColor ? { strokeColor: c.strokeColor } : {}),
      ...(c.style ? { style: c.style } : {}),
    }));

    const stairs: MapStair[] = srcFloor.stairs.map((st) => ({
      id: st.id,
      name: st.name,
      floor: st.floor,
      buildingId: normalizeParentAreaOrBuildingId(st.buildingId),
      polygon: st.polygon as readonly LatLngTuple[],
      pinCoord: st.pinCoord,
      isAllFloors: st.isAllFloors,
      connectsFloors: st.connectsFloors,
      floors: st.floors,
    }));

    const toilets: MapToilet[] = srcFloor.toilets.map((t) => ({
      id: t.id,
      name: t.name,
      floor: t.floor,
      buildingId: normalizeParentAreaOrBuildingId(t.buildingId),
      gender: t.gender,
      polygon: t.polygon as readonly LatLngTuple[],
      pinCoord: t.pinCoord,
      ...(t.color ? { color: t.color } : {}),
      ...(t.strokeColor ? { strokeColor: t.strokeColor } : {}),
      ...(t.style ? { style: t.style } : {}),
    }));

    assertCondition(
      corridors.length === srcFloor.corridors.length,
      `Floor ${fk} corridors 件数不一致`,
    );
    assertCondition(stairs.length === srcFloor.stairs.length, `Floor ${fk} stairs 件数不一致`);
    assertCondition(toilets.length === srcFloor.toilets.length, `Floor ${fk} toilets 件数不一致`);

    indoorFloors[fk] = {
      rooms,
      corridors,
      stairs,
      toilets,
    };
  }

  // 全要素数の完全一致アサート（欠損ゼロ保証）
  assertCondition(buildings.length === 9 && buildings.length === raw.buildings.length, '建物数(9)不一致');
  assertCondition(
    outdoorAreas.length === 4 && outdoorAreas.length === raw.outdoorAreas.length,
    '屋外エリア数(4)不一致',
  );
  assertCondition(spots.length === 11 && spots.length === raw.spots.length, 'スポット数(11)不一致');
  assertCondition(
    accessRoutes.length === 4 && accessRoutes.length === raw.accessRoutes.length,
    'アクセス経路数(4)不一致',
  );
  assertCondition(
    totalOutputRooms === 51 &&
      totalInputRooms === 51 &&
      seenNormalizedRoomIds.size === Object.keys(ROOM_ID_MAP).length,
    `屋内部屋総数(51)不一致: in=${totalInputRooms}, out=${totalOutputRooms}`,
  );

  const normalized: CampusMapData = {
    $schema: 'nanryosai-campus-map-2027-v1',
    version: '1.0.0',
    metadata: {
      title: '南陵祭2027 キャンパスマップ',
      updatedAt: '2026-11-17T00:00:00.000Z',
      center: raw.metadata.center,
      defaultZoom: raw.metadata.defaultZoom,
      minZoom: raw.metadata.minZoom,
      maxZoom: raw.metadata.maxZoom,
      bounds: raw.metadata.bounds,
    },
    buildings,
    outdoorAreas,
    spots,
    accessRoutes,
    indoorFloors,
  };

  return CampusMapDataSchema.parse(normalized);
}

function main(): void {
  const args = process.argv.slice(2);
  const srcIdx = args.indexOf('--source');
  const sourcePath = srcIdx !== -1 && args[srcIdx + 1] ? path.resolve(args[srcIdx + 1]!) : DEFAULT_SOURCE_PATH;

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`元マップファイルが見つかりません: ${sourcePath}`);
  }

  const rawJson = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as LegacyMapRaw;
  const migrated = migrateCampusMapFromLegacy(rawJson);

  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(DEFAULT_OUTPUT_PATH, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');

  console.log(
    `[migrate:map] 正規化完了: 建物=${migrated.buildings.length}, 屋外エリア=${migrated.outdoorAreas.length}, スポット=${migrated.spots.length}, アクセス経路=${migrated.accessRoutes.length}, 屋内部屋=51 -> ${DEFAULT_OUTPUT_PATH}`,
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  main();
}
