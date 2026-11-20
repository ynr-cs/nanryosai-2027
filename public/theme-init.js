/* global window, document, localStorage */
(function () {
  var THEME_KEY = 'nanryosai2027:theme';
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem(THEME_KEY);
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (saved === 'dark' || saved === 'light') {
      root.dataset.theme = saved;
      if (meta) meta.setAttribute('content', saved);
    } else {
      delete root.dataset.theme;
      if (meta) meta.setAttribute('content', 'light dark');
    }
  } catch {
    /* プライベートブラウズ等で localStorage 不可時はシステム設定追従を維持 */
  }

  try {
    var vv = window.visualViewport;
    var w = (vv && vv.width) || window.innerWidth || 1024;
    var h = (vv && vv.height) || window.innerHeight || 768;
    root.dataset.density = w <= 400 || h <= 700 ? 'compact' : w <= 520 ? 'cozy' : 'normal';
    if (w <= 520) {
      var wScale = 12.2 + ((Math.max(320, w) - 320) / 200) * 2.8;
      var hFactor = h < 660 ? Math.max(0.9, h / 660) : 1;
      root.style.fontSize = Math.max(11.5, Math.min(15.5, wScale * hFactor)).toFixed(2) + 'px';
    }
  } catch {
    /* 無害スキップ */
  }
})();
