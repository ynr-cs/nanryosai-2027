import type { Metadata } from 'next';
import { PortalLink } from '@/domains/portal/components/PortalLink';

export const metadata: Metadata = {
  title: 'ご案内・アクセス',
};

export default function GuidePage() {
  return (
    <main className="portal-main">
      <section className="page-head">
        <h1 className="sec-title" style={{ marginBottom: 0 }}>
          ご案内・アクセス
        </h1>
        <p className="meta-text">
          第25回 南陵祭2027 の開催概要・アクセス・お支払い方法・運営体制をまとめています。
        </p>
      </section>

      <section id="overview" className="card stack-md">
        <h2>開催概要・ご来場の皆様へ</h2>
        <p>令和9年度 第25回 南陵祭は 2027年9月10日(金)・11日(土) の2日間開催予定です。</p>
        <ul className="meta-text" style={{ display: 'grid', gap: 6 }}>
          <li>・9月10日(金)：校内発表（一般来校不可）</li>
          <li>・9月11日(土)：一般公開 10:00〜15:00（予定）</li>
          <li>・入場は正門のみ／上履き不要（土足の一足制）</li>
        </ul>
      </section>

      <section id="access" className="card stack-md">
        <h2>アクセス</h2>
        <p>神奈川県立 横浜南陵高等学校（〒234-0053 横浜市港南区日野中央2-26-1）</p>
        <p className="meta-text">
          車・バイクでのご来場はご遠慮ください。京急「上大岡駅」またはJR「港南台駅」「洋光台駅」から路線バスをご利用ください。
        </p>
      </section>

      <section id="payment" className="card stack-md">
        <h2>使える決済（完全キャッシュレス）</h2>
        <p className="meta-text">
          校内の模擬店・販売企画はすべて AirPAY によるキャッシュレス決済（交通系IC・クレジットカード・QR決済等）となり、現金はご利用いただけません。事前に残高チャージをお済ませください。
        </p>
      </section>

      <section id="news" className="card stack-md">
        <h2>お知らせ</h2>
        <ul className="meta-text" style={{ display: 'grid', gap: 6 }}>
          <li>・2027.09.08 ステージタイムテーブルを公開しました</li>
          <li>・2027.09.05 モバイルオーダー対象の模擬店が決まりました</li>
          <li>・2027.09.01 公式デジタルパンフレットを公開しました</li>
        </ul>
      </section>

      <section id="voting" className="card stack-md">
        <h2>生徒会 人気投票（南陵グランプリ）</h2>
        <p className="meta-text">開催当日より投票フォームの受付を開始します。</p>
      </section>

      <section id="survey" className="card stack-md">
        <h2>来場者アンケート</h2>
        <p className="meta-text">南陵祭開催期間中に回答フォームを公開します。</p>
      </section>

      <section id="terms" className="card stack-md">
        <h2>利用規約</h2>
        <p className="meta-text">
          本サイトに掲載されている企画情報・時刻は当日の状況により変更される場合があります。無断転載・自動スクレイピングはご遠慮ください。
        </p>
      </section>

      <section id="privacy" className="card stack-md">
        <h2>プライバシーポリシー</h2>
        <p className="meta-text">
          本ポータルはお気に入り機能にブラウザ内のローカルストレージを使用し、アクセス解析には匿名化された Google Analytics 4 を利用しています。
        </p>
      </section>

      <section id="about" className="card stack-md">
        <h2>公式デジタルパンフレット運営・開発体制</h2>
        <p className="meta-text">
          企画・運用：横浜南陵高等学校 南陵祭実行委員会・生徒会 ／ 設計・開発・保守：コンピュータ科学部（ynr-cs）
        </p>
        <div>
          <PortalLink href="/projects/cs" className="btn">
            コンピュータ科学部の企画ページを見る
          </PortalLink>
        </div>
      </section>
    </main>
  );
}
