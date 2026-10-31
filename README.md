# 我的博客

基于 [Astro](https://astro.build) 的个人博客，默认深色主题，带明暗切换、Giscus 评论区、RSS。

## 快速开始

```sh
npm install        # 安装依赖
npm run dev        # 本地开发，浏览器打开 http://localhost:4321
npm run build      # 构建到 ./dist
npm run preview    # 本地预览构建产物
```

## 写文章

在 `src/content/blog/` 里新建 `.md` 文件即可，例如 `my-first-post.md`：

```md
---
title: '文章标题'
description: '一句话简介'
pubDate: 2026-08-02
tags: ['标签1', '标签2']
draft: false
---

正文用 Markdown 写。
```

- `draft: true` 的文章不会出现在站点上
- `pubDate` 决定列表排序，写当天日期即可
- 代码块会自动语法高亮

## 用 Notion 写文章（可选）

如果你习惯在 Notion 里写作，可以让博客直接读 Notion 的页面树，不用手动导出：

1. 按 [NOTION.md](./NOTION.md) 创建 integration、把 **RL 页面**授权给它、在 `.env` 里填 token 和 `NOTION_ROOT_PAGE_ID`；
2. 在 RL 下面新建子页面（任意层级）就是一篇新文章；本地跑 `npm run sync` 会写进 `src/content/notion/`；
3. 配好 GitHub 的两个 secret 后，Actions 每 6 小时自动同步并部署，也可以在 `Actions` 里手动 `Run workflow` 立即发布。

Notion 的图片会在同步时下载到本地，不依赖它一小时就过期的临时链接。标题和现有手写文章一致时，Notion 版本会覆盖手写版本并沿用原 URL。手写 Markdown 和 Notion 文章可以混用，首页、RSS、sitemap 会一起收录。所有标签汇总在 `/tags/`，文章页的标签可以直接点。

## 自定义站点

- **标题 / 作者 / 简介**：改 `src/config.ts` 里的 `siteConfig`
- **域名**：部署后改 `astro.config.mjs` 里的 `site`，会影响 RSS 和 sitemap
- **主题色**：改 `src/styles/global.css` 里的 `--accent` 变量
- **首页欢迎语**：改 `src/pages/index.astro`
- **关于页**：改 `src/pages/about.astro`

## 评论区（Giscus）

评论区基于 [Giscus](https://giscus.app)，评论数据存在 GitHub Discussions 里，免费、无广告、无需自己搭服务器。

仓库 `selfattn/blog` 已经启用 Discussions，`src/config.ts` 里也填好了 `repo` / `repoId` / `categoryId`。只剩一步：

1. 打开 <https://github.com/apps/giscus/installations/new>；
2. 选择 `selfattn/blog` 仓库安装；
3. 刷新文章页，底部就会出现评论区。

评论会写进仓库的 **Discussions → Announcements** 分类，按页面路径映射，同一篇文章对应同一个讨论。

## 搜索（Pagefind）

搜索用 [Pagefind](https://pagefind.app)，纯静态、构建时生成索引，不需要额外服务：

- 页面：`/search/`，页头有放大镜入口；
- 索引在 `npm run build` 时自动生成到 `dist/pagefind/`；
- 只索引文章正文（`<main data-pagefind-body>`），标签页和搜索页不参与；
- 中文没有 stemming，但关键词搜索正常；结果 URL 会自动带 `/blog/` 前缀。

本地验证：

```sh
npm run build
npm run preview
# 打开 http://localhost:4321/blog/search/
```

## 部署（GitHub Pages）

博客已配置为部署到 **GitHub Pages 项目站点**，网址为 `https://selfattn.github.io/blog/`（仓库名为 `blog`，`astro.config.mjs` 已设好 `site` 和 `base`）。

工作流 `.github/workflows/deploy.yml` 会在每次推送到 `main` 分支时自动构建并发布。首次部署后：

1. 在仓库 **Settings → Pages**，把 Source 选为 **GitHub Actions**
2. 跑一次工作流（推送即可触发，或手动 `Actions` 里 Run workflow）
3. 打开 `https://selfattn.github.io/blog/` 确认站点上线

> 部署到别的平台（Vercel / Netlify）也可以，只需删掉 `base: '/blog/'` 并把 `site` 改回根域名。

## 目录结构

```text
/
├── public/               # 静态资源（favicon 等）；notion/ 是同步生成的图片
├── scripts/
│   └── sync-notion.mjs   # Notion → Markdown 同步脚本
├── src/
│   ├── components/       # Header、Footer、主题切换、评论区等组件
│   ├── content/
│   │   ├── blog/         # 手写文章（Markdown）
│   │   └── notion/       # 从 Notion 同步的文章（生成，勿手改）
│   ├── layouts/          # 页面布局
│   ├── pages/            # 页面路由
│   ├── config.ts         # 站点配置
│   ├── content.config.ts # 内容集合 schema
│   ├── styles/           # 全局样式与主题变量
│   ├── types.ts          # 文章类型
│   └── utils.ts          # 日期、阅读时长等工具函数
├── astro.config.mjs      # Astro 配置
└── NOTION.md             # Notion 同步配置说明
```
