# Ricky Jin — Personal Site

个人展示网站源码。为美本申请准备的个人品牌站，面向招生官。

- 线上地址：https://chrisjin2010.github.io/ricky-jin-site/
- 技术栈：纯静态 HTML / CSS / 原生 JS，无构建步骤
- 内容存储：文案与照片直接写在 HTML 源码里，随仓库一起部署

## 目录

```
.
├── index.html          首页
├── research.html       科研（3 个项目）
├── theater.html        戏剧（9 场演出 + 1 张排练花絮）
├── service.html        公益（西山支教 + 医院志愿）
├── athletics.html      体育（足球队为主）
└── assets/
    ├── css/main.css    全部样式，设计变量在文件顶部
    └── js/
        └── app.js      导航、滚动动效、lightbox
```

## 本地预览

```bash
python -m http.server 8000
# 打开 http://127.0.0.1:8000
```

## 改内容 / 结构 / 样式

直接修改这份源码（文案和照片写在 HTML 里，照片文件放 `assets/img/`），push 到 GitHub `main` 分支后，GitHub Pages 约 1 分钟内自动部署上线。

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
