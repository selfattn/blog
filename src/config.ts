export const siteConfig = {
  title: 'zhangjiancheng',
  description: '强化学习、Agent 系统与工程实践',
  author: 'zhangjiancheng',
  lang: 'zh-CN',
  // Giscus 评论配置：需要自己填写，步骤见 README 的「开启评论区」
  giscus: {
    // GitHub 仓库，格式为 owner/repo，必须是公开仓库且已启用 Discussions
    repo: 'yourname/your-repo',
    // 仓库 ID，在 https://giscus.app 配置页获取
    repoId: '',
    // Discussion 分类名称
    category: 'Announcements',
    // 分类 ID，在 https://giscus.app 配置页获取
    categoryId: '',
    // 页面与 Discussion 的映射方式
    mapping: 'pathname',
  },
} as const;
