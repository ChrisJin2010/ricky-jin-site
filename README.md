# Ricky Jin — Personal Site

个人展示网站源码。为美本申请准备的个人品牌站，面向招生官。

- 线上地址：https://chrisjin2010.github.io/ricky-jin-site/
- 技术栈：纯静态 HTML / CSS / 原生 JS，无构建步骤
- 内容存储：文字写在 HTML 源码里；用编辑器改过的内容存进 `content.json`，页面加载时覆盖显示

## 目录

```
.
├── index.html          首页
├── research.html       科研（3 个项目）
├── theater.html        戏剧（9 场演出 + 1 张排练花絮）
├── service.html        公益（西山支教 + 医院志愿）
├── athletics.html      体育（足球队为主）
├── editor.html         内容编辑器（浏览器里自助改字、传照片）
├── content.json        编辑器保存的内容（文字 + 图片路径）
└── assets/
    ├── css/main.css    全部样式，设计变量在文件顶部
    ├── img/            编辑器上传的照片
    └── js/
        ├── app.js      导航、滚动动效、lightbox
        └── overlay.js   读取 content.json，运行时覆盖页面文字/图片
```

## 本地预览

```bash
python -m http.server 8000
# 打开 http://127.0.0.1:8000
```

## 改内容（推荐：编辑模式，页面上直接点着改，不用碰代码）

1. 打开入口页（双击本地 `editor.html` 或访问 https://chrisjin2010.github.io/ricky-jin-site/editor.html ），点要编辑的页面按钮
2. 也可以直接在任意页面网址后加 `?edit=1` 回车，进入编辑模式（需 Chrome/Edge）
3. 页面上**点文字直接改、点图位上传照片**（悬停图位有「换图 / 移除」按钮）；改过即时可见，但不会丢——底部黑条点「保存改动」
4. 第一次保存时会要求选择电脑上的 `ricky-jin-site` 文件夹（授权一次，以后自动记住）；保存把改动写进该文件夹
5. 打开 **GitHub Desktop → Commit to main → Push origin**，约 1–2 分钟后线上生效（查看时 Ctrl+F5 强刷）

原理：编辑模式由 `assets/js/edit.js` 提供；保存把文字与图片路径写进 `content.json`、照片存到 `assets/img/`；五个页面通过 `overlay.js` 在运行时读取 `content.json` 覆盖显示。**注意：一旦某字段在编辑器里改过，线上以 `content.json` 为准**，再手改 HTML 里对应的占位文字不会生效（需同时在 `content.json` 里改）。

## 改结构 / 样式

直接修改这份源码，push 到 GitHub `main` 分支后，GitHub Pages 约 1 分钟内自动部署上线。

## 设计系统

| 项 | 值 |
|---|---|
| 深色底 | `#0E1420` / `#1B2A44` |
| 浅色底 | `#F6F3EE` |
| 强调色 | `#B4813F`（全站唯一强调色） |
| 标题字体 | Playfair Display（回退 Georgia / 宋体） |
| 正文字体 | Inter（回退苹方 / 微软雅黑） |

改 `assets/css/main.css` 顶部的变量，五个页面同步生效。

## 注意

- 所有文案目前是英文占位，方括号 `[...]` 是留给真实内容的位置
- 图片区是固定宽高比 + `object-fit: cover`，放任意比例的照片都不会撑坏排版
