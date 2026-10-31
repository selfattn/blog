import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  // 仅 Notion 同步的文章会带这个字段，方便识别与排查
  notionId: z.string().optional(),
  // 阅读路径：阶段 id + 阶段内顺序（可选）
  pathStage: z.string().optional(),
  pathOrder: z.number().optional(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: postSchema,
});

// 由 scripts/sync-notion.mjs 生成，不要手动编辑
const notion = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notion' }),
  schema: postSchema,
});

export const collections = { blog, notion };
