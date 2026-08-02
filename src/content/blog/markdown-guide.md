---
title: 'Markdown 排版示例'
description: '用一篇文章展示标题、列表、引用、代码块等常见排版元素的效果。'
pubDate: 2026-08-01
tags: ['Markdown', '示例']
draft: false
---

这篇文章用来展示博客的排版效果。Markdown 写起来很舒服，渲染出来也干净。

## 二级标题

正文段落。保持段落之间空一行，阅读体验会更好。链接可以这样写：[Astro 官方文档](https://docs.astro.build)。

### 三级标题

可以用列表整理要点：

1. 有序列表第一项
2. 有序列表第二项
3. 有序列表第三项

- 无序列表项 A
- 无序列表项 B
  - 嵌套项

## 引用

> 学习不在一时，而在持之以恒。
> —— 编程界的某位前辈

## 代码与行内代码

调用函数：`formatDate(new Date())`。

```js
// 一个简单的时间格式化函数
function formatDate(date) {
  return date.toLocaleDateString('zh-CN');
}
```

## 表格

| 语言 | 难度 | 用途 |
| ---- | ---- | ---- |
| TypeScript | 中等 | 前端、后端、全栈 |
| Python | 简单 | 数据、脚本、AI |
| Rust | 较难 | 系统级、高性能 |

## 分割线

---

以上就是常用的排版元素。删除这篇示例，或者在 `src/content/blog/` 里添加你自己的文章吧。
