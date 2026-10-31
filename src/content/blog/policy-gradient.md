---
title: 'Policy Gradient 策略梯度定理'
description: '从 V 值和 Q 值的关系出发，一步步推导策略梯度定理，最终化成期望形式以便用采样近似。'
pubDate: 2026-08-14
tags: ['RL', 'Policy Gradient', '策略梯度']
pathStage: 'policy'
pathOrder: 1
---

首先在开始推导之前，我们需要知道在强化学习中，有两个关键的概念，一个是 V 值，一个是 Q 值。V 值也叫状态值函数，用于衡量某个状态的价值，经常记作 $V(s)$，表示状态 $s$ 的价值。Q 值也叫状态动作值函数，顾名思义，就是用于衡量某个状态 $s$ 下做出某个动作 $a$ 的价值，经常记作 $Q(s,a)$。同时二者有以下关系：

$$
V(s) = \sum_{a} \pi(a|s)\, Q(s,a)
$$

$$
Q(s,a) = \sum_{s'} P(s'|s,a)\bigl(R(s,a)+\gamma V(s')\bigr)
$$

其中 $\pi(a|s)$ 代表 agent 现在的策略，即在状态 $s$ 下做动作 $a$ 的概率；$P(s'|s,a)$ 表示环境，在状态 $s$ 做动作 $a$，到达状态 $s'$ 的概率。有这两个关键概念和等式后，我们就可以开始推导策略梯度定理。

强化学习的目标是找到一种策略，使得开始状态的 V 值最高。在现代 RL 中，我们会将策略函数参数化（也就是用神经网络去代表这个策略 $\pi(a|s)$，输入就是当前状态 $s$，输出是每个动作的概率值），所以可以将目标函数写为：

$$
J(\theta) = V^{\pi_\theta}(s_0)
$$

其中，$\theta$ 代表神经网络的参数，$\pi_\theta$ 表示神经网络构成的策略函数。

显然，为了最大化 $V$，我们可以计算出它的梯度，然后用**梯度上升**去优化神经网络，接下来我们就需要求目标函数的梯度 $\nabla J(\theta)$。

$$
\begin{aligned}\nabla_{\theta} J(\theta) &= \nabla_{\theta} V^{\pi_{\theta}}(s_0) \\ &= \nabla_{\theta} \sum_{a_0} \pi(a_0|s_0)\, Q(s_0,a_0) \\ &= \sum_{a_0} \nabla_{\theta} \pi(a_0|s_0)\, Q(s_0,a_0) + \sum_{a_0} \pi(a_0|s_0)\, \nabla_{\theta} Q(s_0,a_0)\end{aligned}
$$

这里用到了开头的 $V$ 和 $Q$ 的关系，以及复合函数求导。

我们先化简后半部分：

$$
\begin{aligned}\nabla_{\theta} Q(s_0,a_0) &= \nabla_{\theta} \sum_{s_1} \Bigl[ P(s_1|s_0,a_0) \bigl( R(s_0,a_0)+\gamma V(s_1) \bigr) \Bigr] \\ &= \sum_{s_1} P(s_1|s_0,a_0)\, \gamma\, \nabla_{\theta} V(s_1)\end{aligned}
$$

$$
\begin{aligned}\sum_{a_0} \pi(a_0|s_0)\, \nabla_{\theta} Q(s_0,a_0) &= \sum_{a_0} \pi(a_0|s_0) \sum_{s_1} P(s_1|s_0,a_0)\, \gamma\, \nabla_{\theta} V(s_1) \\ &= \gamma \sum_{a_0} \sum_{s_1} \pi(a_0|s_0)\, P(s_1|s_0,a_0)\, \nabla_{\theta} V(s_1) \\ &= \gamma \sum_{s_1} \sum_{a_0} \pi(a_0|s_0)\, P(s_1|s_0,a_0)\, \nabla_{\theta} V(s_1) \\ &= \gamma \sum_{s_1} \mathrm{Pr}(s_0 \to s_1)\, \nabla_{\theta} V(s_1)\end{aligned}
$$

再代入回去，并令 $\sum_{a_0} \nabla_{\theta} \pi(a_0|s_0)\, Q(s_0,a_0) = \phi(s_0)$：

$$
\begin{aligned}\nabla_{\theta} J(\theta) &= \sum_{a_0} \nabla_{\theta} \pi(a_0|s_0)\, Q(s_0,a_0) + \sum_{a_0} \pi(a_0|s_0)\, \nabla_{\theta} Q(s_0,a_0) \\ &= \phi(s_0) + \gamma \sum_{s_1} \mathrm{Pr}(s_0 \to s_1)\, \nabla_{\theta} V(s_1) \\ &= \phi(s_0) + \gamma \sum_{s_1} \mathrm{Pr}(s_0 \to s_1) \Bigl[ \phi(s_1) + \gamma \sum_{s_2} \mathrm{Pr}(s_1 \to s_2)\, \nabla_{\theta} V(s_2) \Bigr] \\ &= \phi(s_0) + \gamma \sum_{s_1} \mathrm{Pr}(s_0 \to s_1)\, \phi(s_1) + \gamma^2 \sum_{s_1} \mathrm{Pr}(s_0 \to s_1) \sum_{s_2} \mathrm{Pr}(s_1 \to s_2)\, \nabla_{\theta} V(s_2) \\ &= \phi(s_0) + \gamma \sum_{s_1} \mathrm{Pr}(s_0 \to s_1)\, \phi(s_1) + \gamma^2 \sum_{s_2} \mathrm{Pr}(s_0 \to s_2, 2)\, \nabla_{\theta} V(s_2)\end{aligned}
$$

可以看出是递归的形式，而且 $0 < \gamma < 1$，越往后的项 $\nabla_{\theta} V(s_n)$ 越小，所以最终应该是：

$$
\begin{aligned}\nabla_{\theta} J(\theta) &= \phi(s_0) + \gamma \sum_{s_1} \mathrm{Pr}(s_0 \to s_1)\, \phi(s_1) + \gamma^2 \sum_{s_2} \mathrm{Pr}(s_0 \to s_2, 2)\, \phi(s_2) + \cdots \\ &= \sum_{t=0}^{\infty} \gamma^{t} \sum_{s_t} \mathrm{Pr}(s_0 \to s_t, t)\, \phi(s_t) \\ &= \sum_{s_t} \sum_{t=0}^{\infty} \gamma^{t} \mathrm{Pr}(s_0 \to s_t, t)\, \phi(s_t) \\ &= \sum_{s_t} \mu(s_t)\, \phi(s_t) \\ &= \sum_{x} \mu(x)\, \phi(x)\end{aligned}
$$

紧接着我们再把 $\phi(s_t)$ 带进去：

$$
\begin{aligned}\nabla_{\theta} J(\theta) &= \sum_{x} \mu(x)\, \phi(x) \\ &= \sum_{x} \mu(x) \sum_{a} \nabla_{\theta} \pi(a|x)\, Q(x,a) \\ &= \sum_{x} \mu(x) \sum_{a} \pi(a|x)\, \nabla_{\theta} \log \pi(a|x)\, Q(x,a) \\ &= \sum_{x} \mu(x)\, \mathbb{E}_{a \sim \pi(a|x)} \left[ \nabla_{\theta} \log \pi(a|x)\, Q(x,a) \right] \\ &= \mathbb{E}_{x \sim \mu(x)}\, \mathbb{E}_{a \sim \pi(a|x)} \left[ \nabla_{\theta} \log \pi(a|x)\, Q(x,a) \right]\end{aligned}
$$

> **为什么要化成期望的形式？**
>
> 因为做成了期望的形式，我们就可以通过采样来近似分布，而不需要穷尽所有的状态 $x$ 和动作 $a$，这在现实中也是不大可能。
