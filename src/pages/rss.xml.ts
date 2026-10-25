import rss from '@astrojs/rss';
import { siteConfig } from '../config';
import { getPosts } from '../utils';

export async function GET(context: { site: URL }) {
  const posts = await getPosts();
  const base = import.meta.env.BASE_URL;

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `${base}${post.id}/`,
    })),
    customData: `<language>${siteConfig.lang}</language>`,
  });
}
