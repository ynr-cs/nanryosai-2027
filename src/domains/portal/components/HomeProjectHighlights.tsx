'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PortalIcon, type PortalIconName } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalToast } from '@/domains/portal/components/PortalToastContext';
import { useFavorites } from '@/domains/portal/context/FavoritesProvider';
import type { ProjectCategory, ProjectMaster } from '@/types/domain';

type FilterCat = 'all' | 'cooking' | 'shop' | 'exhibit';

const MAX_HIGHLIGHT_ITEMS = 6;

const FILTER_TABS: ReadonlyArray<{ readonly id: FilterCat; readonly label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'cooking', label: '調理' },
  { id: 'shop', label: '販売' },
  { id: 'exhibit', label: '展示' },
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

/**
 * トップページ「企画・展示 ハイライト」横スクロール・スナップカルーセル（一部抜粋表示）
 * - 本番では20団体以上となるため全件表示せず最大6件を抜粋し、右端に次カードが覗くPeekレイアウトで一覧(/projects)へ誘導する。
 */
export function HomeProjectHighlights({
  projects,
}: {
  readonly projects: readonly ProjectMaster[];
}) {
  const [cat, setCat] = useState<FilterCat>('all');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = usePortalToast();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const pendingTargetRef = useRef<number | null>(null);
  const settledIndexRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const scrollDebounceRef = useRef<number | null>(null);
  const userInteractedRef = useRef<boolean>(false);

  const visibleProjects = useMemo(() => {
    const highlightPool = projects.filter((p) => p.category !== 'stage');
    const byCategory =
      cat === 'all' ? highlightPool : highlightPool.filter((p) => p.category === cat);
    return byCategory.slice(0, MAX_HIGHLIGHT_ITEMS);
  }, [projects, cat]);

  const slideCount = visibleProjects.length;

  const findNearestIndex = useCallback((): number => {
    const track = trackRef.current;
    if (!track) {
      return 0;
    }
    const slides = Array.from(track.children) as HTMLElement[];
    if (slides.length === 0) {
      return 0;
    }
    const scrollLeft = track.scrollLeft;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slides.length; i += 1) {
      const slide = slides[i]!;
      const dist = Math.abs(slide.offsetLeft - scrollLeft);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, []);

  const scrollToSlide = useCallback(
    (targetIdx: number) => {
      const track = trackRef.current;
      if (!track || slideCount === 0) {
        return;
      }
      const clamped = ((targetIdx % slideCount) + slideCount) % slideCount;
      const slide = track.children[clamped] as HTMLElement | undefined;
      if (!slide) {
        return;
      }
      userInteractedRef.current = true;
      pendingTargetRef.current = clamped;
      setActiveIndex(clamped);

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.scrollTo({
        left: slide.offsetLeft,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    },
    [slideCount],
  );

  const handleCategoryChange = (nextCat: FilterCat) => {
    setCat(nextCat);
    setActiveIndex(0);
    setStatusMessage('');
    settledIndexRef.current = 0;
    pendingTargetRef.current = null;
    userInteractedRef.current = false;
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const handleSettle = () => {
      const settled = findNearestIndex();
      pendingTargetRef.current = null;
      setActiveIndex(settled);
      if (userInteractedRef.current && settled !== settledIndexRef.current && slideCount > 0) {
        settledIndexRef.current = settled;
        const proj = visibleProjects[settled];
        setStatusMessage(
          proj
            ? `${settled + 1} / ${slideCount} 件目: ${proj.name}`
            : `${settled + 1} / ${slideCount} 件目`,
        );
      }
    };

    const handleScroll = () => {
      userInteractedRef.current = true;
      if (pendingTargetRef.current === null && rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          const nearest = findNearestIndex();
          setActiveIndex((prev) => (prev === nearest ? prev : nearest));
        });
      }
      if (!('onscrollend' in track)) {
        if (scrollDebounceRef.current !== null) {
          window.clearTimeout(scrollDebounceRef.current);
        }
        scrollDebounceRef.current = window.setTimeout(handleSettle, 140);
      }
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    if ('onscrollend' in track) {
      track.addEventListener('scrollend', handleSettle, { passive: true });
    }

    return () => {
      track.removeEventListener('scroll', handleScroll);
      if ('onscrollend' in track) {
        track.removeEventListener('scrollend', handleSettle);
      }
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      if (scrollDebounceRef.current !== null) {
        window.clearTimeout(scrollDebounceRef.current);
      }
    };
  }, [findNearestIndex, slideCount, visibleProjects]);

  const handleStep = (delta: -1 | 1) => {
    const base = pendingTargetRef.current ?? activeIndex;
    scrollToSlide(base + delta);
  };

  return (
    <section
      aria-labelledby="h-hl"
      aria-roledescription="carousel"
      className="hl-carousel-section"
    >
      <div className="sec-head">
        <h2 className="sec-title" id="h-hl">
          企画・展示 ハイライト
        </h2>
        <PortalLink href="/projects" className="sec-link">
          すべて見る <PortalIcon name="arrow-right" size={15} />
        </PortalLink>
      </div>

      <div className="hl-toolbar">
        <div className="filter-row" role="tablist" aria-label="企画ジャンル絞り込み">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={cat === tab.id}
              className={cat === tab.id ? 'chip active' : 'chip'}
              onClick={() => handleCategoryChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {slideCount > 1 ? (
          <div className="hl-nav-btns">
            <button
              type="button"
              className="hl-arrow-btn"
              aria-label="前の企画へ"
              onClick={() => handleStep(-1)}
            >
              <PortalIcon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              className="hl-arrow-btn"
              aria-label="次の企画へ"
              onClick={() => handleStep(1)}
            >
              <PortalIcon name="chevron-right" size={16} />
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={trackRef}
        className="hl-carousel-track"
        tabIndex={0}
        role="group"
        aria-label="ピックアップ企画スライド"
      >
        {visibleProjects.map((project, idx) => {
          const fav = isFavorite(project.id);
          return (
            <div
              key={project.id}
              className="hl-card hl-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} / ${slideCount} 件目: ${project.name}`}
            >
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
                  <h3 className="hl-name">{project.name}</h3>
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

      {slideCount > 1 ? (
        <nav className="hl-dots" aria-label="表示する企画を選択">
          {visibleProjects.map((project, idx) => (
            <button
              key={project.id}
              type="button"
              className="hl-dot-btn"
              aria-current={activeIndex === idx ? 'true' : undefined}
              aria-label={`${idx + 1}件目: ${project.name}`}
              onClick={() => scrollToSlide(idx)}
            />
          ))}
        </nav>
      ) : null}

      <p className="visually-hidden" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </section>
  );
}
