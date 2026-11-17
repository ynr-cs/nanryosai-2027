/**
 * 南陵祭2027 共通ドメイン型定義（SSOT: D-002 / D-006 / D-007 / D-008 / D-009）
 * - 第1層（Webポータル）・第2層（MOP/POS）・Cloud Functions 2nd Gen・検証CLIのすべてがこの型を唯一の正とする。
 */

export type FloorNumber = 1 | 2 | 3 | 4 | 5;

export type LatLngTuple = readonly [number, number];

// ============================================================================
// 1. キャンパスマップ正規化データ型 (data/campus_map_data.json)
// ============================================================================

export interface MapPolygonStyle {
  readonly fillColor?: string;
  readonly strokeColor?: string;
  readonly fillOpacity?: number;
  readonly weight?: number;
}

export type BuildingCategory = 'main' | 'gym' | 'admin' | 'facility' | 'outdoor' | string;

export interface MapBuilding {
  readonly id: string;
  readonly name: string;
  readonly category: BuildingCategory;
  readonly floors: readonly FloorNumber[];
  readonly hasIndoor: boolean;
  readonly color: string;
  readonly strokeColor: string;
  readonly polygon: readonly LatLngTuple[];
  readonly style?: MapPolygonStyle;
}

export interface MapOutdoorArea {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: string;
  readonly color: string;
  readonly strokeColor: string;
  readonly polygon: readonly LatLngTuple[];
}

export type MapSpotCategory = 'stage' | 'shop' | 'exhibit' | 'facility';

export interface MapSpot {
  readonly id: string;
  readonly name: string;
  readonly category: MapSpotCategory;
  readonly floor: FloorNumber;
  readonly buildingId: string;
  readonly latlng: LatLngTuple;
  readonly icon: string;
  readonly description: string;
}

export interface MapRouteEndpoint {
  readonly name: string;
  readonly latlng: LatLngTuple;
}

export interface MapAccessRoute {
  readonly id: string;
  readonly name: string;
  readonly subName: string;
  readonly color: string;
  readonly strokeWidth: number;
  readonly smooth: boolean;
  readonly timeMinutes: number;
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly startPoint: MapRouteEndpoint;
  readonly endPoint: MapRouteEndpoint;
  readonly polyline: readonly LatLngTuple[];
}

export type MapRoomCategory = 'classroom' | 'special_room' | 'stage';

export interface MapRoom {
  readonly id: string;
  readonly name: string;
  readonly category: MapRoomCategory;
  readonly floor: FloorNumber;
  readonly buildingId: string;
  readonly polygon: readonly LatLngTuple[];
  readonly pinCoord: LatLngTuple;
  readonly color?: string;
  readonly strokeColor?: string;
  readonly style?: MapPolygonStyle;
}

export interface MapCorridor {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly floor: FloorNumber;
  readonly buildingId: string;
  readonly polygon: readonly LatLngTuple[];
  readonly pinCoord?: LatLngTuple;
  readonly isOverpass?: boolean;
  readonly buildingFrom?: string;
  readonly buildingTo?: string;
  readonly color?: string;
  readonly strokeColor?: string;
  readonly style?: MapPolygonStyle;
}

export interface MapStair {
  readonly id: string;
  readonly name: string;
  readonly floor: FloorNumber;
  readonly buildingId: string;
  readonly polygon: readonly LatLngTuple[];
  readonly pinCoord: LatLngTuple;
  readonly isAllFloors: boolean;
  readonly connectsFloors: readonly FloorNumber[];
  readonly floors: readonly FloorNumber[];
}

export type ToiletGender = 'male' | 'female' | 'multi';

export interface MapToilet {
  readonly id: string;
  readonly name: string;
  readonly floor: FloorNumber;
  readonly buildingId: string;
  readonly gender: ToiletGender;
  readonly polygon: readonly LatLngTuple[];
  readonly pinCoord: LatLngTuple;
  readonly color?: string;
  readonly strokeColor?: string;
  readonly style?: MapPolygonStyle;
}

