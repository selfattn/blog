export const siteConfig = {
  title: 'selfattn',
  description: '强化学习、Agent 系统与工程实践',
  author: 'selfattn',
  lang: 'zh-CN',
  // Giscus 评论配置：仓库必须是公开的，并已安装 giscus app、启用 Discussions
  giscus: {
    // GitHub 仓库，格式为 owner/repo
    repo: 'selfattn/blog',
    // 仓库 node_id，可通过 `gh api repos/selfattn/blog --jq .node_id` 获取
    repoId: 'R_kgDOTq_zQA',
    // Discussion 分类名称
    category: 'Announcements',
    // 分类 node_id
    categoryId: 'DIC_kwDOTq_zQM4DKElY',
    // 页面与 Discussion 的映射方式
    mapping: 'pathname',
  },
} as const;
