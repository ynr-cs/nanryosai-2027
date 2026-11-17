import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '..');

function createEslintInstance(): ESLint {
  return new ESLint({
    cwd: ROOT_DIR,
  });
}

describe('ESLint 二層物理分離 & XSS危険API遮断ルール (D-003 / D-004)', () => {
  it('第1層 (portal) から mop / firebase/auth / firebase/functions / 通常firebase/firestore を import すると確実にエラーになる', async () => {
    const eslint = createEslintInstance();

    const cases = [
      {
        label: '@/domains/mop への参照',
        code: `import { getMopFirebaseServices } from '@/domains/mop/lib/firebase-mop';\nexport const x = getMopFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/violation-mop.ts'),
      },
      {
        label: '相対パス ../mop への参照',
        code: `import { getMopFirebaseServices } from '../mop/lib/firebase-mop';\nexport const x = getMopFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/violation-rel-mop.ts'),
      },
      {
        label: 'firebase/auth の混入',
        code: `import { getAuth } from 'firebase/auth';\nexport const a = getAuth;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(portal)/violation-auth.ts'),
      },
      {
        label: 'firebase/functions の混入',
        code: `import { getFunctions } from 'firebase/functions';\nexport const f = getFunctions;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/violation-fn.ts'),
      },
      {
        label: '通常版 firebase/firestore の混入',
        code: `import { getFirestore } from 'firebase/firestore';\nexport const d = getFirestore;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/violation-fs.ts'),
      },
      {
        label: '共有層 src/lib 経由での firebase/auth 間接混入',
        code: `import { getAuth } from 'firebase/auth';\nexport const leaked = getAuth;\n`,
        filePath: path.join(ROOT_DIR, 'src/lib/violation-shared-auth.ts'),
      },
      {
        label: '共有層 src/components 経由での @/domains/mop 間接混入',
        code: `import { getMopFirebaseServices } from '@/domains/mop/lib/firebase-mop';\nexport const leaked = getMopFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/components/violation-shared-mop.tsx'),
      },
      {
        label: 'RootLayout (src/app/layout.tsx) 経由での @/domains/mop 混入',
        code: `import { getMopFirebaseServices } from '@/domains/mop/lib/firebase-mop';\nexport const leaked = getMopFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/violation-root-layout.tsx'),
      },
      {
        label: 'SSOT 型層 (src/types) へのランタイム Firebase SDK 混入',
        code: `import { doc } from 'firebase/firestore/lite';\nexport const leaked = doc;\n`,
        filePath: path.join(ROOT_DIR, 'src/types/violation-types-sdk.ts'),
      },
      {
        label: '第1層 (portal) から会場スタッフ管理層 (@/domains/venue) への参照による auth/functions 間接混入',
        code: `import { getVenueFirebaseServices } from '@/domains/venue/lib/firebase-venue';\nexport const v = getVenueFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/violation-venue.ts'),
      },
      {
        label: '共有層 (src/lib) から会場スタッフ管理層 (../domains/venue) への相対参照混入',
        code: `import { getVenueFirebaseServices } from '../domains/venue/lib/firebase-venue';\nexport const v = getVenueFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/lib/violation-shared-venue.ts'),
      },
      {
        label: 'RootLayout (src/app/layout.tsx) からルートグループ相対パス ./(mop)/... への参照バイパス',
        code: `import MopOrderPage from './(mop)/order/page';\nexport const x = MopOrderPage;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/layout.tsx'),
      },
      {
        label: 'RootLayout (src/app/layout.tsx) からルートグループ相対パス ./(venue)/... への参照バイパス',
        code: `import VenuePage from './(venue)/venue/page';\nexport const x = VenuePage;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/layout.tsx'),
      },
      {
        label: '第1層 (src/app/(portal)/page.tsx) から隣接ルートグループ ../(mop)/... への参照バイパス',
        code: `import MopOrderPage from '../(mop)/order/page';\nexport const x = MopOrderPage;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(portal)/page.tsx'),
      },
      {
        label: '第1層 (src/app/(portal)/page.tsx) から隣接ルートグループ ../(venue)/... への参照バイパス',
        code: `import VenuePage from '../(venue)/venue/page';\nexport const x = VenuePage;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(portal)/page.tsx'),
      },
      {
        label: '第1層深い階層 (src/domains/portal/components/sub) から ../../../mop/... への相対参照バイパス',
        code: `import { getMopFirebaseServices } from '../../../mop/lib/firebase-mop';\nexport const x = getMopFirebaseServices;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/components/sub/violation-deep-mop.ts'),
      },
      {
        label: 'SSOT 型層深い階層 (src/types/sub) から ../../app/(venue)/... への相対参照バイパス',
        code: `import VenuePage from '../../app/(venue)/venue/page';\nexport const x = VenuePage;\n`,
        filePath: path.join(ROOT_DIR, 'src/types/sub/violation-deep-app.ts'),
      },
    ];

    for (const c of cases) {
      const [result] = await eslint.lintText(c.code, { filePath: c.filePath });
      expect(result?.errorCount, `${c.label} が遮断されるべき`).toBeGreaterThan(0);
      expect(
        result?.messages.some((m) => m.ruleId === 'no-restricted-imports'),
        `${c.label} は no-restricted-imports で検知されるべき`,
      ).toBe(true);
    }
  });

  it('第1層 (portal) から軽量版 firebase/firestore/lite を使用するコードはエラー 0 件で通過する', async () => {
    const eslint = createEslintInstance();
    const validCode = `import { doc } from 'firebase/firestore/lite';\nexport const refFn = doc;\n`;
    const [result] = await eslint.lintText(validCode, {
      filePath: path.join(ROOT_DIR, 'src/domains/portal/valid-lite.ts'),
    });
    expect(result?.errorCount).toBe(0);
  });

  it('会場管理層 (/venue) は firebase/auth・functions・firestore/lite を利用できる一方、mop 層および isMopBuildEnabled への依存を確実に遮断する', async () => {
    const eslint = createEslintInstance();

    const [validVenue] = await eslint.lintText(
      `import { getAuth } from 'firebase/auth';\nimport { getFunctions } from 'firebase/functions';\nimport { doc } from 'firebase/firestore/lite';\nimport { isLiveStateAutoEnabled } from '@/lib/env';\nexport const ok = [getAuth, getFunctions, doc, isLiveStateAutoEnabled];\n`,
      { filePath: path.join(ROOT_DIR, 'src/domains/venue/valid-venue.ts') },
    );
    expect(validVenue?.errorCount).toBe(0);

    const venueViolations = [
      {
        label: 'venue から @/domains/mop への依存',
        code: `import { MopShellCard } from '@/domains/mop/components/MopShellCard';\nexport const bad = MopShellCard;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(venue)/venue/bad-mop.tsx'),
      },
      {
        label: 'venue から MOP キルスイッチ (isMopBuildEnabled) への依存 (@/lib/env)',
        code: `import { isMopBuildEnabled } from '@/lib/env';\nexport const bad = isMopBuildEnabled;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/venue/components/bad-killswitch.tsx'),
      },
      {
        label: 'venue から MOP キルスイッチ (isMopBuildEnabled) への相対パス依存',
        code: `import { isMopBuildEnabled } from '../../lib/env';\nexport const bad = isMopBuildEnabled;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/venue/bad-rel-killswitch.ts'),
      },
      {
        label: 'venue での重量級 通常版 firebase/firestore の混入',
        code: `import { getFirestore } from 'firebase/firestore';\nexport const bad = getFirestore;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/venue/lib/bad-full-fs.ts'),
      },
      {
        label: 'mop から venue への不要な逆依存',
        code: `import { VenueShellCard } from '@/domains/venue/components/VenueShellCard';\nexport const bad = VenueShellCard;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/mop/bad-venue-dep.tsx'),
      },
      {
        label: 'venue ルートグループから隣接 ../../(mop)/... への相対参照バイパス',
        code: `import MopOrderPage from '../../(mop)/order/page';\nexport const bad = MopOrderPage;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(venue)/venue/page.tsx'),
      },
      {
        label: 'mop ルートグループから隣接 ../../(venue)/... への相対参照バイパス',
        code: `import VenuePage from '../../(venue)/venue/page';\nexport const bad = VenuePage;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(mop)/order/page.tsx'),
      },
    ];

    for (const v of venueViolations) {
      const [res] = await eslint.lintText(v.code, { filePath: v.filePath });
      expect(res?.errorCount, `${v.label} が遮断されるべき`).toBeGreaterThan(0);
      expect(
        res?.messages.some((m) => m.ruleId === 'no-restricted-imports'),
        `${v.label} は no-restricted-imports で検知されるべき`,
      ).toBe(true);
    }

    // publicEnv.NEXT_PUBLIC_MOP_ENABLED / process.env.NEXT_PUBLIC_MOP_ENABLED / 分割代入によるキルスイッチ参照バイパスも遮断
    const killSwitchPropertyBypasses = [
      {
        label: 'publicEnv.NEXT_PUBLIC_MOP_ENABLED プロパティ参照バイパス',
        code: `import { publicEnv } from '@/lib/env';\nexport const bad = publicEnv.NEXT_PUBLIC_MOP_ENABLED;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/venue/lib/bad-public-env.ts'),
      },
      {
        label: 'process.env.NEXT_PUBLIC_MOP_ENABLED 直接参照バイパス',
        code: `export const bad = process.env.NEXT_PUBLIC_MOP_ENABLED;\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/venue/components/bad-proc-env.tsx'),
      },
      {
        label: 'publicEnv からの NEXT_PUBLIC_MOP_ENABLED 分割代入バイパス',
        code: `import { publicEnv } from '@/lib/env';\nconst { NEXT_PUBLIC_MOP_ENABLED } = publicEnv;\nexport const bad = NEXT_PUBLIC_MOP_ENABLED;\n`,
        filePath: path.join(ROOT_DIR, 'src/app/(venue)/venue/bad-destructure.ts'),
      },
    ];

    for (const kp of killSwitchPropertyBypasses) {
      const [res] = await eslint.lintText(kp.code, { filePath: kp.filePath });
      expect(res?.errorCount, `${kp.label} が遮断されるべき`).toBeGreaterThan(0);
      expect(
        res?.messages.some((m) => m.ruleId === 'no-restricted-properties'),
        `${kp.label} は no-restricted-properties で検知されるべき`,
      ).toBe(true);
    }

    // 動的 import() による境界迂回も全レイヤーで遮断されることを確認
    const dynamicImportViolations = [
      {
        label: 'portal での firebase/auth 動的 import()',
        code: `export const load = () => import('firebase/auth');\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/bad-dyn-auth.ts'),
      },
      {
        label: 'portal での @/domains/venue 動的 import()',
        code: `export const load = () => import('@/domains/venue/lib/firebase-venue');\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/portal/bad-dyn-venue.ts'),
      },
      {
        label: 'venue での @/domains/mop 動的 import()',
        code: `export const load = () => import('@/domains/mop/lib/firebase-mop');\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/venue/bad-dyn-mop.ts'),
      },
      {
        label: 'mop での @/domains/venue 動的 import()',
        code: `export const load = () => import('@/domains/venue/lib/firebase-venue');\n`,
        filePath: path.join(ROOT_DIR, 'src/domains/mop/bad-dyn-venue.ts'),
      },
      {
        label: 'functions での googleapis 動的 import()',
        code: `export const load = () => import('googleapis');\n`,
        filePath: path.join(ROOT_DIR, 'functions/src/bad-dyn-googleapis.ts'),
      },
    ];

    for (const d of dynamicImportViolations) {
      const [res] = await eslint.lintText(d.code, { filePath: d.filePath });
      expect(res?.errorCount, `${d.label} が遮断されるべき`).toBeGreaterThan(0);
      expect(
        res?.messages.some((m) => m.ruleId === 'no-restricted-syntax'),
        `${d.label} は no-restricted-syntax で検知されるべき`,
      ).toBe(true);
    }

    // 全レイヤー（venue / mop / types / functions 含む）で XSS 危険 API 禁止ルールが上書きされず維持されていることを確認
    for (const targetRelPath of [
      'src/domains/venue/components/bad-xss-venue.tsx',
      'src/domains/mop/components/bad-xss-mop.tsx',
      'src/types/bad-xss-types.ts',
      'functions/src/bad-xss-fn.ts',
    ]) {
      const [xssRes] = await eslint.lintText(
        `export function mutate(el: { innerHTML: string }, raw: string): void {\n  el.innerHTML = raw;\n}\n`,
        { filePath: path.join(ROOT_DIR, targetRelPath) },
      );
      expect(xssRes?.errorCount, `${targetRelPath} で innerHTML 代入が遮断されるべき`).toBeGreaterThan(
        0,
      );
    }
  });

  it('dangerouslySetInnerHTML および innerHTML 代入、Functions での googleapis 読込を遮断する', async () => {
    const eslint = createEslintInstance();

    const [xssJsx] = await eslint.lintText(
      `export function BadBanner({ raw }: { raw: string }) {\n  return <div dangerouslySetInnerHTML={{ __html: raw }} />;\n}\n`,
      { filePath: path.join(ROOT_DIR, 'src/domains/portal/bad-xss.tsx') },
    );
    expect(xssJsx?.errorCount).toBeGreaterThan(0);

    const [xssDom] = await eslint.lintText(
      `export function mutate(el: HTMLElement, s: string): void {\n  el.innerHTML = s;\n}\n`,
      { filePath: path.join(ROOT_DIR, 'src/lib/bad-dom.ts') },
    );
    expect(xssDom?.errorCount).toBeGreaterThan(0);

    const [heavyGoogleapis] = await eslint.lintText(
      `import { google } from 'googleapis';\nexport const g = google;\n`,
      { filePath: path.join(ROOT_DIR, 'functions/src/bad-googleapis.ts') },
    );
    expect(heavyGoogleapis?.errorCount).toBeGreaterThan(0);
  });
});
