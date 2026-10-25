import { readdirSync } from 'node:fs';
import path from 'node:path';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { PostEntry } from './types';

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function readingTime(body: string | undefined): string {
  const cjk = (body?.match(/[一-鿿]/g) || []).length;
  const words = (body?.match(/[a-zA-Z0-9_]+/g) || []).length;
  const minutes = Math.max(1, Math.ceil(cjk / 350 + words / 200));
  return `${minutes} 分钟`;
}

/** 合并手写文章与 Notion 同步文章，过滤草稿并按日期倒序。 */
export async function getPosts(): Promise<PostEntry[]> {
  const [blog, notion] = await Promise.all([
    getCollection('blog'),
    // 目录为空时不要调用 getCollection，否则 Astro 会打印 collection 为空的警告
    hasNotionContent()
      ? getCollection('notion')
      : Promise.resolve([] as CollectionEntry<'notion'>[]),
  ]);

  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const posts: PostEntry[] = [];
  const normalizeTitle = (value: string) =>
    value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

  // notion 在前：同名文章用 Notion 版本覆盖手写 Markdown
  for (const post of [...notion, ...blog]) {
    if (post.data.draft) continue;

    const titleKey = normalizeTitle(post.data.title);
    if (seenIds.has(post.id) || seenTitles.has(titleKey)) continue;

    seenIds.add(post.id);
    seenTitles.add(titleKey);
    posts.push(post);
  }

  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

function hasNotionContent(): boolean {
  try {
    return readdirSync(path.join(process.cwd(), 'src', 'content', 'notion')).some((name) =>
      name.endsWith('.md'),
    );
  } catch {
    return false;
  }
}
