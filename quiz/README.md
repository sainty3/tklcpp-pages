# tklcpp test · LearnCPP 中文题库

从 [learncpp.com](https://www.learncpp.com/) 抓取全部课时的 **课后习题（Quiz time）** 与 **章节小测（Chapter summary and quiz）**，机器翻译为中文，并做成可完全离线使用的练习站。

前端按 **Negotiation Arena `design.md` v1.7** 重新设计：暖白纸面、近黑文字、极细边框、小字号与行式组件；英文使用自托管的 **Anthropic Serif**，数字与代码使用 **Anthropic Mono**。品牌标记是设计规范中的 **tk 连字**（几何来自 `src/components/ui/logo.ts`），滚动时 Hero 标记会溶解为粒子，并重组到标题栏标记（宽屏下同时重组到左侧贴墙标记）。全页背景是同一套 **FluxLines** WebGL2 流体 ink 场，颜色、透明度与鼠标磁吸/点击漩涡参数均取自 `FluxBackdrop.tsx`。

## 使用方法

**方式一：直接双击打开**

双击 `index.html`，用 Chrome / Edge / Firefox 打开即可。无需联网、无需安装任何东西。字体已以 base64 内嵌在 HTML 中，`file://` 协议下也能正常显示。

**方式二：本地服务器（推荐）**

在本目录执行：

```bash
py -m http.server 8713
```

然后访问 <http://localhost:8713>。

> `data.js` 通过 `<script>` 引入，因此直接双击 `index.html` 也能加载题库，不需要服务器。

## 功能

- 按章节 / 课时浏览全部习题，共 **300 题**（覆盖 28 个有习题的章节、126 个课时）
- 每题含**答案**，部分题目含**提示**，点击展开
- 中文 / 双语 / 英文三种显示模式，随时切换对照原文
- 代码块完整保留并做 C++ 语法高亮（等宽 Anthropic Mono，代码不会被翻译）
- 「标记完成」记录进度，按章节 / 全站统计完成率（保存在浏览器 localStorage）
- 全部 / 未做 / 已做 / 编程题 筛选
- 全文搜索（`Ctrl+K`），搜索结果可直接跳到对应题目
- 随机一题（优先抽未做的题）
- 总览页：继续练习、总进度、章节索引
- 深色模式跟随系统并可手动切换；移动端抽屉式目录
- 尊重 `prefers-reduced-motion`：粒子与流体背景退化为静态状态

## 目录结构

```
quiz-site/
├── index.html     # 单页应用（设计 token + 布局 + 交互 + 内嵌字体）
├── data.js        # 题库数据（中文译文 + 英文原文）
├── fonts/         # Anthropic 字体源文件（页面实际使用内嵌副本，可留作备用）
└── README.md
```

## 设计说明

- 设计规范：仓库根目录 `../../design.md`（Negotiation Arena v1.7）
- 品牌标记：`tk` 连字路径与 `src/components/ui/logo.ts` 完全一致；粒子采样、双目标重组、滚动阈值与 reduced-motion 行为移植自 `LogoAssembly.tsx`
- 背景：FluxLines 着色器与参数移植自 `src/components/ui/FluxLines.jsx` / `FluxBackdrop.tsx`
- 标记在 Hero 与贴墙位置使用规范允许的 ink 回退形态（单文件离线版本不加载 MetallicPaint 的 WebGL 贴图层）；标题栏标记保持静态 ink
- 字体文件来自 `public/fonts/`，构建时以 base64 写入 `index.html`；重新嵌入可运行 `../scripts/embed_fonts.py`

## 数据说明

- 题目与答案原文版权归 [learncpp.com](https://www.learncpp.com/) 作者 Alex 所有，本版本仅供**个人学习使用**，请勿公开分发。
- 中文由 Google 翻译机器翻译，专业术语做了少量人工校正（如 operator→运算符、member→成员）。译文仅供参考，遇到疑问请切换「英文」对照原文。
- 抓取时间：2026-11-05。共 356 个课时页面，其中 126 个课时含习题（兼容 learncpp 的三种历史排版格式）。

## 重新生成（可选）

项目根目录 `../scripts/` 下是完整流水线：

```
step1_parse_toc.py       解析课程目录
step2_fetch_all.py       抓取全部课时页面（限速、断点续爬）
step3_extract_quizzes.py 提取习题与答案
step4_translate.py       翻译（带缓存、断点续跑）
step5_build_site.py      打包生成 quiz-site/data.js
embed_fonts.py           把 Anthropic 字体内嵌进 index.html
```

依赖：Python 3（仅标准库，无需 pip 安装）。
