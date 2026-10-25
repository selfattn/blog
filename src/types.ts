import type { CollectionEntry } from 'astro:content';

/**
 * 博客文章有两个来源：
 * - blog：手写在 src/content/blog/*.md
 * - notion：由 `npm run sync` 从 Notion 同步到 src/content/notion/*.md
 *
 * 两个集合共用同一套 frontmatter schema，所以页面上可以当成同一种文章处理。
 */
export type PostEntry = CollectionEntry<'blog'> | CollectionEntry<'notion'>;
