import type { PostEntry } from '../types';

export const pathStages = [
  {
    id: 'basics',
    title: '从直觉入门',
    description: '先用三个问题认识强化学习。',
  },
  {
    id: 'experiments',
    title: '动手看实验',
    description: '从悬崖、冰面和倒立摆理解不同算法。',
  },
  {
    id: 'policy',
    title: '走向策略优化',
    description: '从策略梯度出发，继续探索 Actor-Critic、GAE 与 PPO。',
  },
] as const;

export function getReadingPath(posts: PostEntry[]) {
  return pathStages
    .map((stage) => ({
      ...stage,
      posts: posts
        .filter((post) => post.data.pathStage === stage.id)
        .sort((a, b) => (a.data.pathOrder ?? 999) - (b.data.pathOrder ?? 999)),
    }))
    .filter((stage) => stage.posts.length > 0);
}
