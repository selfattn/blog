import type { PostEntry } from '../types';

// 只展示当前已发布的文章；Notion 尚未同步时也不会产生失效链接。
const stages = [
  { title: '从直觉入门', description: '先用三个问题认识强化学习。', ids: ['rl-intro'] },
  { title: '动手看实验', description: '从悬崖、冰面和倒立摆理解不同算法。', ids: ['cliff-walking', 'frozen-lake', 'cartpole'] },
  { title: '走向策略优化', description: '从策略梯度出发，继续探索 Actor-Critic 与 PPO。', ids: ['policy-gradient', '策略梯度推导reinforce版本', '怎么降低-reinforce-梯度估计的方差的', 'actor-critic', 'vanilla-pg-到-ppo'] },
];

export function getReadingPath(posts: PostEntry[]) {
  const byId = new Map(posts.map((post) => [post.id, post]));
  return stages.map((stage) => ({
    ...stage,
    posts: stage.ids.flatMap((id) => {
      const post = byId.get(id);
      return post ? [post] : [];
    }),
  })).filter((stage) => stage.posts.length > 0);
}
