// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages 项目站点：仓库名 blog，访问路径为 /blog/
  site: 'https://selfattn.github.io',
  base: '/blog/',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // 代码块固定使用深色主题，明暗两种模式下都清晰可读
      theme: 'github-dark',
    },
  },
});