export interface MapIndoorFloor {
  readonly rooms: readonly MapRoom[];
  readonly corridors: readonly MapCorridor[];
  readonly stairs: readonly MapStair[];
  readonly toilets: readonly MapToilet[];
}

export type FloorKey = '1' | '2' | '3' | '4' | '5';

export interface CampusMapMetadata {
  readonly title: string;
  readonly updatedAt: string;
  readonly center: LatLngTuple;
  readonly defaultZoom: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly bounds: readonly [LatLngTuple, LatLngTuple];
}

export interface CampusMapData {
  readonly $schema: 'nanryosai-campus-map-2027-v1';
  readonly version: string;
  readonly metadata: CampusMapMetadata;
  readonly buildings: readonly MapBuilding[];
  readonly outdoorAreas: readonly MapOutdoorArea[];
  readonly spots: readonly MapSpot[];
  readonly accessRoutes: readonly MapAccessRoute[];
  readonly indoorFloors: Readonly<Record<FloorKey, MapIndoorFloor>>;
}

// ============================================================================
// 2. 企画・模擬店・MOP店舗設定 型定義 (data/projects.json)
// ============================================================================

export type ProjectCategory = 'cooking' | 'shop' | 'exhibit' | 'stage';

export type VotingCategory = 'cooking' | 'shop' | 'exhibit' | 'stage' | 'none';

export interface MenuOptionChoice {
  readonly id: string;
  readonly label: string;
  readonly priceDeltaYen: number;
  readonly isAvailable?: boolean;
}

export interface MenuOptionGroup {
  readonly id: string;
  readonly label: string;
  readonly selectionType: 'single' | 'multiple';
  readonly required: boolean;
  readonly maxSelections?: number;
  readonly choices: readonly MenuOptionChoice[];
}

export interface MenuItemMaster {
  readonly id: string;
  readonly name: string;
  readonly priceYen?: number;
  readonly description?: string;
  readonly allergens?: readonly string[];
  /** true の場合 /images/items/{id}.webp を参照 */
  readonly hasImage?: boolean;
  readonly isRecommended?: boolean;
  readonly optionGroups?: readonly MenuOptionGroup[];
  /** stockControlMode === 'per_item' または 'both' 時の商品別初期残数 */
  readonly initialStockCount?: number;
}

/**
 * MOP導入店舗のワークフロー設定（D-007 / D-008）
 * - 調理KVS ON/OFF 切替、店舗合計・商品別・両方併用の残り残数管理を型レベルで表現（Discriminated Union）
 */
export type StoreStockPolicy =
  | {
      readonly stockControlMode: 'store_total';
      readonly initialTotalStock: number;
    }
  | {
      readonly stockControlMode: 'per_item';
    }
  | {
      readonly stockControlMode: 'both';
      readonly initialTotalStock: number;
    };

export type StoreMopConfig = StoreStockPolicy & {
  readonly storeId: string;
  readonly enabled: boolean;
  /** 'on': 調理KVSバンプ運用 / 'off': 調理非干渉・即時出し口待機モード */
  readonly kitchenMode: 'on' | 'off';
  /** 1注文あたり最大個数（デフォルト5個・店舗設定可: D-008） */
  readonly maxQuantityPerOrder: number;
  /** O(1)採番レンジ（MOP: 1000-9999 / 有人POS: 100-999: D-008） */
  readonly mopNumberRange: {
    readonly min: 1000;
    readonly max: 9999;
  };
  readonly posNumberRange: {
    readonly min: 100;
    readonly max: 999;
  };
};

