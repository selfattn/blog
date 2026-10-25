import type { PostEntry } from '../types';

/** 把标签转换成 URL 片段：保留中英文，空格换连字符，去掉标点。 */
export function tagSlug(tag: string): string {
  const slug = tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'tag';
}

export interface TagInfo {
  tag: string;
  slug: string;
  count: number;
}

export function collectTags(posts: PostEntry[]): TagInfo[] {
  const map = new Map<string, TagInfo>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const existing = map.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(slug, { tag, slug, count: 1 });
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'),
  );
}

export function postsWithTag(posts: PostEntry[], slug: string): PostEntry[] {
  return posts.filter((post) => post.data.tags.some((tag) => tagSlug(tag) === slug));
}
