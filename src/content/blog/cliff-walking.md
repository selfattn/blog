---
title: '同一座悬崖，两种走法——Q-Learning 与 SARSA'
description: '在 Cliff Walking 里对比 Q-Learning 与 SARSA：唯一的区别在一行 max，却决定了贴悬崖抄近路还是绕远路保安全。'
pubDate: 2026-07-15
tags: ['RL', 'Q-Learning', 'SARSA']
pathStage: 'experiments'
pathOrder: 1
---

## 场景

你是一个小人，站在 12×4 格子的左下角。终点在右下角。每一步扣 1 分——你想快点儿到。但底部一整排是悬崖，踩上去扣 100 分，直接弹回起点。

**贴着悬崖抄近路，还是绕远路保安全？**

## 两个 Agent，两种走法

我们把 Q-Learning 和 SARSA 放到同一个悬崖上，同样训练 500 轮。训练完关掉探索（纯 greedy 模式），让它们各走一遍：

```
Q-Learning（贴着悬崖抄近路）：        SARSA（绕远路保安全）：

→  →  →  →  →  →  →  →  →  →  →  ↓    →  →  →  →  →  →  →  ↓
↑                                   ↓    ↑                    →  ↓
↑  X  X  X  X  X  X  X  X  X  X  G    ↑  X  X  X  X  X  X  X  →  G
S  →  →  →  →  →  →  →  →  →  →  →    S  ↑  ←  ←  ←  ←  ←  ←  ←
```

同一环境、同一奖励、同一超参数。**路径完全不同。**

再看训练数据：

| | 近 100 轮平均分 | 近 100 轮掉崖次数 | greedy 贴悬崖步数 |
|---|---|---|---|
| Q-Learning | -70.5 | 7.4 | 7 |
| **SARSA** | **-38.3** | 3.2 | 1 |

SARSA 训练期间分数反而更高——因为它掉了更少次悬崖。Q-Learning 虽然学出了最短路径，但代价是训练过程中多摔了 4 次。

## 区别只在一行代码

两个 agent 的结构几乎一模一样——都用 epsilon-greedy 选动作，都用 Q-table 存状态价值。区别只在这里：

```python
# Q-Learning target：假设下一步选最优动作
td_target = reward + gamma * max(Q[next_state])
#                          ^^^

# SARSA target：下一步还是用实际选的动作
td_target = reward + gamma * Q[next_state][actual_next_action]
#                                             ^^^^^^^^^^^^^^^^
```

写成人话：

> **Q-Learning** 在算 target 的时候问自己："如果我能完美走完剩下的路，这一步值多少？"——即使训练时它正在随机乱走，它假装没看见。
>
> **SARSA** 在算 target 的时候老老实实问："按我现在的走路风格（包括 10% 的随机乱走），下一步值多少？"

## 为什么这一个 `max` 造成了悬崖边的分岔？

训练时，两个 agent 都有 10% 的概率随机走。站在悬崖边，随机踩一脚掉下去，扣 100 分。

Q-Learning 掉下去后更新 Q 值，但因为用了 `max`，它问的是"如果不乱走，这里值多少"——悬崖边的 Q 值仍然很高。它坚信自己 greedy 的时候不会掉。

SARSA 掉下去后，老老实实把风险算进 Q 值——"按我的走路风格，站在这就是可能掉"。悬崖边的 Q 值被拉低了，最终策略自觉绕开了。

**Q-Learning 学的是理想最优策略（off-policy），SARSA 学的是带探索风险的策略（on-policy）。**

在悬崖这个场景里，SARSA 的保守反而让它训练更稳、总分更高。

## 跑跑看

```bash
python cliff_walking/diagnose.py
```

可以试试把 `epsilon` 从 0.1 改到 0.3——SARSA 绕得更远；改到 0.01——两者差距缩小。

## 在这条路上的位置

Cliff Walking 用的是 **TD Learning**——不需要知道环境规则，只靠采样 `(s, a, r, s')` 就能学。Model-free。

下一篇：**如果转移概率已知，还需要采样吗？** → Frozen Lake。
