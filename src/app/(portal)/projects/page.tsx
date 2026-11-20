import type { Metadata } from 'next';
import { ProjectsCatalogClient } from '@/domains/portal/components/ProjectsCatalogClient';
import { allProjects } from '@/domains/portal/lib/portal-master';

export const metadata: Metadata = {
  title: '企画一覧',
};

export default function ProjectsPage() {
  return (
    <main className="portal-main">
      <section className="page-head">
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <h1 className="sec-title">企画一覧</h1>
          <span className="tag num">{allProjects.length} 件</span>
        </div>
        <p className="meta-text">
          模擬店・室内販売・展示・ステージ企画の一覧です。各企画カードからメニューや場所詳細を確認できます。
        </p>
      </section>

      <ProjectsCatalogClient projects={allProjects} />
    </main>
  );
}
