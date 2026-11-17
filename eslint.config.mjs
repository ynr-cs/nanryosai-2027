import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * 全レイヤー共通の XSS 危険シンク禁止セレクタ（2026年緊急アラート Stored XSS 教訓）
 * - ESLint Flat Config では後続ブロックで `no-restricted-syntax` を再定義すると先行配列が置換されるため、
 *   動的 `import()` 遮断ルールを追加する各レイヤーでも必ずこの配列をスプレッド継承する。
 */
const BASE_XSS_RESTRICTED_SYNTAX = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      'XSS防止（2026年緊急アラートStored XSS教訓）のため dangerouslySetInnerHTML の使用は禁止されています。',
  },
  {
    selector: "MemberExpression[property.name='innerHTML']",
    message: 'XSS防止のため innerHTML へのアクセス・代入は禁止されています。textContent 等を使用してください。',
  },
  {
    selector: "MemberExpression[property.name='outerHTML']",
    message: 'XSS防止のため outerHTML へのアクセス・代入は禁止されています。',
  },
];

/**
 * 南陵祭2027 ESLint Flat Config（D-003 / D-004 二層物理分離・会場管理キルスイッチ非連動・XSS危険シンク禁止）
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'functions/lib/**',
      'functions/node_modules/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      'react/no-danger': 'error',
      'react/no-danger-with-children': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': ['error', ...BASE_XSS_RESTRICTED_SYNTAX],
    },
  },
  {
    // 【最重要】第1層（Webポータル）および第1層から参照される共有モジュール群から、
    // 第2層（MOP/POS）・会場管理層（/venue）・重量級 Firebase SDK への静的/動的混入を完全遮断（D-003 / D-004 / D-005）
    files: [
      'src/domains/portal/**/*.{ts,tsx}',
      'src/app/(portal)/**/*.{ts,tsx}',
      'src/app/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/auth',
              message:
                '【境界違反 D-003/D-005】第1層(portal)および共有層から firebase/auth を import することは禁止されています（来場者ログインレス＆バンドル肥大化防止）。',
            },
            {
              name: 'firebase/functions',
              message:
                '【境界違反 D-003/D-004】第1層(portal)および共有層から firebase/functions を import することは禁止されています。',
            },
            {
              name: 'firebase/firestore',
              message:
                '【境界違反 D-003】第1層(portal)および共有層では通常版 firebase/firestore ではなく軽量な firebase/firestore/lite（@/lib/firebase-lite）を使用してください。',
            },
          ],
          patterns: [
            {
              regex: '(^|/)(\\(mop\\)|mop)(/|$)',
              message:
                '【二層分離違反 D-004】第1層(portal)および共有層から第2層(mop)のコードを import することは固く禁じられています。',
            },
            {
              regex: '(^|/)(\\(venue\\)|venue)(/|$)',
              message:
                '【バンドル分離違反 D-003/D-005】来場者向け第1層(portal)および共有層から会場スタッフ管理層(venue)を import することは禁止されています（firebase/auth・firebase/functions のポータル混入防止）。',
            },
            {
              regex: '^firebase/(auth|functions)(/|$)',
              message:
                '【境界違反 D-003/D-004】第1層(portal)および共有層から firebase/auth または firebase/functions サブパスを import することは禁止されています。',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...BASE_XSS_RESTRICTED_SYNTAX,
        {
          selector:
            'ImportExpression[source.value=/(^firebase\\/(auth|functions)(\\/|$)|^firebase\\/firestore$|(^|\\/)(\\(mop\\)|mop|\\(venue\\)|venue)(\\/|$))/]',
          message:
            '【動的import境界違反 D-003/D-004】第1層(portal)および共有層から firebase/auth・firebase/functions・通常版firebase/firestore・mop・venue を動的 import() することは禁止されています。',
        },
      ],
    },
  },
  {
    // 会場スタッフ管理層 (/venue: D-004 / D-009.1 / ROADMAP 2-3):
    // MOPキルスイッチ停止時（NEXT_PUBLIC_MOP_ENABLED=false）も単独稼働させるため、
    // 第2層(mop)および MOP キルスイッチ（isMopBuildEnabled / NEXT_PUBLIC_MOP_ENABLED）への依存を完全遮断する。
    files: ['src/domains/venue/**/*.{ts,tsx}', 'src/app/(venue)/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/env',
              importNames: ['isMopBuildEnabled'],
              message:
                '【キルスイッチ分離違反 D-004/D-009】会場管理画面(/venue)はMOPキルスイッチ(isMopBuildEnabled)に連動させてはなりません。',
            },
            {
              name: 'firebase/firestore',
              message:
                '【バンドル軽量化 D-003】会場管理層(/venue)では通常版 firebase/firestore ではなく軽量な firebase/firestore/lite を使用してください。',
            },
          ],
          patterns: [
            {
              regex: '(^|/)(\\(mop\\)|mop)(/|$)',
              message:
                '【キルスイッチ・二層分離違反 D-004/D-009】会場管理層(/venue)から第2層(mop)のコードを import することは禁止されています。',
            },
            {
              regex: '(^|/)lib/env$',
              importNames: ['isMopBuildEnabled'],
              message:
                '【キルスイッチ分離違反 D-004/D-009】会場管理画面(/venue)はMOPキルスイッチ(isMopBuildEnabled)に連動させてはなりません。',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          property: 'NEXT_PUBLIC_MOP_ENABLED',
          message:
            '【キルスイッチ分離違反 D-004/D-009】会場管理層(/venue)から NEXT_PUBLIC_MOP_ENABLED（publicEnv / process.env 含む）を参照してはなりません。',
        },
        {
          property: 'isMopBuildEnabled',
          message:
            '【キルスイッチ分離違反 D-004/D-009】会場管理層(/venue)から isMopBuildEnabled を参照してはなりません。',
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...BASE_XSS_RESTRICTED_SYNTAX,
        {
          selector:
            'ImportExpression[source.value=/(^firebase\\/firestore$|(^|\\/)(\\(mop\\)|mop)(\\/|$))/]',
          message:
            '【動的import境界違反 D-004/D-009】会場管理層(/venue)から第2層(mop)または通常版firebase/firestoreを動的 import() することは禁止されています。',
        },
      ],
    },
  },
  {
    // 第2層 MOP/POS 層: 会場管理層(/venue)への不要な逆依存を静的・動的とも遮断し直交性を維持
    files: ['src/domains/mop/**/*.{ts,tsx}', 'src/app/(mop)/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(\\(venue\\)|venue)(/|$)',
              message:
                '【境界直交性違反 D-004】第2層(mop)から会場スタッフ管理層(venue)を import することは禁止されています。',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...BASE_XSS_RESTRICTED_SYNTAX,
        {
          selector: 'ImportExpression[source.value=/(^|\\/)(\\(venue\\)|venue)(\\/|$)/]',
          message:
            '【動的import境界違反 D-004】第2層(mop)から会場スタッフ管理層(venue)を動的 import() することは禁止されています。',
        },
      ],
    },
  },
  {
    // SSOT 型・Zodスキーマ層 (src/types): Cloud Functions (esbuild) からも共有されるためランタイムSDKやUI層への依存を完全禁止
    files: ['src/types/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '(^(firebase(-admin|-functions)?|next|react)(/|$)|(^|/)(domains|components|app|lib|\\(portal\\)|\\(mop\\)|\\(venue\\))(/|$))',
              message:
                '【SSOT純粋性違反 D-002】src/types 配下はフロントエンド・CLI・Cloud Functions で共有される純粋な型・Zodスキーマのみを記述してください。',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...BASE_XSS_RESTRICTED_SYNTAX,
        {
          selector:
            'ImportExpression[source.value=/(^(firebase(-admin|-functions)?|next|react)(\\/|$)|(^|\\/)(domains|components|app|lib|\\(portal\\)|\\(mop\\)|\\(venue\\))(\\/|$))/]',
          message:
            '【SSOT純粋性違反 D-002】src/types 配下でのランタイムSDK・UI層の動的 import() は禁止されています。',
        },
      ],
    },
  },
  {
    // Cloud Functions (D-003): googleapis 等の巨大パッケージ読込を禁止
    files: ['functions/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^googleapis(/|$)',
              message:
                '【D-003 コールドスタート保護】Cloud Functions で googleapis 等の巨大パッケージを導入・読込することは禁止されています。',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...BASE_XSS_RESTRICTED_SYNTAX,
        {
          selector: 'ImportExpression[source.value=/^googleapis(\\/|$)/]',
          message:
            '【D-003 コールドスタート保護】Cloud Functions で googleapis を動的 import() することは禁止されています。',
        },
        {
          selector:
            "CallExpression[callee.name='require'][arguments.0.value=/^googleapis(\\/|$)/]",
          message:
            '【D-003 コールドスタート保護】Cloud Functions で googleapis を require() することは禁止されています。',
        },
      ],
    },
  },
);
