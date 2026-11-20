'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { PortalIcon, type PortalIconName } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalToast } from '@/domains/portal/components/PortalToastContext';
import { useFavorites } from '@/domains/portal/context/FavoritesProvider';
import type { ProjectCategory, ProjectMaster } from '@/types/domain';

type CatalogFilter = 'all' | 'cooking' | 'shop' | 'exhibit' | 'stage' | 'fav' | 'mop';

const CATEGORY_TABS: ReadonlyArray<{ readonly id: CatalogFilter; readonly label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'cooking', label: '調理' },
  { id: 'shop', label: '販売' },
  { id: 'exhibit', label: '展示' },
  { id: 'stage', label: 'ステージ' },
  { id: 'fav', label: 'お気に入り' },
  { id: 'mop', label: 'モバイルオーダー' },
];

function getFallbackIcon(category: ProjectCategory): PortalIconName {
  switch (category) {
    case 'cooking':
      return 'utensils';
    case 'shop':
      return 'bag';
    case 'stage':
      return 'mic';
    case 'exhibit':
      return 'sparkles';
  }
}

function ProjectsCatalogInner({ projects }: { readonly projects: readonly ProjectMaster[] }) {
  const searchParams = useSearchParams();
  const initialFilter: CatalogFilter =
    searchParams.get('fav') === '1'
      ? 'fav'
      : searchParams.get('mop') === '1'
        ? 'mop'
        : 'all';

  const [filter, setFilter] = useState<CatalogFilter>(initialFilter);
  const [query, setQuery] = useState<string>('');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = usePortalToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === 'fav' && !isFavorite(p.id)) {
        return false;
      }
      if (filter === 'mop' && !p.mopConfig?.enabled) {
        return false;
      }
      if (
        filter !== 'all' &&
        filter !== 'fav' &&
        filter !== 'mop' &&
        p.category !== filter
      ) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        p.name.toLowerCase().includes(q) ||
        p.groupName.toLowerCase().includes(q) ||
        p.catchphrase.toLowerCase().includes(q) ||
        p.placeLabel.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projects, filter, query, isFavorite]);

  return (
    <div className="stack-md">
      <div>
        <label htmlFor="project-search" className="meta-text" style={{ display: 'block', marginBottom: 6 }}>
          企画名・団体名・場所・キーワードで即時検索（外部通信ゼロ）
        </label>
        <input
          id="project-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例: カステラ / アイス / 1年 / 体育館..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--text)',
            font: 'inherit',
          }}
        />
      </div>

      <div className="filter-row" role="tablist" aria-label="企画フィルタ">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={filter === tab.id ? 'chip active' : 'chip'}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p className="meta-text">条件に一致する企画がありません。絞り込みを変更してお試しください。</p>
        </div>
      ) : (
        <div className="hl-list">
          {filtered.map((project) => {
            const fav = isFavorite(project.id);
            return (
              <div key={project.id} className="hl-card">
                <PortalLink href={`/projects/${project.id}`} className="hl-main-link">
                  {project.hasCoverImage ? (
                    <Image
                      src={`/images/projects/${project.id}_thumb.webp`}
                      alt=""
                      width={72}
                      height={72}
                      className="hl-thumb"
                    />
                  ) : (
                    <div className="hl-thumb-fallback" aria-hidden="true">
                      <PortalIcon name={getFallbackIcon(project.category)} size={28} />
                    </div>
                  )}
                  <div className="hl-body">
                    <div className="hl-group">{project.groupName}</div>
                    <h2 className="hl-name">{project.name}</h2>
                    <p className="hl-catch">{project.catchphrase}</p>
                    <div className="hl-meta">
                      <span className="hl-place">
                        <PortalIcon name="geo" size={13} />
                        {project.placeLabel}
                      </span>
                      {project.mopConfig?.enabled ? (
                        <span className="tag mop">モバイルオーダー</span>
                      ) : null}
                      {project.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </PortalLink>
                <button
                  type="button"
                  className={fav ? 'star-btn active' : 'star-btn'}
                  aria-label={`${project.name} をお気に入り${fav ? '解除' : '登録'}`}
                  aria-pressed={fav}
                  onClick={() => {
                    const added = toggleFavorite(project.id);
                    showToast(added ? 'お気に入りに追加しました' : 'お気に入りから外しました');
                  }}
                >
                  <PortalIcon name={fav ? 'star-fill' : 'star'} size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Static Export 環境で useSearchParams() がページ全体の CSR 退行を起こさないよう <Suspense> 分離
 */
export function ProjectsCatalogClient({ projects }: { readonly projects: readonly ProjectMaster[] }) {
  return (
    <Suspense fallback={<div className="card meta-text">企画一覧を読み込み中...</div>}>
      <ProjectsCatalogInner projects={projects} />
    </Suspense>
  );
}
