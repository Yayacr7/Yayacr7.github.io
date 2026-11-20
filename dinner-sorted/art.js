/* Drawn meal illustrations (SVG). These are illustrations, not photos of the real dish. */
(function (root) {
  'use strict';
  function rng(seed) { var h = 2166136261; for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    function c(x) { return Math.max(0, Math.min(255, x)); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }
  function plate(cx, cy, rx, ry) {
    return '<ellipse cx="' + cx + '" cy="' + (cy + 6) + '" rx="' + (rx + 2) + '" ry="' + (ry + 2) + '" fill="#000" opacity=".08"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#FFFDF8" stroke="#EADFCB" stroke-width="2"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (rx * 0.78) + '" ry="' + (ry * 0.78) + '" fill="none" stroke="#F1E8D6" stroke-width="2"/>';
  }
  function leaves(R, n, col, x0, y0, w, h) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = x0 + R() * w, y = y0 + R() * h, a = Math.round(R() * 180);
      s += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="4.5" ry="2.2" fill="' + col + '" transform="rotate(' + a + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    }
    return s;
  }
  function dots(R, n, col, x0, y0, w, h, r0, r1) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<circle cx="' + (x0 + R() * w).toFixed(1) + '" cy="' + (y0 + R() * h).toFixed(1) + '" r="' + (r0 + R() * (r1 - r0)).toFixed(1) + '" fill="' + col + '"/>';
    return s;
  }
  var K = {
    bowl: function (c, R) {
      return '<ellipse cx="100" cy="122" rx="62" ry="9" fill="#000" opacity=".08"/>' +
        '<path d="M36 74h128c0 30-26 50-64 50S36 104 36 74z" fill="#FFFDF8" stroke="#EADFCB" stroke-width="2"/>' +
        '<path d="M44 92c14 8 34 12 56 12s42-4 56-12" stroke="#C8371F" stroke-width="3" fill="none" opacity=".55"/>' +
        '<ellipse cx="100" cy="74" rx="64" ry="18" fill="' + c[0] + '" stroke="' + shade(c[0], -25) + '" stroke-width="1.5"/>' +
        (function () { var s = ''; for (var i = 0; i < 9; i++) { var x = 66 + R() * 62, y = 64 + R() * 14, a = Math.round(R() * 90); s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="13" height="9" rx="3.5" fill="' + c[1] + '" stroke="' + shade(c[1], -30) + '" stroke-width="1" transform="rotate(' + a + ' ' + (x + 6).toFixed(1) + ' ' + (y + 4).toFixed(1) + ')"/>'; } return s; })() +
        leaves(R, 10, c[2], 60, 62, 80, 18);
    },
    pasta: function (c, R) {
      var s = plate(100, 84, 76, 36), i;
      for (i = 0; i < 9; i++) {
        var y = 70 + i * 3.2, x = 56 + R() * 8;
        s += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' q 11 -12 22 0 t 22 0 t 22 0 t 18 0" stroke="' + (i % 2 ? c[0] : shade(c[0], -18)) + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      }
      s += dots(R, 6, c[1], 70, 68, 60, 22, 3.5, 6.5) + leaves(R, 8, c[2], 66, 66, 68, 24);
      return s;
    },
    taco: function (c, R) {
      var s = plate(100, 92, 80, 30);
      [[62, 86], [100, 80], [138, 86]].forEach(function (p, i) {
        var x = p[0], y = p[1];
        s += '<path d="M' + (x - 26) + ' ' + y + ' a26 26 0 0 1 52 0z" fill="' + c[0] + '" stroke="' + shade(c[0], -40) + '" stroke-width="2"/>';
        s += dots(R, 5, c[1], x - 18, y - 6, 36, 5, 3, 5) + leaves(R, 5, c[2], x - 18, y - 10, 36, 6);
        s += '<path d="M' + (x - 26) + ' ' + y + ' a26 26 0 0 1 52 0" fill="none" stroke="' + shade(c[0], 18) + '" stroke-width="3" opacity=".6"/>';
      });
      return s;
    },
    soup: function (c, R) {
      return '<path d="M78 30c-6 8 6 10 0 18M100 24c-6 8 6 10 0 18M122 30c-6 8 6 10 0 18" stroke="#C9BBA4" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<ellipse cx="100" cy="124" rx="60" ry="8" fill="#000" opacity=".08"/>' +
        '<path d="M34 72h132c0 32-28 52-66 52S34 104 34 72z" fill="#C8371F"/>' +
        '<path d="M42 96c16 7 36 10 58 10s42-3 58-10" stroke="#FBF6EC" stroke-width="3" fill="none" opacity=".7"/>' +
        '<ellipse cx="100" cy="72" rx="66" ry="17" fill="#FFFDF8"/><ellipse cx="100" cy="73" rx="58" ry="13" fill="' + c[0] + '"/>' +
        dots(R, 8, c[1], 58, 66, 84, 12, 3, 5.5) + leaves(R, 9, c[2], 56, 65, 88, 12);
    },
    skillet: function (c, R) {
      var s = '<rect x="150" y="70" width="44" height="12" rx="6" fill="#2A231D" transform="rotate(-12 150 76)"/>' +
        '<ellipse cx="96" cy="84" rx="66" ry="42" fill="#2A231D"/><ellipse cx="96" cy="81" rx="58" ry="35" fill="' + c[0] + '"/>';
      [[72, 72], [112, 70], [84, 94], [120, 92]].forEach(function (p) {
        s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="15" ry="10" fill="' + c[1] + '"/><circle cx="' + (p[0] + 1) + '" cy="' + (p[1] - 1) + '" r="5.5" fill="' + c[2] + '"/>';
      });
      return s + leaves(R, 8, '#3F8F4A', 50, 60, 92, 40);
    },
    sheet: function (c, R) {
      var s = '<rect x="22" y="44" width="156" height="84" rx="10" fill="#000" opacity=".08"/><rect x="20" y="38" width="160" height="84" rx="10" fill="#8C8276"/><rect x="28" y="46" width="144" height="68" rx="6" fill="#B5AA9B"/>', i;
      for (i = 0; i < 9; i++) { var x = 34 + R() * 120, y = 52 + R() * 46; s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="17" height="14" rx="5" fill="' + c[0] + '" stroke="' + shade(c[0], -35) + '" stroke-width="1.5"/>'; }
      for (i = 0; i < 6; i++) { var x2 = 40 + R() * 116, y2 = 56 + R() * 44; s += '<circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="8" fill="' + c[1] + '" stroke="' + shade(c[1], -30) + '" stroke-width="1.5"/>'; }
      for (i = 0; i < 6; i++) { var x3 = 40 + R() * 116, y3 = 56 + R() * 44, a = Math.round(R() * 180); s += '<rect x="' + x3.toFixed(1) + '" y="' + y3.toFixed(1) + '" width="18" height="5" rx="2.5" fill="' + c[2] + '" transform="rotate(' + a + ' ' + x3.toFixed(1) + ' ' + y3.toFixed(1) + ')"/>'; }
      return s;
    },
    sandwich: function (c, R) {
      return plate(78, 92, 62, 28) +
        '<path d="M44 96 78 56l18 44z" fill="' + c[0] + '" stroke="' + shade(c[0], -45) + '" stroke-width="3" stroke-linejoin="round"/><path d="M54 96l26-30" stroke="' + c[2] + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M82 100 108 62l14 42z" fill="' + c[0] + '" stroke="' + shade(c[0], -45) + '" stroke-width="3" stroke-linejoin="round"/><path d="M92 100l20-28" stroke="' + c[2] + '" stroke-width="5" stroke-linecap="round"/>' +
        '<ellipse cx="150" cy="104" rx="34" ry="8" fill="#000" opacity=".08"/><path d="M118 80h64c0 16-14 26-32 26s-32-10-32-26z" fill="#FFFDF8" stroke="#EADFCB" stroke-width="2"/><ellipse cx="150" cy="80" rx="32" ry="9" fill="' + c[1] + '"/>' + leaves(R, 4, '#3F8F4A', 136, 76, 28, 6);
    },
    potato: function (c, R) {
      var s = plate(100, 88, 80, 34);
      [[70, 84], [130, 84]].forEach(function (p) {
        s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="27" ry="17" fill="' + c[0] + '" stroke="' + shade(c[0], -40) + '" stroke-width="2"/><ellipse cx="' + p[0] + '" cy="' + (p[1] - 2) + '" rx="18" ry="9" fill="' + c[1] + '"/>' + leaves(R, 6, c[2], p[0] - 14, p[1] - 8, 28, 10);
      });
      return s;
    },
    plate: function (c, R) {
      var s = plate(100, 86, 80, 36);
      s += '<ellipse cx="72" cy="84" rx="26" ry="15" fill="' + c[1] + '" stroke="#E4D8C0" stroke-width="1.5"/>';
      s += '<rect x="92" y="68" width="52" height="30" rx="12" fill="' + c[0] + '" stroke="' + shade(c[0], -40) + '" stroke-width="2"/>';
      for (var i = 0; i < 4; i++) s += '<path d="M' + (100 + i * 11) + ' 72 l -5 22" stroke="' + shade(c[0], 30) + '" stroke-width="2.5" stroke-linecap="round"/>';
      s += dots(R, 5, c[2], 70, 98, 60, 10, 4, 6);
      return s;
    }
  };
  function art(recipe, cls) {
    var a = recipe.art || { kind: 'plate', colors: ['#F2B53A', '#FBF6EC', '#2F7A3B'] };
    var R = rng(recipe.id), draw = K[a.kind] || K.plate;
    var bg = a.colors[0];
    return '<svg class="' + (cls || 'art') + '" viewBox="0 0 200 150" role="img" aria-label="Illustration of ' + recipe.name.replace(/"/g, '') + '">' +
      '<defs><radialGradient id="g-' + recipe.id + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="' + shade(bg, 30) + '" stop-opacity=".55"/><stop offset="1" stop-color="#FBF6EC" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="200" height="150" fill="url(#g-' + recipe.id + ')"/>' + draw(a.colors, R) + '</svg>';
  }
  // Home scene in the style of the concept: drawn, not a photo.
  function scene() {
    var R = rng('dinner-sorted-scene'), s = '', i;
    function tomato(x, y, r) {
      return '<circle cx="' + x + '" cy="' + (y + 3) + '" r="' + r + '" fill="#000" opacity=".08"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#E0452B"/><path d="M' + (x - r * .7) + ' ' + (y + r * .2) + 'a' + r * .75 + ' ' + r * .75 + ' 0 0 0 ' + r * 1.3 + ' ' + r * .5 + '" stroke="#B8311C" stroke-width="' + r * .25 + '" fill="none" opacity=".45"/>' +
        '<ellipse cx="' + (x - r * .35) + '" cy="' + (y - r * .4) + '" rx="' + r * .22 + '" ry="' + r * .13 + '" fill="#fff" opacity=".7" transform="rotate(-30 ' + (x - r * .35) + ' ' + (y - r * .4) + ')"/>' +
        '<path d="M' + x + ' ' + (y - r * .95) + 'l' + (-r * .45) + ' ' + (-r * .15) + 'M' + x + ' ' + (y - r * .95) + 'l' + (r * .45) + ' ' + (-r * .2) + 'M' + x + ' ' + (y - r * .95) + 'l' + (-r * .1) + ' ' + (-r * .45) + '" stroke="#2F7A3B" stroke-width="' + r * .18 + '" stroke-linecap="round"/>';
    }
    function leaf(x, y, w, a, c) {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ')"><path d="M0 0C' + w * .3 + ' ' + (-w * .32) + ' ' + w * .75 + ' ' + (-w * .3) + ' ' + w + ' 0C' + w * .75 + ' ' + w * .3 + ' ' + w * .3 + ' ' + w * .32 + ' 0 0z" fill="' + (c || '#2F7A3B') + '"/><path d="M' + w * .08 + ' 0H' + w * .85 + '" stroke="#7DBB6A" stroke-width="1.4" opacity=".7"/></g>';
    }
    function tube(x, y, a, len) {
      var g = '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ')"><rect x="0" y="-7" width="' + len + '" height="14" rx="3" fill="#F2B04A" stroke="#D88E26" stroke-width="1.2"/>';
      for (var k = 5; k < len; k += 5) g += '<path d="M' + k + ' -6v12" stroke="#E39A32" stroke-width="1.2"/>';
      return g + '<ellipse cx="' + len + '" cy="0" rx="3" ry="7" fill="#F6C46E" stroke="#D88E26" stroke-width="1.2"/><ellipse cx="' + len + '" cy="0" rx="1.3" ry="4" fill="#C77B1C"/></g>';
    }
    s += '<path d="M8 296c30-26 70-22 92 4l14 52c-34 14-76 14-104-2z" fill="#E9A82B"/><path d="M22 312c24-12 50-8 68 6" stroke="#F4C55C" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>';
    // spinach bowl, top right
    s += '<ellipse cx="340" cy="62" rx="54" ry="44" fill="#FFFDF8" stroke="#EADFCB" stroke-width="2"/>';
    for (i = 0; i < 9; i++) s += leaf(296 + R() * 64, 34 + R() * 46, 26 + R() * 12, Math.round(R() * 360), i % 3 ? '#2F7A3B' : '#3E8F48');
    // tomatoes on the vine, top middle
    s += '<path d="M150 16c30 10 52 26 70 44M182 26c4 16 0 30-8 40M212 52c10 6 16 16 18 28" stroke="#3F7A35" stroke-width="5" fill="none" stroke-linecap="round"/>';
    s += tomato(170, 72, 25) + tomato(222, 92, 27) + tomato(258, 56, 23) + tomato(208, 136, 24) + tomato(150, 120, 20);
    s += leaf(270, 150, 40, 200);
    // pasta bowl
    s += '<ellipse cx="170" cy="300" rx="132" ry="44" fill="#000" opacity=".09"/><ellipse cx="170" cy="268" rx="132" ry="74" fill="#F4EBDD" stroke="#E2D4BC" stroke-width="2"/>';
    for (i = 0; i < 40; i++) { var a2 = R() * Math.PI * 2, rr = .9 + R() * .1; s += '<circle cx="' + (170 + Math.cos(a2) * 124 * rr).toFixed(1) + '" cy="' + (268 + Math.sin(a2) * 68 * rr).toFixed(1) + '" r="' + (0.8 + R() * 1.2).toFixed(1) + '" fill="#B9A587"/>'; }
    s += '<ellipse cx="170" cy="262" rx="104" ry="54" fill="#E0743A"/>';
    for (i = 0; i < 22; i++) s += tube((88 + R() * 150).toFixed(1), (232 + R() * 58).toFixed(1), Math.round(R() * 180), 24 + Math.round(R() * 8));
    [[120, 248], [190, 236], [228, 270], [150, 285], [104, 272]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="11" fill="#D93A22"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="#F0644A"/><circle cx="' + (p[0] - 2) + '" cy="' + (p[1] - 3) + '" r="2" fill="#FFB49E"/>'; });
    for (i = 0; i < 7; i++) s += leaf(96 + R() * 140, 238 + R() * 50, 18 + R() * 8, Math.round(R() * 360));
    s += leaf(160, 226, 34, -20, '#3E8F48');
    for (i = 0; i < 26; i++) s += '<rect x="' + (100 + R() * 140).toFixed(1) + '" y="' + (236 + R() * 50).toFixed(1) + '" width="3" height="2" fill="#FFF7E2"/>';
    // dry rigatoni bowl, bottom right
    s += '<ellipse cx="338" cy="312" rx="52" ry="36" fill="#FFFDF8" stroke="#EADFCB" stroke-width="2"/>';
    for (i = 0; i < 9; i++) s += tube((306 + R() * 40).toFixed(1), (298 + R() * 24).toFixed(1), Math.round(R() * 180), 24);
    s += tube(300, 350, 20, 26) + tube(262, 344, -35, 24);
    s += '<path d="M318 210l14-8M322 226l18 2M314 196l4-14" stroke="#F2B53A" stroke-width="4" stroke-linecap="round"/>';
    return '<svg class="scene" viewBox="0 0 400 370" role="img" aria-label="Drawing of tomatoes, spinach and a bowl of pasta">' + s + '</svg>';
  }
  root.DSArt = { art: art, scene: scene };
})(this);
