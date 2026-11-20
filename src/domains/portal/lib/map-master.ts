import campusMapRaw from '../../../../data/campus_map_data.json';
import type { CampusMapData } from '@/types/domain';

/**
 * 第1層（Webポータル）マップ専用 静的マスターデータローダー（/map およびビルド時集計用）
 */

export const campusMapData = campusMapRaw as unknown as CampusMapData;

export function getTotalIndoorRoomCount(): number {
  return (
    campusMapData.indoorFloors['1'].rooms.length +
    campusMapData.indoorFloors['2'].rooms.length +
    campusMapData.indoorFloors['3'].rooms.length +
    campusMapData.indoorFloors['4'].rooms.length +
    campusMapData.indoorFloors['5'].rooms.length
  );
}
