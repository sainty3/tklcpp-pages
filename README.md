# tklcpp

一份安静、完整、可离线使用的 **现代 C++ 中文课程**，以及配套的 **课后习题库**。

- 课程：359 节、35 章、287 个术语，254 节已汉化，105 节保留英文原文
- 习题：300 道课后习题与章节小测，覆盖 28 章、126 个课时，含答案与提示
- 功能：全文搜索、深色模式、四档阅读字号、本地阅读进度、代码复制、图片放大、中英对照做题
- 设计：Negotiation Arena v1.7 —— tk 连字标记与滚动粒子重组、FluxLines ink 背景、Anthropic Serif / Mono
- 完全静态：无广告、无跟踪、无后端，所有字体、图片、脚本都在本地

在线地址：<https://sainty3.github.io/tklcpp-pages/>

## 目录

```
index.html            课程首页
c00/ … c35/           各章目录与课程页
glossary/             词汇表与词条页
catalog.html          完整课程目录
app/                  内容地图与翻译说明
quiz/                 习题库（tklcpp test）
assets/               样式、脚本、字体、图片、搜索索引
```

课程页之间的链接均为相对路径；整个文件夹可以原样放在任意子目录下，也可以直接双击 `index.html` 打开。

## 本地使用

```bash
python -m http.server 8080
```

访问 <http://localhost:8080>；或在本目录运行：

```bash
node serve.js
```

## 部署

- 私有主仓库（构建产物）：<https://github.com/sainty3/tklcpp>（私有）
- 公开部署镜像：<https://github.com/sainty3/tklcpp-pages>（仅含构建产物，用于 GitHub Pages）
- 页面通过 GitHub Pages 从部署镜像的 `main` 分支根目录发布

站点添加了 `noindex` 与 `robots.txt`，不会进入搜索引擎索引。页面 URL 本身是公开可访问的，请不要在此放置私密内容。

## 内容说明

- 课程原文：<https://www.learncpp.com/> · 作者 Alex
- 中文翻译：<https://github.com/hanxiaomax/Learncpp_CN>
- 习题抓取自 learncpp.com 的课后习题与章节小测，由机器翻译并做少量术语校正
- 内容版权归原作者与译者所有，本站仅用于个人学习与离线阅读，请勿再分发
