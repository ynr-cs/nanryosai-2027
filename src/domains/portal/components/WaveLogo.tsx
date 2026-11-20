'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX_CHARS = ['南', '陵', '祭', "'"] as const;
const YEAR_CHARS = ['2', '7'] as const;
const STEP_MS = 42;
const DURATION_MS = (PREFIX_CHARS.length + YEAR_CHARS.length) * STEP_MS + 750;

let cachedLogoWidth = 0;
let cachedLogoSizeCss = '';

/**
 * フッター大型ロゴ（ウィンドウ横幅いっぱいへ自動フィット＋クリックで1文字ずつウェーブアニメーション）
 * - 計算済み `--logo-fit-size` を :root へキャッシュし、ルート遷移時のリフロー・カクつきを防止。
 */
export function WaveLogo() {
  const [waving, setWaving] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);

  const fitToWidth = useCallback((forceMeasure = false) => {
    const wrap = wrapRef.current;
    const button = buttonRef.current;
    const inner = innerRef.current;
    if (!wrap || !button || !inner) {
      return;
    }
    const wrapWidth = wrap.clientWidth;
    if (!forceMeasure && cachedLogoWidth === wrapWidth && cachedLogoSizeCss) {
      document.documentElement.style.setProperty('--logo-fit-size', cachedLogoSizeCss);
      return;
    }
    const innerWidth = inner.getBoundingClientRect().width;
    const currentFontSize = Number.parseFloat(window.getComputedStyle(button).fontSize);
    if (wrapWidth <= 0 || innerWidth <= 0 || !Number.isFinite(currentFontSize)) {
      return;
    }
    const targetSize = (currentFontSize * wrapWidth * 0.992) / innerWidth;
    const nextCss = `${targetSize.toFixed(2)}px`;
    cachedLogoWidth = wrapWidth;
    cachedLogoSizeCss = nextCss;
    document.documentElement.style.setProperty('--logo-fit-size', nextCss);
  }, []);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      fitToWidth(false);
    });
    const wrap = wrapRef.current;
    if (!wrap) {
      return () => {
        window.cancelAnimationFrame(rafId);
      };
    }
    const ro = new ResizeObserver(() => {
      fitToWidth(true);
    });
    ro.observe(wrap);

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) {
        fitToWidth(true);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [fitToWidth]);

  const triggerWave = () => {
    if (waving) {
      return;
    }
    setWaving(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setWaving(false);
    }, DURATION_MS);
  };

  return (
    <div ref={wrapRef} className="biglogo-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="biglogo"
        onClick={triggerWave}
        aria-label="南陵祭27 ロゴアニメーションを再生"
      >
        <span ref={innerRef} className="biglogo-inner">
          {PREFIX_CHARS.map((ch, idx) => (
            <span
              key={`p-${idx}`}
              className={waving ? 'char wave' : 'char'}
              style={waving ? { animationDelay: `${idx * STEP_MS}ms` } : undefined}
            >
              {ch}
            </span>
          ))}
          <span className="glow">
            {YEAR_CHARS.map((ch, idx) => (
              <span
                key={`y-${idx}`}
                className={waving ? 'char wave' : 'char'}
                style={
                  waving
                    ? { animationDelay: `${(PREFIX_CHARS.length + idx) * STEP_MS}ms` }
                    : undefined
                }
              >
                {ch}
              </span>
            ))}
          </span>
        </span>
      </button>
    </div>
  );
}