export interface ProjectMaster {
  readonly id: string;
  readonly groupName: string;
  readonly name: string;
  readonly catchphrase: string;
  readonly description: string;
  readonly category: ProjectCategory;
  readonly votingCategory: VotingCategory;
  readonly placeLabel: string;
  /** 複数場所開催（例: 教室予選＋体育館決勝）の補足案内 */
  readonly subPlaceNote?: string;
  /** マップ上にピン表示しない企画（Webサイト・非公開展示枠等）の場合 true */
  readonly hiddenOnMap?: boolean;
  /** 美術部＋美術科など、同一教室を意図的に共同利用する場合のみ true */
  readonly allowSharedRoom?: boolean;
  readonly floor: FloorNumber | null;
  readonly roomId: string | null;
  /** 正規化済みInstagramハンドル（@なし・英数ピリオドアンダースコア1〜30文字） */
  readonly instagramHandle?: string;
  readonly tags: readonly string[];
  /** true の場合 /images/projects/{id}_thumb.webp と {id}_hero.webp が必須 */
  readonly hasCoverImage: boolean;
  /** ギャラリー枚数（0〜9）。n >= 1 の場合 /images/projects/{id}_{1..n}.webp が必須 */
  readonly galleryCount: number;
  /** アレルギー成分・提供上の全体注記 */
  readonly menuNote?: string;
  readonly menu: readonly MenuItemMaster[];
  /** MOP/有人POS対象店舗のみ定義 */
  readonly mopConfig?: StoreMopConfig;
}

// ============================================================================
// 3. ステージタイムテーブル 型定義 (data/stages.json)
// ============================================================================

export type StageVenueId = 'gym_stage' | 'admin_3f_av_room' | 'student_4f_music_room';

export type StageVenueLabel = '体育館' | '視聴覚室' | '音楽室';

/**
 * 公開区分（後夜祭 = 在校生限定バッジ表示用）
 */
export type StageSessionType = 'day1' | 'day2_public' | 'after_festival';

export interface StageSlotMaster {
  readonly id: string;
  readonly day: 1 | 2;
  readonly sessionType: StageSessionType;
  readonly venueId: StageVenueId;
  readonly venueLabel: StageVenueLabel;
  /** HH:MM (24時間表記) */
  readonly startTime: string;
  /** HH:MM (24時間表記) */
  readonly endTime: string;
  readonly groupName: string;
  readonly title: string;
  readonly description: string;
  /** 企画マスタに紐づく団体の場合のみ指定（有志団体等は省略可） */
  readonly linkedProjectId?: string;
  readonly tags: readonly string[];
}

// ============================================================================
// 4. 第1層 ライブ差分配信ドキュメント (Firestore: public/live_state — D-003 / D-009)
// ============================================================================

export type VenueCongestionLevel = 'low' | 'medium' | 'high' | 'restricted';

export interface LiveVenueStatus {
  readonly venueId: StageVenueId;
  readonly congestion: VenueCongestionLevel;
  readonly currentSlotId: string | null;
  readonly delayMinutes: number;
  readonly note?: string;
  readonly updatedAtIso: string;
}

export type MopPublicStoreStatus = 'preparing' | 'open' | 'paused' | 'sold_out' | 'closed';

export interface LiveMopStoreSummary {
  readonly storeId: string;
  readonly status: MopPublicStoreStatus;
  readonly remainingTotal?: number;
  readonly soldOutItemIds: readonly string[];
  readonly updatedAtIso: string;
}

export interface EmergencyBannerState {
  readonly active: boolean;
  readonly level: 'info' | 'warning' | 'critical';
  /** プレーンテキストのみ（React標準エスケープで描画・innerHTML厳禁） */
  readonly message: string;
}

export interface PublicLiveStateDoc {
  readonly schemaVersion: 1;
  readonly updatedAtIso: string;
  /** D-004: ポータル上のMOP導線を即時閉鎖できる全体キルスイッチ */
  readonly mopGlobalEnabled: boolean;
  readonly emergencyBanner: EmergencyBannerState | null;
  readonly venues: Readonly<Record<string, LiveVenueStatus>>;
  readonly mopStores: Readonly<Record<string, LiveMopStoreSummary>>;
}

// ============================================================================
// 5. 第2層 MOP / 有人POS 共通ドメイン型（Phase 3 共有用基盤: D-006 / D-008）
// ============================================================================

export type OrderChannel = 'mop' | 'pos';

export type StaffRoleClaim =
  | {
      readonly role: 'store_staff';
      readonly storeId: string;
      readonly epoch: number;
    }
  | {
      readonly role: 'venue_staff';
      readonly venueId: StageVenueId;
      readonly epoch: number;
    };

export interface OrderVerificationBadge {
  readonly emojis: readonly [string, string, string];
  readonly issuedAtMs: number;
}
