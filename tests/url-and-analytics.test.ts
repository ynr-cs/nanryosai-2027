import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildPageViewPayload, trackPageView } from '@/lib/analytics';
import { shouldConnectClientEmulator } from '@/lib/env';
import {
  buildInstagramProfileUrl,
  computeHashStrippedUrl,
  normalizeInstagramHandle,
  safeExternalUrl,
  stripLocationHashOnly,
} from '@/lib/url-safety';

describe('URLクエリ保護・ハッシュトークン消去 (stripLocationHashOnly)', () => {
  it('?src= や ?store= を1文字も変えずに #t=... トークンのみを消去し history.state を維持する', () => {
    const replaceState = vi.fn();
    const nextRouterState = { __NA: true, tree: ['order'] };

    const result = stripLocationHashOnly({
      location: {
        href: 'https://nanryosai-2027.web.app/order?store=301&src=qr_stand#t=hmac_secret_98765',
        pathname: '/order',
        search: '?store=301&src=qr_stand',
        hash: '#t=hmac_secret_98765',
      },
      history: {
        state: nextRouterState,
        replaceState,
      },
    });

    expect(result.didStrip).toBe(true);
    expect(result.cleanedPathAndSearch).toBe('/order?store=301&src=qr_stand');
    expect(result.strippedHash).toBe('#t=hmac_secret_98765');
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(
      nextRouterState,
      '',
      '/order?store=301&src=qr_stand',
    );
  });

  it('末尾に空の # のみがある場合も消去し ?src= を保護する', () => {
    const res = computeHashStrippedUrl('https://nanryosai-2027.web.app/?src=classroom#');
    expect(res.didStrip).toBe(true);
    expect(res.strippedHash).toBe('#');
    expect(res.cleanedPathAndSearch).toBe('/?src=classroom');
  });

  it('ハッシュが存在しない場合は replaceState を呼ばず無変更とする', () => {
    const replaceState = vi.fn();
    const res = stripLocationHashOnly({
      location: {
        href: 'https://nanryosai-2027.web.app/projects/sample_mop_castella?src=pamphlet',
        pathname: '/projects/sample_mop_castella',
        search: '?src=pamphlet',
        hash: '',
      },
      history: {
        state: null,
        replaceState,
      },
    });

    expect(res.didStrip).toBe(false);
    expect(res.strippedHash).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('SSR環境 (window === null) でも例外を投げず安全に終了する', () => {
    const res = stripLocationHashOnly(null);
    expect(res.didStrip).toBe(false);
    expect(res.strippedHash).toBeNull();
  });

  it('先頭二重スラッシュ (//order?...#t=...) でもプロトコル相対URL化を防ぎ単一 / へ正規化して SecurityError を防止する', () => {
    const replaceState = vi.fn();
    const res = stripLocationHashOnly({
      location: {
        href: 'https://nanryosai-2027.web.app//order?store=301&src=qr#t=tok123',
        pathname: '//order',
        search: '?store=301&src=qr',
        hash: '#t=tok123',
      },
      history: {
        state: { __NA: true },
        replaceState,
      },
    });
    expect(res.didStrip).toBe(true);
    expect(res.cleanedPathAndSearch).toBe('/order?store=301&src=qr');
    expect(res.strippedHash).toBe('#t=tok123');
    expect(replaceState).toHaveBeenCalledWith({ __NA: true }, '', '/order?store=301&src=qr');
  });

  it('特殊WebView等で replaceState が例外を投げた場合でも location.hash を空にしてトークン露出を防ぐ', () => {
    const loc = {
      href: 'https://nanryosai-2027.web.app/order?store=301#t=secret',
      pathname: '/order',
      search: '?store=301',
      hash: '#t=secret',
    };
    const res = stripLocationHashOnly({
      location: loc,
      history: {
        state: null,
        replaceState() {
          throw new Error('SecurityError');
        },
      },
    });
    expect(res.didStrip).toBe(true);
    expect(loc.hash).toBe('');
  });
});

describe('外部URL安全検証 (safeExternalUrl)', () => {
  it('正規の https:// URL のみ許可する', () => {
    expect(safeExternalUrl('https://www.instagram.com/ynr.1_3/')).toBe(
      'https://www.instagram.com/ynr.1_3/',
    );
  });

  it('javascript:, data:, vbscript:, http:, 相対パス, 認証情報付きURL, 制御文字をすべて遮断する', () => {
    expect(safeExternalUrl('javascript:alert(document.cookie)')).toBeNull();
    expect(safeExternalUrl('  JAVASCRIPT:alert(1)  ')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeExternalUrl('http://www.instagram.com/ynr.1_3/')).toBeNull();
    expect(safeExternalUrl('/projects/301')).toBeNull();
    expect(safeExternalUrl('https://trusted.example:pass@evil.example/')).toBeNull();
    expect(safeExternalUrl('https://example.com/\njavascript:1')).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});

describe('Instagramハンドル正規化 (normalizeInstagramHandle)', () => {
  it('純粋ハンドル・@重複・プロフィールURL・スキーム省略URLから正規ハンドルを抽出する', () => {
    expect(normalizeInstagramHandle('ynr.1_3')).toBe('ynr.1_3');
    expect(normalizeInstagramHandle('@lxaf2_')).toBe('lxaf2_');
    expect(normalizeInstagramHandle('@@haruma.s0329')).toBe('haruma.s0329');
    expect(normalizeInstagramHandle('https://www.instagram.com/chikara_0809/?igsh=abc')).toBe(
      'chikara_0809',
    );
    expect(normalizeInstagramHandle('https://m.instagram.com/ynr.1_3/')).toBe('ynr.1_3');
    expect(normalizeInstagramHandle('instagram.com/ynr.1_3')).toBe('ynr.1_3');
    expect(normalizeInstagramHandle('www.instagram.com/ynr.1_3/')).toBe('ynr.1_3');
    expect(buildInstagramProfileUrl('@ynr.1_3')).toBe('https://www.instagram.com/ynr.1_3/');
  });

  it('2026年実データにあった日本語自由文・ドメイン単体・予約パス・不正ドット配列を確実に弾く', () => {
    expect(normalizeInstagramHandle('笹森ってインスタで打ったら出てきます')).toBeNull();
    expect(normalizeInstagramHandle('なし')).toBeNull();
    expect(normalizeInstagramHandle('instagram.com')).toBeNull();
    expect(normalizeInstagramHandle('www.instagram.com')).toBeNull();
    expect(normalizeInstagramHandle('m.instagram.com')).toBeNull();
    expect(normalizeInstagramHandle('https://www.instagram.com/p/C9xyz/')).toBeNull();
    expect(normalizeInstagramHandle('https://www.instagram.com/reel/C9xyz/')).toBeNull();
    expect(normalizeInstagramHandle('https://evil.example.com/ynr.1_3')).toBeNull();
    expect(normalizeInstagramHandle('...')).toBeNull();
    expect(normalizeInstagramHandle('.leading_dot')).toBeNull();
    expect(normalizeInstagramHandle('trailing_dot.')).toBeNull();
    expect(normalizeInstagramHandle('double..dot')).toBeNull();
    expect(normalizeInstagramHandle('a'.repeat(31))).toBeNull();
  });
});

describe('GA4 ページビューペイロード & Emulator接続判定', () => {
  it('?src= パラメータを page_path / page_location / traffic_source_param に欠損なく格納し、誤混入した機密クエリ (?token= 等) は GA4 送信前に除去する', () => {
    const payload = buildPageViewPayload(
      '/projects/sample_mop_castella',
      'src=gate_poster&utm_medium=qr',
      'https://nanryosai-2027.web.app',
    );
    expect(payload).toEqual({
      page_path: '/projects/sample_mop_castella?src=gate_poster&utm_medium=qr',
      page_location:
        'https://nanryosai-2027.web.app/projects/sample_mop_castella?src=gate_poster&utm_medium=qr',
      traffic_source_param: 'gate_poster',
    });

    const leakedQueryPayload = buildPageViewPayload(
      '/venue',
      '?venue=gym_stage&token=accidental_secret_123&PASSWORD=bad&src=staff_sheet',
      'https://nanryosai-2027.web.app',
    );
    expect(leakedQueryPayload).toEqual({
      page_path: '/venue?venue=gym_stage&src=staff_sheet',
      page_location: 'https://nanryosai-2027.web.app/venue?venue=gym_stage&src=staff_sheet',
      traffic_source_param: 'staff_sheet',
    });
  });

  it('本番ビルド (production) や非localhostホストではクライアントEmulatorへ絶対に接続しない', () => {
    expect(shouldConnectClientEmulator('production', 'localhost')).toBe(false);
    expect(shouldConnectClientEmulator('development', 'nanryosai-2027.web.app')).toBe(false);
  });

  it('gtag.js 未ロード状態でも trackPageView が同期的に dataLayer キューと config を初期化して初回 page_view を欠損しない', () => {
    const fakeWin = {
      location: { origin: 'https://nanryosai-2027.web.app' },
    } as unknown as Window & typeof globalThis;
    vi.stubGlobal('window', fakeWin);
    try {
      trackPageView('/', 'src=pamphlet_qr');
      const entries = (fakeWin.dataLayer ?? []).map((item) =>
        Array.from(item as ArrayLike<unknown>),
      );
      expect(entries).toHaveLength(3);
      expect(entries[0]?.[0]).toBe('js');
      expect(entries[1]).toEqual(['config', 'G-VTX813ECF9', { send_page_view: false }]);
      expect(entries[2]).toEqual([
        'event',
        'page_view',
        {
          send_to: 'G-VTX813ECF9',
          page_path: '/?src=pamphlet_qr',
          page_location: 'https://nanryosai-2027.web.app/?src=pamphlet_qr',
          traffic_source_param: 'pamphlet_qr',
        },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Hosting セキュリティヘッダ (CSP 国土地理院タイル許可) & 会場管理ルート分離検証', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');

  it('firebase.json の CSP img-src に国土地理院タイル (https://cyberjapandata.gsi.go.jp) と GA4 が含まれ、localhost や unsafe-eval を含まない', () => {
    const firebaseConfig = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'firebase.json'), 'utf8'),
    ) as {
      hosting: {
        cleanUrls: boolean;
        trailingSlash: boolean;
        headers: Array<{ regex: string; headers: Array<{ key: string; value: string }> }>;
      };
    };

    expect(firebaseConfig.hosting.cleanUrls).toBe(true);
    expect(firebaseConfig.hosting.trailingSlash).toBe(false);

    const globalHeaderEntry = firebaseConfig.hosting.headers.find(
      (entry) => entry.regex === '^[/\\\\].*$',
    );
    expect(globalHeaderEntry).toBeDefined();

    const cspValue = globalHeaderEntry?.headers.find(
      (h) => h.key === 'Content-Security-Policy',
    )?.value;
    expect(cspValue).toBeDefined();

    const directives = new Map<string, string[]>();
    for (const rawPart of (cspValue ?? '').split(';')) {
      const tokens = rawPart.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        directives.set(tokens[0]!, tokens.slice(1));
      }
    }

    const imgSrc = directives.get('img-src') ?? [];
    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain('data:');
    expect(imgSrc).toContain('blob:');
    expect(imgSrc).toContain('https://cyberjapandata.gsi.go.jp');
    expect(imgSrc).toContain('https://www.google-analytics.com');
    expect(imgSrc).toContain('https://www.googletagmanager.com');

    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
    expect(cspValue).not.toContain('localhost');
    expect(cspValue).not.toContain('127.0.0.1');
    expect(cspValue).not.toContain('unsafe-eval');
  });

  it('会場管理画面が /venue ルートグループとして独立配置され、venue 全ファイルに旧 /mop/venue の残骸および MOP キルスイッチ参照を含まない', () => {
    const venueRouteDir = path.join(ROOT_DIR, 'src', 'app', '(venue)');
    const venueDomainDir = path.join(ROOT_DIR, 'src', 'domains', 'venue');
    const venuePagePath = path.join(venueRouteDir, 'venue', 'page.tsx');
    const legacyMopVenuePath = path.join(
      ROOT_DIR,
      'src',
      'app',
      '(mop)',
      'mop',
      'venue',
      'page.tsx',
    );

    expect(fs.existsSync(venuePagePath)).toBe(true);
    expect(fs.existsSync(legacyMopVenuePath)).toBe(false);

    const collectSourceFiles = (dir: string): string[] => {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectSourceFiles(full));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
      return files;
    };

    const allVenueFiles = [
      ...collectSourceFiles(venueRouteDir),
      ...collectSourceFiles(venueDomainDir),
    ];
    expect(allVenueFiles.length).toBeGreaterThanOrEqual(4);

    for (const filePath of allVenueFiles) {
      const src = fs.readFileSync(filePath, 'utf8');
      expect(src, `${filePath} に停止中文言が残存`).not.toContain('MOPキルスイッチ停止中');
      expect(src, `${filePath} に isMopBuildEnabled が混入`).not.toContain('isMopBuildEnabled');
      expect(src, `${filePath} に NEXT_PUBLIC_MOP_ENABLED が混入`).not.toContain(
        'NEXT_PUBLIC_MOP_ENABLED',
      );
    }
  });
});
