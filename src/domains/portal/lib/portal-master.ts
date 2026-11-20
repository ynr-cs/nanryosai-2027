import projectsRaw from '../../../../data/projects.json';
import stagesRaw from '../../../../data/stages.json';
import type { ProjectMaster, StageSlotMaster } from '@/types/domain';

/**
 * 第1層（Webポータル）非マップ画面向け 静的マスターデータローダー（ビルド時同梱・初期描画 0ms 保証）
 * - campus_map_data.json（5,088行）をここへ一切 import しないことで、トップや企画一覧チャンクへの座標JSON混入を防止する。
 */

export const allProjects = projectsRaw as unknown as readonly ProjectMaster[];
export const allStageSlots = stagesRaw as unknown as readonly StageSlotMaster[];

export function findProjectById(id: string): ProjectMaster | undefined {
  return allProjects.find((p) => p.id === id);
}

export function getStageSlotsForProject(projectId: string): readonly StageSlotMaster[] {
  return allStageSlots.filter((s) => s.linkedProjectId === projectId);
}
