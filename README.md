# Ricky Jin — Personal Site

个人展示网站源码。为美本申请准备的个人品牌站，面向招生官。

- 线上地址：https://ricky-jin.app.workbuddy.host/
- 技术栈：纯静态 HTML / CSS / 原生 JS，无构建步骤
- 内容存储：云数据库（`site_text` / `site_media`），编辑后即时生效，不需要重新部署

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
        ├── app.js         导航、滚动动效、lightbox
        ├── content.js     本地内容基线（云端数据覆盖其上）
        ├── cloud-config.js 云端 endpoint 与 publishable key
        └── editor.js      内联编辑系统
```

## 本地预览

```bash
python -m http.server 8000
# 打开 http://127.0.0.1:8000
```

本地只能看，**不能编辑**——编辑受云端域名校验，必须在正式链接上做。

## 改内容（文案、照片）

打开线上链接加 `?edit=1`，邮箱验证码登录，点虚线框改字、点占位图传照片。改完即时生效。

## 改结构 / 样式 / 代码

改这份源码，然后由站点维护者重新发布。发布时必须复用同一个应用 ID，否则域名和登录体系会断。

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
- 图片区是固定宽高比 + `object-fit: cover`，上传任意比例的照片都不会撑坏排版
- 站内含云端 publishable key，这是设计上可公开的字段，不要当作密钥
