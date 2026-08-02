---
title: '你好，Astro！'
description: '这是第一篇文章，介绍一下这个博客是怎么搭起来的。'
pubDate: 2026-08-02
tags: ['Astro', '入门']
---

欢迎来到我的博客！这是本站的第一篇文章。

## 为什么选 Astro

Astro 是一个专注于**内容型网站**的框架，它的特点很对我胃口：

- **默认零 JS**：页面构建成纯静态 HTML，加载速度很快
- **内容集合（Content Collections）**：用 Markdown 写文章，配合 TypeScript 做校验
- **内置语法高亮**：开箱即用的 Shiki，不需要额外配置

> 对于「写文章」这件事来说，Astro 把体验做得非常纯粹：写 Markdown，其余交给框架。

## 一个代码示例

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('Astro'));
```

## 常见 Markdown 语法

- **粗体** 与 *斜体*
- [外部链接](https://astro.build)
- `行内代码`

| 功能 | 说明 |
| ---- | ---- |
| 暗色主题 | 默认开启，可切换 |
| 评论区 | 基于 Giscus |
| RSS | 已内置 |

写文章很简单：在 `src/content/blog/` 里新建一个 `.md` 文件即可，顶部写上标题和日期等元信息就行。
