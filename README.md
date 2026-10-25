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
3. 配好 GitHub 的两个 secret 后，Actions 每小时自动同步并部署，也可以在 `Actions` 里手动 `Run workflow` 立即发布。

Notion 的图片会在同步时下载到本地，不依赖它一小时就过期的临时链接。标题和现有手写文章一致时，Notion 版本会覆盖手写版本并沿用原 URL。手写 Markdown 和 Notion 文章可以混用，首页、RSS、sitemap 会一起收录。

## 自定义站点

- **标题 / 作者 / 简介**：改 `src/config.ts` 里的 `siteConfig`
- **域名**：部署后改 `astro.config.mjs` 里的 `site`，会影响 RSS 和 sitemap
- **主题色**：改 `src/styles/global.css` 里的 `--accent` 变量
- **首页欢迎语**：改 `src/pages/index.astro`
- **关于页**：改 `src/pages/about.astro`

## 开启评论区（Giscus）

评论区基于 [Giscus](https://giscus.app)，评论数据存在 GitHub Discussions 里，免费、无广告、无需自己搭服务器。配置一次即可：

1. **创建一个公开的 GitHub 仓库**，用来存放博客代码（之后部署也会用到）。没有的话先注册 GitHub。
2. 在该仓库的 **Settings → General** 里勾选 **Discussions** 启用它。
3. 打开 [giscus.app](https://giscus.app)，按页面提示填入仓库地址，选择分类（一般选 `Announcements`）。
4. 页面底部会生成一段配置代码，从里面复制这几个值：
   - `data-repo` → 填到 `src/config.ts` 的 `giscus.repo`
   - `data-repo-id` → `giscus.repoId`
   - `data-category-id` → `giscus.categoryId`
5. 保存后刷新页面，文章底部就会出现评论区。

> 不配置的话，评论区会显示一行提示，不影响其他功能。

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
