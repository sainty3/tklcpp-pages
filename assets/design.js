/* tklcpp · tk 连字、FluxLines 背景、MetallicPaint 与边缘光辉
   视觉参数来自 Negotiation Arena 设计规范 v1.7。 */
(function () {
  'use strict';

  var LOGO_PATH = 'M78.00 2.86 L33.43 24.86 L34.57 15.72 L25.14 15.15 L12.00 46.58 L16.00 50.01 L26.86 34.86 L93.14 71.44 L48.29 37.15 L38.57 31.15 L38.86 28.29 L70.86 11.43 Z M6.86 19.72 L46.86 20.29 L50.29 14.57 L45.71 10.57 L6.86 12.86 L2.86 17.43 Z';
  var LOGO_W = 96;
  var LOGO_H = 74.3;
  var TK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="' + LOGO_W + '" height="' + LOGO_H + '" viewBox="0 0 ' + LOGO_W + ' ' + LOGO_H + '"><path d="' + LOGO_PATH + '" fill="#000"/></svg>';
  var TK_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(TK_SVG);
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var theme = function () { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ============================================================
     FluxLines · WebGL2 流体线背景
     ============================================================ */
  function initFlux() {
    var canvas = document.querySelector('[data-flux]');
    if (!canvas) return;
    var container = canvas.parentElement;
    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { container.classList.add('flux-fallback'); return; }

    var MAX_COLORS = 8;
    var VERTEX = '#version 300 es\nin vec2 aPosition;\nvoid main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }';
    var FIELD = [
      'float hash(vec3 p3) {',
      '  p3 = fract(p3 * 0.1031);',
      '  p3 += dot(p3, p3.zyx + 33.33);',
      '  return fract((p3.x + p3.y) * p3.z);',
      '}',
      'float smin(float a, float b, float k) {',
      '  float r = exp2(-a / k) + exp2(-b / k);',
      '  return -k * log2(r);',
      '}',
      'float sinlerp(float a, float b, float w) {',
      '  return mix(a, b, (sin(w * 3.14159265 - 3.14159265 / 2.0) + 1.0) / 2.0);',
      '}',
      'float vn(vec2 p, float s, float seed) {',
      '  vec2 cellp = floor(p / s);',
      '  vec2 relp = mod(p, s);',
      '  float g1 = hash(vec3(cellp, seed));',
      '  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));',
      '  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));',
      '  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));',
      '  float bx = sinlerp(g1, g2, relp.x / s);',
      '  float tx = sinlerp(g4, g3, relp.x / s);',
      '  return sinlerp(bx, tx, relp.y / s);',
      '}',
      'float dbn(vec2 p, float s, float seed) {',
      '  float o = s / 2.0;',
      '  float n0 = vn(p, s, seed);',
      '  float n1 = vn(p + vec2(o, o), s, seed + 0.1);',
      '  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);',
      '  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);',
      '  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);',
      '  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;',
      '}'
    ].join('\n');
    var FRAGMENT = [
      '#version 300 es',
      'precision highp float;',
      'precision highp int;',
      'uniform vec2 uResolution;',
      'uniform float uTime;',
      'uniform vec2 uFlow;',
      'uniform float uSpeed;',
      'uniform float uScale;',
      'uniform float uTurbulence;',
      'uniform float uFluidity;',
      'uniform float uRimWidth;',
      'uniform float uSharpness;',
      'uniform float uShimmer;',
      'uniform float uGlow;',
      'uniform float uLine;',
      'uniform float uMaxHalf;',
      'uniform vec3 uColors[' + MAX_COLORS + '];',
      'uniform int uColorCount;',
      'uniform vec4 uMagnet;',
      'uniform vec4 uSwirl;',
      'uniform float uReveal;',
      'uniform float uLight;',
      'uniform float uOpaque;',
      'uniform vec3 uBackground;',
      'uniform float uOpacity;',
      'out vec4 outColor;',
      FIELD,
      'vec3 palette(float h) {',
      '  float x = clamp(h, 0.0, 1.0) * float(uColorCount - 1);',
      '  int i = int(floor(x));',
      '  int j = min(i + 1, uColorCount - 1);',
      '  return mix(uColors[i], uColors[j], smoothstep(0.0, 1.0, x - float(i)));',
      '}',
      'void main() {',
      '  float ref = 700.0 / max(uScale, 0.05);',
      '  vec2 frag = gl_FragCoord.xy;',
      '  vec2 toMagnet = (frag - uMagnet.xy) / uResolution.y;',
      '  float pull = uMagnet.z * exp(-dot(toMagnet, toMagnet) / (uMagnet.w * uMagnet.w));',
      '  if (pull > 0.001) {',
      '    float angle = pull * 0.55;',
      '    float c = cos(angle); float s = sin(angle);',
      '    frag = uMagnet.xy + mat2(c, s, -s, c) * (frag - uMagnet.xy);',
      '  }',
      '  if (uSwirl.w > 0.0) {',
      '    vec2 sd = frag - uSwirl.xy;',
      '    float reach = uSwirl.z;',
      '    float angle = uSwirl.w * exp(-dot(sd, sd) / (reach * reach));',
      '    float c = cos(angle); float s = sin(angle);',
      '    frag = uSwirl.xy + mat2(c, s, -s, c) * sd;',
      '  }',
      '  vec2 p = frag / uResolution.y * ref;',
      '  float spd = 200.0 * uSpeed;',
      '  float t = uTime;',
      '  vec2 dir = uFlow;',
      '  vec2 perp = vec2(-dir.y, dir.x);',
      '  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;',
      '  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;',
      '  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);',
      '  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);',
      '  float field = smin(peaks, peaks2, max(uFluidity, 0.001));',
      '  float slope = length(vec2(dFdx(field), dFdy(field)));',
      '  float gap = abs(field - 0.4);',
      '  float pixels = gap / max(slope, 1e-6);',
      '  float halfBand = max(uRimWidth, 0.001) * 0.5;',
      '  float across = max(gap / halfBand, pixels / uMaxHalf);',
      '  float band = 5.0 * uRimWidth * (1.0 - across);',
      '  float reveal = smoothstep(0.2, 0.85, pull);',
      '  float shimmer = vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer * (1.0 - reveal * 0.75);',
      '  float lit = clamp(band - shimmer, 0.0, 1.0);',
      '  float glow = pow(lit, uSharpness) * uGlow * (1.0 + reveal * 0.25);',
      '  float core = uLine > 0.0 ? smoothstep(uLine + 0.75, uLine - 0.75, pixels) * max(smoothstep(0.08, 0.6, glow), reveal) : 0.0;',
      '  float shine = clamp(glow, 0.0, 1.0);',
      '  float energy = max(shine * shine, core * 0.85) * uReveal;',
      '  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);',
      '  vec3 tint = palette(h);',
      '  if (uLight > 0.5) {',
      '    float chroma = max(tint.r, max(tint.g, tint.b)) - min(tint.r, min(tint.g, tint.b));',
      '    vec3 ink = mix(vec3(0.07, 0.07, 0.08), tint * 0.55, clamp(chroma * 1.6, 0.0, 1.0));',
      '    float cover = energy * uOpacity;',
      '    outColor = uOpaque > 0.5 ? vec4(mix(uBackground, ink, cover), 1.0) : vec4(ink * cover, cover);',
      '    return;',
      '  }',
      '  vec3 light = tint * energy * uOpacity;',
      '  outColor = uOpaque > 0.5 ? vec4(uBackground + light, 1.0) : vec4(light, max(light.r, max(light.g, light.b)));',
      '}'
    ].join('\n');

    function compile(type, source) {
      var shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader);
      return null;
    }
    function linkProgram() {
      var vertex = compile(gl.VERTEX_SHADER, VERTEX);
      var fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
      var program = gl.createProgram();
      if (!vertex || !fragment || !program) return null;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
      var uniforms = {};
      var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < count; i++) {
        var info = gl.getActiveUniform(program, i);
        if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
      }
      return { program: program, uniforms: uniforms };
    }
    var linked = linkProgram();
    if (!linked) { container.classList.add('flux-fallback'); return; }
    var u = linked.uniforms;
    var buffer = gl.createBuffer();
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    var cache = {};
    function parseColor(value) {
      if (cache[value]) return cache[value];
      var rgb = [0.1, 0.1, 0.1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        var d = probe.getImageData(0, 0, 1, 1).data;
        rgb = [d[0] / 255, d[1] / 255, d[2] / 255];
      }
      cache[value] = rgb;
      return rgb;
    }
    var palette = new Float32Array(MAX_COLORS * 3);
    var pointer = { x: 0, y: 0, inside: false };
    var magnet = { x: 0, y: 0, active: 0 };
    var swirl = { x: 0, y: 0, age: 10 };
    var time = 0, reveal = reduced ? 1 : 0, last = 0, raf = 0, visible = true;

    function render() {
      var dark = theme() === 'dark';
      var colors = dark ? ['#f0f0ee', '#a3a3a0', '#656565'] : ['#1a191d', '#6b6b67', '#989898'];
      var opacity = dark ? 0.52 : 0.38;
      var ratio = canvas.width / Math.max(1, container.clientWidth);
      colors.forEach(function (c, i) { palette.set(parseColor(c), i * 3); });
      var intro = Math.min(1, reveal);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(linked.program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uFlow, 0, -1);
      gl.uniform1f(u.uSpeed, 0.32);
      gl.uniform1f(u.uScale, 1.45);
      gl.uniform1f(u.uTurbulence, 0.9);
      gl.uniform1f(u.uFluidity, 0.12);
      gl.uniform1f(u.uRimWidth, 0.18);
      gl.uniform1f(u.uSharpness, 2.6);
      gl.uniform1f(u.uShimmer, 1.35);
      gl.uniform1f(u.uGlow, 1.5);
      gl.uniform1f(u.uLine, 0.7 * ratio * 0.5);
      gl.uniform1f(u.uMaxHalf, 28 * ratio);
      gl.uniform3fv(u.uColors, palette);
      gl.uniform1i(u.uColorCount, 3);
      gl.uniform4f(u.uMagnet, magnet.x, magnet.y, magnet.active * 0.9, 0.32);
      var age = swirl.age;
      var twist = 1.9 * Math.min(1, age / 0.23) * Math.exp(-Math.max(0, age - 0.23) * 1.1);
      gl.uniform4f(u.uSwirl, swirl.x, swirl.y, canvas.height * 0.22 * (1 + age * 0.5), age < 6 ? twist : 0);
      gl.uniform1f(u.uReveal, intro * intro * (3 - 2 * intro));
      gl.uniform1f(u.uLight, dark ? 0 : 1);
      gl.uniform1f(u.uOpaque, 0);
      gl.uniform3fv(u.uBackground, [0, 0, 0]);
      gl.uniform1f(u.uOpacity, opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      var motion = reduced ? 0 : 1;
      time += dt * motion;
      swirl.age += dt;
      if (!reduced && reveal < 1) reveal = Math.min(1, reveal + dt / 1.8);
      else reveal = 1;
      var engaged = pointer.inside;
      var follow = 1 - Math.exp(-dt / 0.15);
      if (engaged) {
        magnet.x += (pointer.x - magnet.x) * follow;
        magnet.y += (pointer.y - magnet.y) * follow;
      }
      var target = engaged ? 1 : 0;
      magnet.active += (target - magnet.active) * (1 - Math.exp(-dt / 0.3));
      if (Math.abs(target - magnet.active) < 0.001) magnet.active = target;
      render();
      if (!reduced || magnet.active !== target || reveal < 1) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
    function resize() {
      var w = Math.max(1, container.clientWidth);
      var h = Math.max(1, container.clientHeight);
      var ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      render(); wake();
    }
    function locate(e) {
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var ratio = canvas.width / Math.max(1, rect.width);
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      pointer.x = x * ratio; pointer.y = (rect.height - y) * ratio;
    }
    window.addEventListener('pointermove', function (e) {
      var was = pointer.inside;
      locate(e);
      if (pointer.inside && !was && magnet.active < 0.05) { magnet.x = pointer.x; magnet.y = pointer.y; }
      wake();
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) {
      locate(e);
      if (!pointer.inside || reduced) return;
      swirl.x = pointer.x; swirl.y = pointer.y; swirl.age = 0; wake();
    }, { passive: true });
    window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') pointer.inside = false; });
    document.documentElement.addEventListener('pointerleave', function () { pointer.inside = false; });
    document.addEventListener('visibilitychange', function () { last = 0; wake(); });
    window.addEventListener('resize', resize);
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (x) { return x.isIntersecting; });
        if (visible) { last = 0; wake(); }
      }).observe(container);
    }
    resize();
    wake();
  }

  /* ============================================================
     MetallicPaint · tk 金属漆
     ============================================================ */
  var METAL_VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 a_position;',
    'uniform vec2 u_resolution;',
    'uniform float u_imageAspect;',
    'uniform float u_scale;',
    'uniform float u_rotation;',
    'out vec2 v_imageUV;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '  vec2 uv = a_position * 0.5;',
    '  float r = u_rotation * 3.14159265358979323846 / 180.0;',
    '  mat2 turn = mat2(cos(r), sin(r), -sin(r), cos(r));',
    '  vec2 imageBox;',
    '  imageBox.x = min(u_resolution.x / u_imageAspect, u_resolution.y) * u_imageAspect;',
    '  imageBox.y = imageBox.x / u_imageAspect;',
    '  v_imageUV = uv * (u_resolution / imageBox) / u_scale;',
    '  v_imageUV.x *= u_imageAspect;',
    '  v_imageUV = turn * v_imageUV;',
    '  v_imageUV.x /= u_imageAspect;',
    '  v_imageUV += 0.5;',
    '  v_imageUV.y = 1.0 - v_imageUV.y;',
    '}'
  ].join('\n');
  var METAL_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D u_image;',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    'uniform vec4 u_colorBack;',
    'uniform vec4 u_colorTint;',
    'uniform float u_softness;',
    'uniform float u_repetition;',
    'uniform float u_shiftRed;',
    'uniform float u_shiftBlue;',
    'uniform float u_distortion;',
    'uniform float u_contour;',
    'uniform float u_angle;',
    'uniform vec2 u_tilt;',
    'uniform float u_reveal;',
    'uniform float u_light;',
    'in vec2 v_imageUV;',
    'out vec4 fragColor;',
    '#define PI 3.14159265358979323846',
    'vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }',
    'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m; m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    'float getColorChanges(float c1, float c2, float stripe, vec3 w, float blur, float bump, float tint) {',
    '  float ch = mix(c2, c1, smoothstep(0.0, 2.0 * blur, stripe));',
    '  float border = w[0];',
    '  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe));',
    '  bump = smoothstep(0.2, 0.8, bump);',
    '  border = w[0] + 0.4 * (1.0 - bump) * w[1];',
    '  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe));',
    '  border = w[0] + 0.5 * (1.0 - bump) * w[1];',
    '  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe));',
    '  border = w[0] + w[1];',
    '  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe));',
    '  float gradientT = (stripe - w[0] - w[1]) / w[2];',
    '  float gradient = mix(c1, c2, smoothstep(0.0, 1.0, gradientT));',
    '  ch = mix(ch, gradient, smoothstep(border, border + 0.5 * blur, stripe));',
    '  ch = mix(ch, 1.0 - min(1.0, (1.0 - ch) / max(tint, 0.0001)), u_colorTint.a);',
    '  return ch;',
    '}',
    'float getImgFrame(vec2 uv, float th) {',
    '  float frame = 1.0;',
    '  frame *= smoothstep(0.0, th, uv.y);',
    '  frame *= 1.0 - smoothstep(1.0 - th, 1.0, uv.y);',
    '  frame *= smoothstep(0.0, th, uv.x);',
    '  frame *= 1.0 - smoothstep(1.0 - th, 1.0, uv.x);',
    '  return frame;',
    '}',
    'float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {',
    '  vec2 texel = 1.0 / vec2(textureSize(tex, 0));',
    '  vec2 r = radius * texel;',
    '  float sum = 4.0 * centerSample;',
    '  sum += 2.0 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;',
    '  sum += 2.0 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;',
    '  sum += 2.0 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;',
    '  sum += 2.0 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;',
    '  sum += textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;',
    '  sum += textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;',
    '  sum += textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;',
    '  sum += textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;',
    '  return sum / 16.0;',
    '}',
    'void main() {',
    '  const float firstFrameOffset = 2.8;',
    '  float t = 0.3 * (u_time + firstFrameOffset);',
    '  vec2 uv = v_imageUV;',
    '  vec2 dudx = dFdx(v_imageUV);',
    '  vec2 dudy = dFdy(v_imageUV);',
    '  vec4 img = textureGrad(u_image, uv, dudx, dudy);',
    '  float cycleWidth = u_repetition;',
    '  vec2 rotatedUV = uv - vec2(0.5);',
    '  float angle = (-u_angle + 70.0) * PI / 180.0;',
    '  float cosA = cos(angle);',
    '  float sinA = sin(angle);',
    '  rotatedUV = vec2(rotatedUV.x * cosA - rotatedUV.y * sinA, rotatedUV.x * sinA + rotatedUV.y * cosA) + vec2(0.5);',
    '  float edge = blurEdge3x3(u_image, uv, dudx, dudy, 6.0, img.r);',
    '  edge = pow(edge, 1.6);',
    '  edge *= smoothstep(0.0, 0.4, u_contour);',
    '  float opacity = img.g * getImgFrame(v_imageUV, 0.0);',
    '  float depth = img.r;',
    '  float diagBLtoTR = rotatedUV.x - rotatedUV.y;',
    '  float diagTLtoBR = rotatedUV.x + rotatedUV.y;',
    '  vec3 color1 = mix(vec3(0.98, 0.98, 1.0), vec3(0.9, 0.9, 0.93), u_light);',
    '  vec3 color2 = mix(vec3(0.3, 0.3, 0.33), vec3(0.1, 0.1, 0.1 + 0.1 * smoothstep(0.7, 1.3, diagTLtoBR)), u_light);',
    '  vec2 gradUV = uv - 0.5 - u_tilt * vec2(0.18, -0.12);',
    '  float dist = length(gradUV + vec2(0.0, 0.2 * diagBLtoTR));',
    '  gradUV = rotate(gradUV, (0.25 - 0.2 * diagBLtoTR) * PI);',
    '  float direction = gradUV.x;',
    '  float bump = pow(1.8 * dist, 1.2);',
    '  bump = 1.0 - bump;',
    '  bump *= pow(uv.y, 0.3);',
    '  float thinStrip1 = 0.12 / cycleWidth * (1.0 - 0.4 * bump);',
    '  float thinStrip2 = 0.07 / cycleWidth * (1.0 + 0.4 * bump);',
    '  float wideStrip = 1.0 - thinStrip1 - thinStrip2;',
    '  float noise = snoise(uv - t);',
    '  edge += (1.0 - edge) * u_distortion * noise;',
    '  direction += diagBLtoTR;',
    '  direction -= 2.0 * noise * diagBLtoTR * (smoothstep(0.0, 1.0, edge) * (1.0 - smoothstep(0.0, 1.0, edge)));',
    '  direction *= mix(1.0, 1.0 - edge, smoothstep(0.5, 1.0, u_contour));',
    '  direction -= 1.7 * edge * smoothstep(0.5, 1.0, u_contour);',
    '  direction += 0.2 * pow(u_contour, 4.0) * (1.0 - smoothstep(0.0, 1.0, edge));',
    '  bump *= clamp(pow(uv.y, 0.1), 0.3, 1.0);',
    '  direction *= 0.1 + (1.1 - edge) * bump;',
    '  direction *= 0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge));',
    '  direction += 0.18 * (smoothstep(0.1, 0.2, uv.y) * (1.0 - smoothstep(0.2, 0.4, uv.y)));',
    '  direction += 0.03 * (smoothstep(0.1, 0.2, 1.0 - uv.y) * (1.0 - smoothstep(0.2, 0.4, 1.0 - uv.y)));',
    '  direction *= 0.5 + 0.5 * pow(uv.y, 2.0);',
    '  direction *= cycleWidth;',
    '  direction -= t + dot(u_tilt, vec2(0.35, 0.2));',
    '  float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);',
    '  float dispersionRed = colorDispersion;',
    '  dispersionRed += 0.03 * bump * noise;',
    '  dispersionRed += 5.0 * (smoothstep(-0.1, 0.2, uv.y) * (1.0 - smoothstep(0.1, 0.5, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 1.0, bump)));',
    '  dispersionRed -= diagBLtoTR;',
    '  float dispersionBlue = colorDispersion * 1.3;',
    '  dispersionBlue += (smoothstep(0.0, 0.4, uv.y) * (1.0 - smoothstep(0.1, 0.8, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 0.8, bump)));',
    '  dispersionBlue -= 0.2 * edge;',
    '  dispersionRed *= u_shiftRed / 20.0;',
    '  dispersionBlue *= u_shiftBlue / 20.0;',
    '  float softness = 0.05 * u_softness;',
    '  float blur = softness + 0.5 * smoothstep(1.0, 10.0, u_repetition) * smoothstep(0.0, 1.0, edge);',
    '  float smallCanvas = 1.0 - smoothstep(100.0, 500.0, min(u_resolution.x, u_resolution.y));',
    '  blur += smallCanvas * smoothstep(0.0, 1.0, edge);',
    '  float rExtraBlur = softness * (0.05 + 0.1 * (u_shiftRed / 20.0) * bump);',
    '  float gExtraBlur = softness * 0.05 / max(0.001, abs(1.0 - diagBLtoTR));',
    '  vec3 w = vec3(thinStrip1 * cycleWidth, thinStrip2 * cycleWidth, wideStrip);',
    '  w[1] -= 0.02 * smoothstep(0.0, 1.0, edge + bump);',
    '  float stripeR = fract(direction + dispersionRed);',
    '  float r = getColorChanges(color1.r, color2.r, stripeR, w, blur + fwidth(stripeR) + rExtraBlur, bump, u_colorTint.r);',
    '  float stripeG = fract(direction);',
    '  float g = getColorChanges(color1.g, color2.g, stripeG, w, blur + fwidth(stripeG) + gExtraBlur, bump, u_colorTint.g);',
    '  float stripeB = fract(direction - dispersionBlue);',
    '  float b = getColorChanges(color1.b, color2.b, stripeB, w, blur + fwidth(stripeB), bump, u_colorTint.b);',
    '  vec3 sheen = mix(vec3(1.0), u_colorTint.rgb, 0.45 * u_colorTint.a);',
    '  r *= sheen.r; g *= sheen.g; b *= sheen.b;',
    '  float rim = smoothstep(0.78, 1.0, depth) * u_light;',
    '  r *= 1.0 - rim * 0.62; g *= 1.0 - rim * 0.62; b *= 1.0 - rim * 0.58;',
    '  float pour = u_reveal * 1.25 - 0.1;',
    '  opacity *= smoothstep(1.0 - pour, 1.15 - pour, depth) * smoothstep(0.0, 0.25, u_reveal);',
    '  vec3 color = vec3(r, g, b) * opacity;',
    '  vec3 back = u_colorBack.rgb * u_colorBack.a;',
    '  color += back * (1.0 - opacity);',
    '  opacity += u_colorBack.a * (1.0 - opacity);',
    '  color += 1.0 / 256.0 * (fract(sin(dot(0.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - 0.5);',
    '  fragColor = vec4(color, opacity);',
    '}'
  ].join('\n');

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('tk image failed')); };
      image.src = src;
    });
  }
  function solvePoisson(mask, width, height) {
    var interior = [];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var i = y * width + x;
        if (!mask[i]) continue;
        var boundary = x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          !mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width] ||
          !mask[i - width - 1] || !mask[i - width + 1] || !mask[i + width - 1] || !mask[i + width + 1];
        if (!boundary) interior.push(i);
      }
    }
    var field = new Float32Array(width * height);
    var red = [], black = [];
    interior.forEach(function (i) { (((i % width) + Math.floor(i / width)) % 2 === 0 ? red : black).push(i); });
    function relax(list) {
      for (var k = 0; k < list.length; k++) {
        var i = list[k];
        var sum = field[i + 1] + field[i - 1] + field[i - width] + field[i + width];
        field[i] = 1.9 * ((0.01 + sum) / 4) - 0.9 * field[i];
      }
    }
    for (var iteration = 0; iteration < 40; iteration++) { relax(red); relax(black); }
    var peak = 0;
    interior.forEach(function (i) { if (field[i] > peak) peak = field[i]; });
    return { field: field, peak: peak || 1 };
  }
  function processShape(source) {
    var width = source.width, height = source.height;
    var fit = 512 / Math.min(width, height);
    var workW = Math.max(2, Math.round(width * fit));
    var workH = Math.max(2, Math.round(height * fit));
    var small = document.createElement('canvas');
    small.width = workW; small.height = workH;
    var smallCtx = small.getContext('2d', { willReadFrequently: true });
    smallCtx.drawImage(source, 0, 0, workW, workH);
    var smallData = smallCtx.getImageData(0, 0, workW, workH).data;
    var mask = new Uint8Array(workW * workH);
    for (var i = 0; i < mask.length; i++) mask[i] = smallData[i * 4 + 3] > 0 ? 1 : 0;
    var solved = solvePoisson(mask, workW, workH);
    var field = solved.field, peak = solved.peak;
    var gradient = smallCtx.createImageData(workW, workH);
    for (var j = 0; j < mask.length; j++) {
      var p = j * 4;
      var value = mask[j] ? 255 * (1 - field[j] / peak) : 255;
      gradient.data[p] = value; gradient.data[p + 1] = value; gradient.data[p + 2] = value;
      gradient.data[p + 3] = mask[j] ? 255 : 0;
    }
    smallCtx.putImageData(gradient, 0, 0);
    var out = document.createElement('canvas');
    out.width = width; out.height = height;
    var outCtx = out.getContext('2d', { willReadFrequently: true });
    outCtx.imageSmoothingEnabled = true; outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(small, 0, 0, workW, workH, 0, 0, width, height);
    var result = outCtx.getImageData(0, 0, width, height);
    var original = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height).data;
    for (var k = 0; k < result.data.length; k += 4) {
      var alpha = original[k + 3];
      if (alpha === 0) { result.data[k] = 255; result.data[k + 1] = 0; }
      else { result.data[k] = result.data[k + 3] === 0 ? 0 : result.data[k]; result.data[k + 1] = alpha; }
      result.data[k + 2] = 255; result.data[k + 3] = 255;
    }
    return result;
  }
  var shapeDataPromise = null;
  function getShapeData() {
    if (shapeDataPromise) return shapeDataPromise;
    shapeDataPromise = loadImage(TK_IMAGE).then(function (image) {
      var w = 1024, h = Math.round(1024 * LOGO_H / LOGO_W);
      var source = document.createElement('canvas');
      source.width = w; source.height = h;
      var ctx = source.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, w, h);
      return processShape(source);
    });
    return shapeDataPromise;
  }

  function createMetallic(canvas) {
    var container = canvas.parentElement;
    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return null;
    function compile(type, src) {
      var shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader); return null;
    }
    var vertex = compile(gl.VERTEX_SHADER, METAL_VERTEX);
    var fragment = compile(gl.FRAGMENT_SHADER, METAL_FRAGMENT);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex); gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
    gl.useProgram(program);
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    var vao = gl.createVertexArray();
    var buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(uniforms.u_image, 0);

    var state = {
      raf: 0, last: 0, time: 0, visible: true, pending: false, hasImage: false,
      imageAspect: 1, width: 0, height: 0, revealStart: -1, reveal: reduced ? 1 : 0,
      tiltX: 0, tiltY: 0, velocityX: 0, velocityY: 0, targetX: 0, targetY: 0, alive: true
    };
    var tint = [1, 1, 1, 1];
    function parseColor(value) {
      var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = 'rgba(0,0,0,0)';
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      var d = probe.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
    }
    function resize() {
      var rect = container.getBoundingClientRect();
      var ratio = Math.max(window.devicePixelRatio || 1, 2);
      var pixels = rect.width * rect.height * ratio * ratio;
      var maxPixels = 2560 * 1600 * 2;
      if (pixels > maxPixels) ratio *= Math.sqrt(maxPixels / pixels);
      var width = Math.max(1, Math.round(rect.width * ratio));
      var height = Math.max(1, Math.round(rect.height * ratio));
      if (width === state.width && height === state.height) return;
      state.width = width; state.height = height;
      canvas.width = width; canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    function draw() {
      if (state.pending || !state.hasImage) {
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return;
      }
      var dark = theme() === 'dark';
      tint = parseColor(dark ? '#e9e9e5' : '#b9b9b4');
      gl.useProgram(program);
      gl.uniform2f(uniforms.u_resolution, state.width, state.height);
      gl.uniform1f(uniforms.u_time, state.time);
      gl.uniform1f(uniforms.u_imageAspect, state.imageAspect);
      gl.uniform1f(uniforms.u_scale, 1);
      gl.uniform1f(uniforms.u_rotation, 0);
      gl.uniform4f(uniforms.u_colorBack, 0, 0, 0, 0);
      gl.uniform4f(uniforms.u_colorTint, tint[0], tint[1], tint[2], tint[3]);
      gl.uniform1f(uniforms.u_softness, 0.12);
      gl.uniform1f(uniforms.u_repetition, 2.2);
      gl.uniform1f(uniforms.u_shiftRed, 0.08);
      gl.uniform1f(uniforms.u_shiftBlue, 0.08);
      gl.uniform1f(uniforms.u_distortion, 0.06);
      gl.uniform1f(uniforms.u_contour, 0.7);
      gl.uniform1f(uniforms.u_angle, 70);
      gl.uniform2f(uniforms.u_tilt, state.tiltX, state.tiltY);
      gl.uniform1f(uniforms.u_reveal, state.reveal);
      gl.uniform1f(uniforms.u_light, dark ? 0 : 1);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function frame(now) {
      state.raf = 0;
      if (!state.alive) return;
      var dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
      state.last = now;
      var moving = !reduced && !document.hidden;
      if (moving) state.time += dt * 0.9;
      var busy = moving;
      if (state.reveal < 1 && !state.pending) {
        if (state.revealStart < 0) state.revealStart = now;
        var progress = clamp((now - state.revealStart) / 1600, 0, 1);
        state.reveal = 1 - Math.pow(1 - progress, 3);
        busy = true;
      }
      var stiffness = 60, damping = 14;
      var steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      var h = dt / steps;
      for (var i = 0; i < steps; i++) {
        state.velocityX += (stiffness * (state.targetX * 0.6 - state.tiltX) - damping * state.velocityX) * h;
        state.velocityY += (stiffness * (state.targetY * 0.6 - state.tiltY) - damping * state.velocityY) * h;
        state.tiltX += state.velocityX * h;
        state.tiltY += state.velocityY * h;
      }
      if (Math.abs(state.targetX * 0.6 - state.tiltX) > 0.0005 || Math.abs(state.targetY * 0.6 - state.tiltY) > 0.0005 ||
          Math.abs(state.velocityX) + Math.abs(state.velocityY) > 0.0005) busy = true;
      draw();
      if (busy && state.visible) state.raf = requestAnimationFrame(frame);
      else state.last = 0;
    }
    function wake() { if (!state.raf && state.alive && state.visible) state.raf = requestAnimationFrame(frame); }
    container.addEventListener('pointermove', function (e) {
      var rect = container.getBoundingClientRect();
      state.targetX = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1.2, 1.2);
      state.targetY = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1.2, 1.2);
      wake();
    });
    container.addEventListener('pointerleave', function () { state.targetX = 0; state.targetY = 0; wake(); });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); draw(); }) : null;
    if (ro) ro.observe(container);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        state.visible = entries.some(function (x) { return x.isIntersecting; });
        if (state.visible) wake();
      }).observe(container);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { state.last = 0; wake(); } });
    new MutationObserver(function () { draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); state.alive = false; cancelAnimationFrame(state.raf); });
    state.pending = true;
    resize(); draw(); wake();
    getShapeData().then(function (data) {
      state.pending = false;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      state.imageAspect = data.width / data.height;
      state.hasImage = true;
      draw(); wake();
    }).catch(function () { state.pending = false; });
    return { wake: wake, redraw: function () { resize(); draw(); wake(); } };
  }

  function initMetallic() {
    document.querySelectorAll('canvas[data-metal]').forEach(function (canvas) {
      createMetallic(canvas);
    });
  }

  /* ============================================================
     tk 粒子重组 · Hero → 标题栏 + 左侧贴墙
     ============================================================ */
  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state += 0x6d2b79f5;
      var value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }
  function smoothstep(a, b, v) { if (a === b) return v < a ? 0 : 1; var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function sampleParticles() {
    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(LOGO_W * 5); canvas.height = Math.ceil(LOGO_H * 5);
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.scale(5, 5); ctx.fillStyle = '#fff'; ctx.fill(new Path2D(LOGO_PATH));
    var width = canvas.width, height = canvas.height;
    var data = ctx.getImageData(0, 0, width, height).data;
    var points = [];
    for (var y = 0; y < height; y += 2) for (var x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 120) points.push({ x: x / 5 / LOGO_W, y: y / 5 / LOGO_H });
    }
    if (!points.length) return [];
    var random = mulberry32(0x9e3779b9);
    for (var i = points.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)); var tmp = points[i]; points[i] = points[j]; points[j] = tmp; }
    return points.slice(0, 560).map(function (point, index) {
      return {
        nx: point.x, ny: point.y, angle: random() * Math.PI * 2,
        scatter: 14 + random() * 44, delay: random() * 0.26,
        size: 0.85 + random() * 1.35, alpha: 0.42 + random() * 0.58,
        drift: (random() - 0.5) * 22, toSide: index % 2 === 0
      };
    });
  }
  function initLogoAssembly() {
    var hero = document.querySelector('[data-logo-hero]');
    var heroPaint = hero && hero.querySelector('.logo-paint');
    var canvas = document.querySelector('[data-logo-canvas]');
    var header = document.querySelector('[data-logo-target="header"]');
    var side = document.querySelector('[data-logo-target="side"]');
    if (!hero || !heroPaint || !canvas) {
      if (header) header.style.opacity = '1';
      return;
    }
    function setHeader(visible) { if (header) header.style.opacity = visible ? '1' : '0'; }
    function setSide(visible) { if (side) side.style.opacity = visible ? '1' : '0'; }
    function rectOf(el) { var r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
    function sideRect() { if (!side) return null; var r = rectOf(side); return r.width >= 1 && r.height >= 1 ? r : null; }
    var MAX_SCROLL = 420;

    if (reduced) {
      var sync = function () {
        var p = clamp(window.scrollY / MAX_SCROLL, 0, 1);
        var top = p <= 0.5;
        heroPaint.style.opacity = top ? '1' : '0';
        setHeader(!top); setSide(!top && Boolean(sideRect()));
      };
      sync();
      window.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      return;
    }
    var particles = sampleParticles();
    var ctx = canvas.getContext('2d');
    if (!particles.length || !ctx) { setHeader(true); return; }
    var heroStart = rectOf(hero);
    var heroRect = { left: heroStart.left, top: heroStart.top + window.scrollY, width: heroStart.width, height: heroStart.height };
    var headerRect = header ? rectOf(header) : null;
    var sideR = sideRect();
    if (!headerRect || headerRect.width < 1) { setHeader(true); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = window.innerWidth, height = window.innerHeight;
    function resizeCanvas() {
      if (window.innerWidth < 2 || window.innerHeight < 2) return;
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1a191d';
    var current = clamp(window.scrollY / MAX_SCROLL, 0, 1);
    var target = current, raf = 0, running = false, lastTime = performance.now();
    function drawMark(rect, alpha) {
      if (alpha <= 0.001) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = ink;
      ctx.translate(rect.left, rect.top);
      var scale = rect.width / LOGO_W;
      ctx.scale(scale, scale); ctx.fill(new Path2D(LOGO_PATH)); ctx.restore();
    }
    function draw(progress) {
      if (width < 2 || height < 2) { heroPaint.style.opacity = '1'; setHeader(true); setSide(false); return; }
      ctx.clearRect(0, 0, width, height);
      heroPaint.style.opacity = String(1 - smoothstep(0, 0.12, progress));
      drawMark(headerRect, smoothstep(0.965, 1, progress));
      if (sideR) drawMark(sideR, smoothstep(0.965, 1, progress));
      if (progress > 0.002 && progress < 0.998) {
        var now = performance.now() / 1000;
        for (var i = 0; i < particles.length; i++) {
          var particle = particles[i];
          var local = easeInOut(clamp((progress - particle.delay) / 0.58, 0, 1));
          var dest = particle.toSide && sideR ? sideR : headerRect;
          var hx = heroRect.left + particle.nx * heroRect.width;
          var hy = heroRect.top + particle.ny * heroRect.height;
          var tx = dest.left + particle.nx * dest.width;
          var ty = dest.top + particle.ny * dest.height;
          var x = hx + (tx - hx) * local;
          var y = hy + (ty - hy) * local;
          var burst = Math.sin(Math.PI * local) * particle.scatter;
          var angle = particle.angle + local * 1.7;
          x += Math.cos(angle) * burst;
          y += Math.sin(angle) * burst + Math.sin(Math.PI * local) * particle.drift;
          x += Math.sin(now * 1.8 + particle.angle) * 0.55 * Math.sin(Math.PI * local);
          y += Math.cos(now * 1.45 + particle.angle) * 0.45 * Math.sin(Math.PI * local);
          var size = particle.size * (1 - 0.48 * local);
          ctx.globalAlpha = particle.alpha * (1 - 0.18 * Math.sin(Math.PI * local));
          ctx.fillStyle = ink;
          ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
      }
      var settled = progress > 0.985;
      setHeader(settled); setSide(settled && Boolean(sideR));
      if (settled) ctx.clearRect(0, 0, width, height);
    }
    function tick(now) {
      var delta = Math.min(64, now - lastTime); lastTime = now;
      target = clamp(window.scrollY / MAX_SCROLL, 0, 1);
      var smoothing = 1 - Math.pow(0.001, delta / 1000);
      current += (target - current) * smoothing;
      if (Math.abs(target - current) < 0.0004) current = target;
      draw(current);
      if (Math.abs(target - current) > 0.0004) raf = requestAnimationFrame(tick);
      else running = false;
    }
    function kick() { if (running) return; running = true; lastTime = performance.now(); raf = requestAnimationFrame(tick); }
    function onScroll() {
      var next = clamp(window.scrollY / MAX_SCROLL, 0, 1);
      if (next >= 0.985) { current = 1; target = 1; draw(1); setHeader(true); setSide(Boolean(sideR)); return; }
      if (next <= 0.002) {
        current = 0; target = 0;
        var nextHero = rectOf(hero);
        heroRect = { left: nextHero.left, top: nextHero.top + window.scrollY, width: nextHero.width, height: nextHero.height };
        draw(0); setHeader(false); setSide(false); return;
      }
      kick();
    }
    function onResize() {
      resizeCanvas();
      headerRect = header ? rectOf(header) : headerRect;
      sideR = sideRect();
      var nextHero = rectOf(hero);
      heroRect = { left: nextHero.left, top: nextHero.top + window.scrollY, width: nextHero.width, height: nextHero.height };
      target = clamp(window.scrollY / MAX_SCROLL, 0, 1); current = target; draw(current);
    }
    var observer = new MutationObserver(function () {
      ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1a191d';
      if (!running) draw(current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    draw(current);
    requestAnimationFrame(function () {
      current = target = clamp(window.scrollY / MAX_SCROLL, 0, 1);
      draw(current);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', function () {
      current = target = clamp(window.scrollY / MAX_SCROLL, 0, 1);
      draw(current);
    });
  }

  /* ============================================================
     BorderGlow · 指针靠近边缘时的一圈墨色光辉
     ============================================================ */
  function initGlow() {
    var selectors = [
      '.chapter-row', '.continue-strip', '.method-media', '.home-about',
      '.glossary-card', '.lesson-list li', '.read-action', '.pn-card',
      '.callout', '.codeblock', '.term-empty', '.catalog-chapter'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function (el) { el.classList.add('glow'); });
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest ? e.target.closest('.glow') : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var dx = x - r.width / 2, dy = y - r.height / 2;
      var kx = dx ? r.width / 2 / Math.abs(dx) : Infinity;
      var ky = dy ? r.height / 2 / Math.abs(dy) : Infinity;
      var edge = Math.min(1, 1 / Math.min(kx, ky));
      var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      el.style.setProperty('--edge', (edge * 100).toFixed(2));
      el.style.setProperty('--angle', angle.toFixed(2) + 'deg');
      el.style.setProperty('--glow-opacity', Math.max(0, (edge * 100 - 68) / 32).toFixed(3));
    }, { passive: true });
  }

  function boot() {
    initFlux();
    initMetallic();
    initLogoAssembly();
    initGlow();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
