#!/usr/bin/env node
/**
 * 把 Notion 数据库里「已发布」的文章同步成 Astro 内容文件。
 *
 * 用法：
 *   npm run sync
 *
 * 环境变量（可写在项目根目录的 .env，已被 git 忽略）：
 *   NOTION_TOKEN         Notion integration 的 token
 *   NOTION_DATABASE_ID   博客数据库页面的 32 位 ID
 *
 * 产物：
 *   src/content/notion/*.md   文章（每次同步会整体重建，不要手改）
 *   public/notion/<slug>/*    从 Notion 下载的图片
 *
 * 设计要点：
 * - 先完整抓取，再删除旧文件；抓取失败不会把现有站点清空。
 * - Notion 图片地址 1 小时后过期，所以同步时立刻下载到本地。
 * - 只读取，不写回 Notion。
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'notion');
const IMAGE_DIR = path.join(ROOT, 'public', 'notion');
const DEFAULT_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';
const FALLBACK_DATABASE_ID = '744ac9a9f88b829d80740117f314e8f1';
const PUBLISHED = new Set(['published', 'publish', '已发布', '发布']);
// NotionNext 模板自带的示例文章：example-1 ... example-10、guide
const TEMPLATE_DEMO_SLUG = /^(?:example-\d+|guide)$/i;
// 只在排查问题时用：NOTION_INCLUDE_DEMOS=1 会连模板示例一起同步
const INCLUDE_DEMOS = process.env.NOTION_INCLUDE_DEMOS === '1';
// 只列清单、不写文件：npm run sync -- --list
const LIST_ONLY = process.argv.includes('--list');

let TOKEN = '';
let BASE = '/';
let API_BASE = DEFAULT_API_BASE;
let EXCLUDE_SLUGS = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 读取 .env（不覆盖已有环境变量）。 */
async function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!existsSync(file)) return;

  const raw = await readFile(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const key = match[1];
    if (process.env[key] !== undefined) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/** 从 astro.config.mjs 读取 base，图片路径要用它。 */
async function readBasePath() {
  try {
    const config = await readFile(path.join(ROOT, 'astro.config.mjs'), 'utf8');
    const match = config.match(/base:\s*['"]([^'"]*)['"]/);
    if (!match) return '/';

    let base = match[1].trim();
    if (!base.startsWith('/')) base = `/${base}`;
    if (!base.endsWith('/')) base = `${base}/`;
    return base;
  } catch {
    return '/';
  }
}

async function notion(pathname, { method = 'GET', body } = {}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${API_BASE}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 429 || response.status === 529 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after')) || 2 ** attempt;
      console.warn(`  · Notion 返回 ${response.status}，${retryAfter}s 后重试`);
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`${method} ${pathname} → ${response.status}\n${detail}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  throw new Error(`${method} ${pathname} → 重试次数用尽`);
}

/** 兼容两种数据库：独立数据库，或页面里嵌了一个数据库。 */
async function resolveDatabase(databaseId) {
  try {
    const database = await notion(`/databases/${databaseId}`);
    const dataSource = Array.isArray(database.data_sources) ? database.data_sources[0] : null;
    if (dataSource?.id) {
      return { databaseId, dataSourceId: dataSource.id };
    }
    return { databaseId, dataSourceId: null };
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  let children;
  try {
    children = await notion(`/blocks/${databaseId}/children?page_size=100`);
  } catch (error) {
    throw new Error(
      '找不到数据库：请确认 NOTION_DATABASE_ID 正确，并且在 Notion 里把数据库页面连接给 integration' +
        `（页面右上角 ··· → 连接 / Connections）。原始错误：${error.message.split('\n')[0]}`,
    );
  }
  const databaseBlock = children.results.find((block) => block.type === 'child_database');
  if (databaseBlock) {
    return { databaseId: databaseBlock.id, dataSourceId: null };
  }

  throw new Error(
    '找不到数据库。请确认 NOTION_DATABASE_ID 是博客数据库页面的 ID，' +
      '并且已在 Notion 页面右上角 ··· → 连接 里把页面授权给 integration。',
  );
}

async function queryPages({ databaseId, dataSourceId }) {
  const pages = [];
  let cursor;

  do {
    const body = {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    };
    const result = dataSourceId
      ? await notion(`/data_sources/${dataSourceId}/query`, { method: 'POST', body })
      : await notion(`/databases/${databaseId}/query`, { method: 'POST', body });

    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function findProperty(properties, names) {
  for (const [name, property] of Object.entries(properties)) {
    if (names.some((candidate) => candidate.toLowerCase() === name.toLowerCase())) {
      return property;
    }
  }
  return undefined;
}

function propertyText(property) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return (property.title || []).map((item) => item.plain_text).join('');
    case 'rich_text':
      return (property.rich_text || []).map((item) => item.plain_text).join('');
    case 'select':
      return property.select?.name || '';
    case 'status':
      return property.status?.name || '';
    case 'multi_select':
      return (property.multi_select || []).map((item) => item.name).join(', ');
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'number':
      return property.number === null ? '' : String(property.number);
    default:
      return '';
  }
}

function toSlug(raw, fallback) {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned || fallback;
}

function quote(value) {
  return JSON.stringify(String(value));
}

function summarize(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}

/** 去掉一层公共缩进（Notion 的 synced_block / callout 内部会多一层 tab）。 */
function dedent(text) {
  const lines = text
    .replace(/\t/g, '    ')
    .replace(/^\n+|\n+$/g, '')
    .split('\n');

  const indents = lines
    .filter((line) => line.trim())
    .map((line) => (line.match(/^ */) || [''])[0].length);

  if (indents.length === 0) return '';

  const min = Math.min(...indents);
  return lines
    .map((line) => line.slice(Math.min(min, (line.match(/^ */) || [''])[0].length)))
    .join('\n');
}

/** 在 HTML 块和紧随其后的 Markdown 之间补空行，否则 Markdown 会被当成 HTML 文本。 */
function separateBlocks(text) {
  const lines = text.split('\n');
  const result = [];
  const markdownStart = /^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\||!\[|```)/;
  const htmlLine = /^\s*<\/?[a-z][^>]*>\s*$/i;

  for (const line of lines) {
    if (markdownStart.test(line) && result.length > 0 && htmlLine.test(result[result.length - 1])) {
      result.push('');
    }
    result.push(line);
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Notion 的 Markdown 会输出一些自定义标签：
 * - <synced_block>：同步块，内部 Markdown 被多缩进一层，直接渲染会变成代码块
 * - <callout>：高亮块，浏览器不认识，会丢掉图标和底色
 * - <columns>/<column>：分栏，直接输出会导致内部 Markdown 不渲染
 * 这里把它们展开成标准 Markdown。
 */
function normalizeMarkdown(markdown) {
  let output = markdown;

  output = output.replace(
    /<synced_block\b[^>]*>\s*\n?([\s\S]*?)\n?<\/synced_block>/g,
    (_, inner) => `\n\n${dedent(inner)}\n\n`,
  );

  output = output.replace(
    /<callout\b([^>]*)>\s*\n?([\s\S]*?)\n?<\/callout>/g,
    (_, attributes, inner) => {
      const icon = /icon="([^"]*)"/.exec(attributes)?.[1] || '💡';
      const lines = dedent(inner).split('\n');
      const quote = lines
        .map((line, index) => `> ${index === 0 ? `${icon} ` : ''}${line}`)
        .join('\n');
      return `\n\n${quote}\n\n`;
    },
  );

  output = output.replace(
    /<columns\b[^>]*>\s*\n?([\s\S]*?)\n?<\/columns>/g,
    (_, inner) => `\n\n${dedent(inner)}\n\n`,
  );

  output = output.replace(
    /<column\b[^>]*>\s*\n?([\s\S]*?)\n?<\/column>/g,
    (_, inner) => `\n\n${dedent(inner)}\n\n`,
  );

  // 折叠块：展开成「加粗标题 + 正文」，否则 HTML 里的 Markdown 不会渲染
  output = output.replace(
    /<details\b[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)\s*<\/details>/g,
    (_, summary, inner) => {
      const title = summary.replace(/<[^>]+>/g, '').trim();
      return `\n\n**${title}**\n\n${dedent(inner)}\n\n`;
    },
  );

  // 子页面链接：正文里只是引用，转成加粗标题，避免链回 Notion 私有页面
  output = output.replace(
    /<page\b[^>]*>([\s\S]*?)<\/page>/g,
    (_, label) => `**${label.trim()}**`,
  );

  // Notion 的行内公式是 $`x`$，转成标准 $x$
  output = output.replace(/\$`([^`\n]+)`\$/g, (_, expression) => `$${expression}$`);

  // 颜色标记会漏成正文，直接去掉；span 只是包裹，保留内容
  output = output
    .replace(/\s*\{color="[^"]*"\}/g, '')
    .replace(/<span\b[^>]*>([\s\S]*?)<\/span>/g, '$1');

  // 清掉 Notion 私有标签，避免把一小时过期的附件地址带进页面
  output = output
    .replace(/<empty-block\b[^>]*\/?>/g, '')
    .replace(/<database\b[^>]*>([\s\S]*?)<\/database>/g, '$1')
    .replace(/<pdf\b[^>]*>([\s\S]*?)<\/pdf>/g, (_, label) =>
      label.trim() ? `PDF：${label.trim()}` : '',
    )
    .replace(/<file\b[^>]*>([\s\S]*?)<\/file>/g, (_, label) =>
      label.trim() ? `附件：${label.trim()}` : '',
    )
    .replace(/<embed\b[^>]*\/?>/g, '（嵌入内容）')
    .replace(/<span\s+color="[^"]*">/g, '<span>');

  return separateBlocks(output).trim();
}

function imageExtension(contentType, url) {  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  const header = (contentType || '').split(';')[0].trim().toLowerCase();
  if (map[header]) return map[header];

  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (match) return match[1].toLowerCase();
  } catch {
    /* 忽略非法 URL */
  }
  return 'png';
}

/** 下载正文图片并替换成站内地址。失败时保留原链接，不让整篇同步失败。 */
async function localizeImages(markdown, slug) {
  const urls = new Set();

  for (const match of markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    urls.add(match[1]);
  }
  for (const match of markdown.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g)) {
    urls.add(match[1]);
  }

  let output = markdown;
  let downloaded = 0;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = imageExtension(response.headers.get('content-type'), url);
      const name = `${createHash('sha1').update(url).digest('hex').slice(0, 12)}.${extension}`;
      const folder = path.join(IMAGE_DIR, slug);

      await mkdir(folder, { recursive: true });
      await writeFile(path.join(folder, name), buffer);

      const publicUrl = `${BASE}notion/${encodeURIComponent(slug)}/${name}`;
      output = output.split(url).join(publicUrl);
      downloaded += 1;
    } catch (error) {
      console.warn(`  ! 图片下载失败，保留原链接：${url}（${error.message}）`);
    }
  }

  return { markdown: output, downloaded };
}

function readMetadata(page) {
  const properties = page.properties || {};

  const typeProperty = findProperty(properties, ['type', '类型']);
  const type = propertyText(typeProperty).trim().toLowerCase();
  if (type && type !== 'post') return null;

  const statusProperty = findProperty(properties, ['status', '状态']);
  const status = propertyText(statusProperty).trim().toLowerCase();
  // 有 status 列时，只接受已发布；空值按草稿处理
  if (statusProperty && !PUBLISHED.has(status)) return null;

  const titleProperty = Object.values(properties).find((item) => item.type === 'title');
  const title = propertyText(titleProperty).trim();
  // 没有标题的已发布行通常是模板残留，跳过
  if (!title) return null;

  const passwordProperty = findProperty(properties, ['password', '密码']);
  const hasPassword = Boolean(propertyText(passwordProperty).trim());

  const dateProperty = findProperty(properties, ['date', '日期', '发布日期', 'published']);
  const rawDate =
    dateProperty?.type === 'date' && dateProperty.date?.start
      ? dateProperty.date.start
      : page.created_time;
  const pubDate = new Date(rawDate);
  if (Number.isNaN(pubDate.valueOf())) return null;

  const summaryProperty = findProperty(properties, ['summary', 'description', '摘要', '简介']);
  const description = propertyText(summaryProperty).trim();

  const tagsProperty = findProperty(properties, ['tags', 'tag', '标签']);
  let tags = [];
  if (tagsProperty?.type === 'multi_select') {
    tags = tagsProperty.multi_select.map((item) => item.name).filter(Boolean);
  } else if (tagsProperty) {
    tags = propertyText(tagsProperty)
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const slugProperty = findProperty(properties, ['slug', 'url', '路径']);
  const rawSlug = propertyText(slugProperty).trim();

  return {
    id: page.id,
    title,
    description,
    pubDate,
    tags,
    slug: toSlug(rawSlug, page.id),
    updated: page.last_edited_time ? new Date(page.last_edited_time) : undefined,
    hasPassword,
  };
}

async function clearGenerated() {
  await mkdir(CONTENT_DIR, { recursive: true });
  for (const file of await readdir(CONTENT_DIR)) {
    if (file.endsWith('.md')) {
      await rm(path.join(CONTENT_DIR, file), { force: true });
    }
  }

  await rm(IMAGE_DIR, { recursive: true, force: true });
  await mkdir(IMAGE_DIR, { recursive: true });
}

/** 标题归一化：忽略空格、标点和大小写，用来识别「同一篇文章」。 */
function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

/** 读取 src/content/blog 里已有手写文章的元数据，按归一化标题索引。 */
async function readExistingPosts() {
  const dir = path.join(ROOT, 'src', 'content', 'blog');
  const posts = new Map();

  let files = [];
  try {
    files = await readdir(dir);
  } catch {
    return posts;
  }

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const text = await readFile(path.join(dir, file), 'utf8');
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!frontmatter) continue;

    const read = (key) => {
      const match = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter[1]);
      return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
    };

    const title = read('title');
    if (!title) continue;

    const tagsSource = /^tags:\s*\[(.*)\]\s*$/m.exec(frontmatter[1])?.[1] || '';
    const tags = [...tagsSource.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
    const pubDate = new Date(read('pubDate'));

    posts.set(normalizeTitle(title), {
      slug: path.basename(file, '.md'),
      description: read('description'),
      pubDate: Number.isNaN(pubDate.valueOf()) ? undefined : pubDate,
      tags,
    });
  }

  return posts;
}

/** 取页面树里的一级子页面，按 Notion 里的顺序返回。 */
async function getChildPages(rootPageId) {
  const children = [];
  let cursor;

  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);

    const data = await notion(`/blocks/${rootPageId}/children?${query}`);
    for (const block of data.results || []) {
      if (block.type !== 'child_page') continue;
      children.push({
        id: block.id,
        title: (block.child_page?.title || '').trim(),
        createdAt: block.created_time,
        updatedAt: block.last_edited_time,
      });
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return children;
}

function treeMetadata(entry, existingPosts) {
  const title = String(entry.title || '').replace(/\s+/g, ' ').trim();
  if (!title) return null;

  const existing = existingPosts.get(normalizeTitle(title));
  const fallbackDate = new Date(entry.createdAt || entry.updatedAt);
  const pubDate = existing?.pubDate || fallbackDate;
  if (Number.isNaN(pubDate.valueOf())) return null;

  return {
    id: entry.id,
    title,
    description: existing?.description || '',
    pubDate,
    tags: existing?.tags || [],
    // 同名文章沿用原来的 slug，保证已有链接不变
    slug: existing?.slug || toSlug(entry.title, entry.id),
    updated: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
    hasPassword: false,
    matchedExisting: Boolean(existing),
  };
}

async function main() {
  await loadEnv();
  TOKEN = (process.env.NOTION_TOKEN || '').trim();
  BASE = await readBasePath();
  API_BASE = (process.env.NOTION_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
  EXCLUDE_SLUGS = new Set(
    (process.env.NOTION_EXCLUDE_SLUGS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const rootPageId = (process.env.NOTION_ROOT_PAGE_ID || '').trim();
  const databaseId = (process.env.NOTION_DATABASE_ID || FALLBACK_DATABASE_ID).trim();
  const treeMode = Boolean(rootPageId);

  if (!TOKEN) {
    throw new Error(
      '缺少 NOTION_TOKEN。请在 .env 里填写，或先在 Notion 创建 integration：https://www.notion.so/my-integrations',
    );
  }
  if (!treeMode && !databaseId) {
    throw new Error('缺少 NOTION_DATABASE_ID 或 NOTION_ROOT_PAGE_ID。');
  }

  console.log('Notion → Astro 同步');
  console.log(treeMode ? `  页面树：${rootPageId}` : `  数据库：${databaseId}`);

  const existingPosts = treeMode ? await readExistingPosts() : new Map();
  const posts = [];
  let skippedDemo = 0;

  if (treeMode) {
    const entries = await getChildPages(rootPageId);
    console.log(`  读取 ${entries.length} 个顶层子页面`);

    if (LIST_ONLY) {
      console.log('\n所有子页面：');
      for (const entry of entries) {
        const meta = treeMetadata(entry, existingPosts);
        if (!meta) continue;
        console.log(
          `  [${meta.matchedExisting ? '覆盖' : '新增'}] ${meta.title}  slug=${meta.slug}  id=${entry.id}`,
        );
      }
      console.log('\n只列清单，未写入任何文件。');
      return;
    }

    for (const entry of entries) {
      const meta = treeMetadata(entry, existingPosts);
      if (!meta) continue;
      if (EXCLUDE_SLUGS.has(meta.slug)) {
        console.log(`  - 跳过 ${meta.title}（NOTION_EXCLUDE_SLUGS）`);
        continue;
      }
      posts.push({ page: { id: entry.id }, meta });
      console.log(`  ${meta.matchedExisting ? '↺ 覆盖' : '+'} ${meta.title}`);
    }
  } else {
    const target = await resolveDatabase(databaseId);
    if (target.dataSourceId) console.log(`  数据源：${target.dataSourceId}`);

    const pages = await queryPages(target);
    console.log(`  读取 ${pages.length} 行`);

    if (LIST_ONLY) {
      console.log('\n所有行：');
      for (const page of pages) {
        const properties = page.properties || {};
        const titleProperty = Object.values(properties).find((item) => item.type === 'title');
        const title = propertyText(titleProperty).trim() || '(无标题)';
        const type = propertyText(findProperty(properties, ['type', '类型'])).trim() || '-';
        const status = propertyText(findProperty(properties, ['status', '状态'])).trim() || '-';
        const slug = propertyText(findProperty(properties, ['slug', 'url', '路径'])).trim() || '-';
        console.log(`  [${type}/${status}] ${title}  slug=${slug}  id=${page.id}`);
      }
      console.log('\n只列清单，未写入任何文件。');
      return;
    }

    for (const page of pages) {
      const meta = readMetadata(page);
      if (!meta) continue;
      if (!INCLUDE_DEMOS && TEMPLATE_DEMO_SLUG.test(meta.slug)) {
        skippedDemo += 1;
        continue;
      }
      if (meta.hasPassword) {
        console.log(`  - 跳过 ${meta.title}（设置了访问密码，暂不支持）`);
        continue;
      }
      if (EXCLUDE_SLUGS.has(meta.slug)) {
        console.log(`  - 跳过 ${meta.title}（NOTION_EXCLUDE_SLUGS）`);
        continue;
      }
      posts.push({ page, meta });
    }

    if (skippedDemo > 0) {
      console.log(`  - 跳过 ${skippedDemo} 篇模板示例（example-* / guide）`);
    }
  }

  console.log(`  待同步 ${posts.length} 篇`);

  if (posts.length === 0) {
    console.log('  没有需要同步的文章，保留现有内容。');
    return;
  }

  // 先把正文全部抓到内存，避免中途失败后清空旧内容
  const prepared = [];
  for (const post of posts) {
    const markdownPage = await notion(`/pages/${post.page.id}/markdown`);
    let markdown = markdownPage.markdown || '';

    markdown = markdown.replace(
      /<unknown\b[^>]*\burl="([^"]+)"[^>]*\/?>/g,
      (_, url) => `[${url}](${url})`,
    );
    markdown = markdown.replace(/<unknown\b[^>]*\/?>/g, '');
    markdown = normalizeMarkdown(markdown).trim();

    if (markdownPage.truncated) {
      console.warn(`  ! ${post.meta.title}：内容过长，Notion 只返回了部分正文`);
    }

    prepared.push({ ...post, markdown });
    await sleep(250); // 控制在 3 req/s 以下
  }

  await clearGenerated();

  const usedSlugs = new Set();
  let imageCount = 0;

  for (const post of prepared) {
    const { meta } = post;

    let slug = meta.slug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${meta.slug}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const localized = await localizeImages(post.markdown, slug);
    imageCount += localized.downloaded;

    const description = meta.description || summarize(localized.markdown);
    const frontmatter = [
      '---',
      `title: ${quote(meta.title)}`,
      description ? `description: ${quote(description)}` : null,
      `pubDate: ${meta.pubDate.toISOString()}`,
      meta.updated ? `updated: ${meta.updated.toISOString()}` : null,
      `tags: [${meta.tags.map(quote).join(', ')}]`,
      `notionId: ${quote(meta.id)}`,
      '---',
      '',
    ]
      .filter((line) => line !== null)
      .join('\n');

    await writeFile(
      path.join(CONTENT_DIR, `${slug}.md`),
      `${frontmatter}\n${localized.markdown}\n`,
      'utf8',
    );

    console.log(`  ✓ ${meta.title}  →  /${slug}/`);
  }

  console.log(`完成：${prepared.length} 篇文章，${imageCount} 张图片`);
  console.log('运行 npm run dev 或 npm run build 查看效果。');
}

main().catch((error) => {
  console.error(`\n同步失败：${error.message}`);
  process.exit(1);
});
