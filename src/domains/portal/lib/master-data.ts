import campusMapRaw from '../../../../data/campus_map_data.json';
import projectsRaw from '../../../../data/projects.json';
import stagesRaw from '../../../../data/stages.json';
import type { CampusMapData, ProjectMaster, StageSlotMaster } from '@/types/domain';

/**
 * 第1層（Webポータル）静的マスターデータローダー（ビルド時同梱・初期描画 0ms 保証）
 * - data/*.json は npm run validate:data で Zod 検証済みの SSOT マスタを参照する。
 */

export const campusMapData = campusMapRaw as unknown as CampusMapData;
export const allProjects = projectsRaw as unknown as readonly ProjectMaster[];
export const allStageSlots = stagesRaw as unknown as readonly StageSlotMaster[];

export function findProjectById(id: string): ProjectMaster | undefined {
  return allProjects.find((p) => p.id === id);
}

export function getStageSlotsForProject(projectId: string): readonly StageSlotMaster[] {
  return allStageSlots.filter((s) => s.linkedProjectId === projectId);
}

export function getTotalIndoorRoomCount(): number {
  return (
    campusMapData.indoorFloors['1'].rooms.length +
    campusMapData.indoorFloors['2'].rooms.length +
    campusMapData.indoorFloors['3'].rooms.length +
    campusMapData.indoorFloors['4'].rooms.length +
    campusMapData.indoorFloors['5'].rooms.length
  );
}
