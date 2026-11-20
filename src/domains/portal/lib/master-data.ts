/**
 * 第1層（Webポータル）静的マスターデータローダー（互換再エクスポート）
 * - 非マップ画面からは `@/domains/portal/lib/portal-master` を直接参照し、`campus_map_data.json` の混入を防止する。
 */
export {
  allProjects,
  allStageSlots,
  findProjectById,
  getStageSlotsForProject,
} from './portal-master';
export { campusMapData, getTotalIndoorRoomCount } from './map-master';
