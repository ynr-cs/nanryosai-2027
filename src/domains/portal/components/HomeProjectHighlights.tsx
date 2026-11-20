'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PortalIcon, type PortalIconName } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalToast } from '@/domains/portal/components/PortalToastContext';
import { useFavorites } from '@/domains/portal/context/FavoritesProvider';
import type { ProjectCategory, ProjectMaster } from '@/types/domain';

const MAX_HIGHLIGHT_ITEMS = 6;
const AUTO_ADVANCE_MS = 3500;

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

function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * トップページ「企画・展示 ハイライト」ランダム抜粋＆自動スナップカルーセル
 * - 本番20団体以上の全件表示を廃し、表示ごとに完全ランダムで最大6件を抜粋表示。
 * - 3.5秒間隔で自動スナップ移動し、ユーザー操作（タッチ／ホバー／フォーカス）中は自動停止する。
 * - 絞り込みや全団体閲覧は「すべて見る（/projects）」へ誘導する。
 */
export function HomeProjectHighlights({
  projects,
}: {
  readonly projects: readonly ProjectMaster[];
}) {
  const highlightPool = useMemo(
    () => projects.filter((p) => p.category !== 'stage'),
    [projects],
  );
  const [visibleProjects, setVisibleProjects] = useState<readonly ProjectMaster[]>(() =>
    highlightPool.slice(0, MAX_HIGHLIGHT_ITEMS),
  );
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = usePortalToast();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeIndexRef = useRef<number>(0);
  const pendingTargetRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const scrollDebounceRef = useRef<number | null>(null);
  const isInteractingRef = useRef<boolean>(false);
  const touchCooldownRef = useRef<number | null>(null);

  useEffect(() => {
    setVisibleProjects(shuffleArray(highlightPool).slice(0, MAX_HIGHLIGHT_ITEMS));
    setActiveIndex(0);
    activeIndexRef.current = 0;
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [highlightPool]);

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
      const dist = Math.abs(slides[i]!.offsetLeft - scrollLeft);
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
      pendingTargetRef.current = clamped;
      activeIndexRef.current = clamped;
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

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const handleSettle = () => {
      const settled = findNearestIndex();
      pendingTargetRef.current = null;
      activeIndexRef.current = settled;
      setActiveIndex(settled);
    };

    const handleScroll = () => {
      if (pendingTargetRef.current === null && rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          const nearest = findNearestIndex();
          activeIndexRef.current = nearest;
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
  }, [findNearestIndex]);

  useEffect(() => {
    if (slideCount <= 1) {
      return;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (isInteractingRef.current || document.visibilityState !== 'visible') {
        return;
      }
      scrollToSlide(activeIndexRef.current + 1);
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(intervalId);
      if (touchCooldownRef.current !== null) {
        window.clearTimeout(touchCooldownRef.current);
      }
    };
  }, [scrollToSlide, slideCount]);

  return (
    <section
      aria-labelledby="h-hl"
      aria-roledescription="carousel"
      className="hl-carousel-section"
      onMouseEnter={() => {
        isInteractingRef.current = true;
      }}
      onMouseLeave={() => {
        isInteractingRef.current = false;
      }}
      onTouchStart={() => {
        isInteractingRef.current = true;
        if (touchCooldownRef.current !== null) {
          window.clearTimeout(touchCooldownRef.current);
        }
      }}
      onTouchEnd={() => {
        if (touchCooldownRef.current !== null) {
          window.clearTimeout(touchCooldownRef.current);
        }
        touchCooldownRef.current = window.setTimeout(() => {
          isInteractingRef.current = false;
        }, 4000);
      }}
      onFocusCapture={() => {
        isInteractingRef.current = true;
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          isInteractingRef.current = false;
        }
      }}
    >
      <div className="sec-head">
        <h2 className="sec-title" id="h-hl">
          企画・展示 ハイライト
        </h2>
        <PortalLink href="/projects" className="sec-link">
          すべて見る <PortalIcon name="arrow-right" size={15} />
        </PortalLink>
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
    </section>
  );
}
