# 用 Notion 写博客

这个博客把 Notion 的 **RL 页面**当作内容源：在 RL 下面新建一个子页面写文章，同步后它就会出现在博客上。手写的 Markdown 文章（`src/content/blog/`）仍然保留，两边可以混用。

```text
Notion 的 RL 页面
   └─ 子页面（= 一篇文章）
        │  npm run sync（或 GitHub Actions 每小时跑一次）
        ▼
src/content/notion/*.md  +  public/notion/*（图片）
        │  npm run build
        ▼
dist/  →  GitHub Pages
```

同步是**单向**的：只读 Notion，不会修改你的笔记。

---

## 一次性配置

### 1. 创建 Notion integration

1. 打开 <https://www.notion.so/my-integrations>（新版是 <https://app.notion.com/developers/connections>）。
2. `New integration` → 名字随便填（例如 `博客token`）→ 选你的 workspace。
3. Capabilities 保持默认的 **Read content** 即可。
4. 保存后复制 **Internal Integration Secret**（`ntn_` 开头）。

### 2. 把 RL 页面授权给 integration

打开 RL 页面 → 右上角 `•••` → `More` → `Connections` → `Add connections` → 选 `博客token` → 确认。

> 授权会继承到 RL 下面的所有子页面，所以以后新建的子页面不用再单独授权。

也可以在开发者后台的 `Content access` 标签里勾选页面，效果一样。

### 3. 在项目根目录创建 `.env`

```sh
NOTION_TOKEN=ntn_你的token
NOTION_ROOT_PAGE_ID=244ac9a9-f88b-8093-8158-fcab733848b3
```

`NOTION_ROOT_PAGE_ID` 就是 RL 页面的 ID。填了它之后会走「页面树模式」，`NOTION_DATABASE_ID` 会被忽略。

`.env` 已在 `.gitignore` 里，不会被提交。

### 4. 本地跑一次

```sh
npm run sync -- --list   # 先看清单，不写文件
npm run sync             # 正式同步
npm run dev              # 打开 http://localhost:4321/blog/
```

`--list` 会标出每篇是「覆盖」还是「新增」：

```text
所有子页面：
  [覆盖] Policy Gradient 策略梯度定理  slug=policy-gradient  id=3b7ac9a9...
  [新增] Harbor 框架  slug=harbor-框架  id=3d4ac9a9...
```

### 5. 配置 GitHub Actions

仓库 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`，添加：

| Name | Value |
| --- | --- |
| `NOTION_TOKEN` | 第 1 步的 token |
| `NOTION_ROOT_PAGE_ID` | RL 页面 ID |

没有配置时工作流会跳过同步，站点仍然用仓库里的手写文章正常构建。

---

## 写作规则

**在 RL 下面新建一个子页面，就是新文章；子页面下面再套子页面，也会递归同步成独立文章。**

| Notion 里的东西 | 博客里的结果 |
| --- | --- |
| RL 下的子页面（任意层级） | 一篇文章，标题就是页面标题 |
| 子页面里的正文 | 文章正文 |
| 子页面里的图片 | 下载到 `public/notion/`，不依赖 Notion 临时链接 |
| 子页面下再嵌套的页面 | 也单独成文，递归同步 |
| RL 页面本身的段落文字 | 忽略 |

细节：

- **slug**：由标题生成，保留中英文，例如 `Harbor 框架` → `harbor-框架`。想换 URL 就在 Notion 里改标题，或同步后手动改 `src/content/notion/*.md`（下次同步会被覆盖）。
- **日期**：新建页面用页面的创建时间；排序按这个日期。
- **标签**：页面树没有 tags 属性，默认为空。需要标签就继续用手写 Markdown，或以后加一个同名映射。
- **同名覆盖**：如果 Notion 子页面标题和 `src/content/blog/` 里的手写文章一致（忽略空格、标点、大小写），会用 Notion 版本覆盖，并沿用原文章的 slug、日期、标签、摘要。这样改 Notion 就能更新已有文章，URL 不变。
- **改标题 = 新文章**：把已有文章改名后，它就不再匹配旧文，会以新 slug 重新发布，旧文章仍留在博客里。

---

## 发布流程

```text
在 RL 下新建/编辑子页面 → 等下一次构建
```

- **自动**：GitHub Actions 每小时的第 17 分钟跑一次（`cron: '17 * * * *'`），最多等一小时。
- **立即**：仓库 `Actions` → `Deploy to GitHub Pages` → `Run workflow`。
- 删除文章：删掉 Notion 子页面，或把它挪出 RL；下一次同步会整体重建 `src/content/notion/`，旧文章不会残留。
- 移动文章：把它拖到 RL 下面即可，任意层级都会被发布。

---

## 数据库模式（可选）

如果以后想用「数据库 + type/status 属性」管理文章，可以改回数据库模式：在 `.env` 里删掉 `NOTION_ROOT_PAGE_ID`，填 `NOTION_DATABASE_ID`。

数据库模式的要求：

| 列 | 类型 | 说明 |
| --- | --- | --- |
| 标题列 | Title | 文章标题，任意列名，脚本按类型找 |
| `type` | Select | 必须是 `Post`；`Page` / `Menu` / `Config` 会被忽略 |
| `status` | Select | 必须是 `Published`；`Draft` / `Invisible` 会被忽略 |
| `slug` | Text | URL；留空用页面 ID |
| `date` | Date | 发布时间；留空用创建时间 |
| `summary` | Text | 列表摘要；留空自动截取正文 |
| `tags` | Multi-select | 标签 |

模板自带的示例文章（slug 为 `example-1`…`example-10`、`guide`）会自动跳过；设置了 `password` 的文章也会跳过。

---

## 图片和附件

Notion 的图片地址是**一小时后就过期**的签名链接，所以同步时会立刻把正文图片下载到 `public/notion/<slug>/`，并把 Markdown 里的链接换成本地地址。

- `public/notion/` 是生成目录，已加入 `.gitignore`，不会进仓库；
- 图片会跟着 GitHub Pages 一起发布；
- 某张图下载失败时会打印警告并保留原链接，重跑一次 `npm run sync` 即可。

---

## 已知限制

Notion 的 Markdown 导出不是无损的，下面这些块会被降级：

| Notion 块 | 同步结果 |
| --- | --- |
| 同步块 `synced_block` | 展开成普通内容 |
| 高亮块 `callout` | 转成引用块，保留 emoji |
| 折叠块 `toggle` | 展开成「加粗标题 + 正文」，嵌套折叠可能异常 |
| 分栏 `columns` | 变成上下顺序排列 |
| 嵌套子页面 | 递归同步，每篇单独成文 |
| PDF / 文件附件 | 只保留「PDF：xxx」文字，不下载文件 |
| 嵌入网页 / 视频 / 数据库视图 | 变成「（嵌入内容）」或纯文字 |
| 书签 `bookmark` | 转成普通链接 |

公式、代码块、表格、任务列表、图片正常。Notion 的 `$`...`$` 行内公式会转成标准 `$...$`。

---

## 常见问题

**404 / object_not_found**

RL 页面没有授权给 integration。回到「一次性配置」第 2 步。

**401 / unauthorized**

token 复制错了，或 integration 被删了。重新生成，更新 `.env` 和 GitHub secret。

**新页面没出现**

确认它挂在 RL 下面（任意层级都可以）；再确认同步跑过（Actions 或本地 `npm run sync`）。

**文章重复了**

标题改了，或者与手写文章的标题不再一致。检查 `--list` 里的「覆盖/新增」，必要时删掉旧的手写 Markdown。

**图片裂了**

本地跑过 `npm run sync` 后没重启 dev server，或 CI 里同步步骤被跳过了。

**公式 / 特殊排版不对**

Notion 的 Markdown 导出对部分块会降级，见上面的「已知限制」。公式用 Notion 的公式块写；如果某个块丢了，把那段改成普通段落或代码块。

---

## 同步脚本做了什么

`scripts/sync-notion.mjs`，零依赖，只用 Node 内置的 `fetch`：

1. 读 `.env`，拿 token 和 RL 页面 ID；
2. `GET /v1/blocks/{RL}/children` 递归取 RL 下的所有子页面；
3. `GET /v1/pages/{id}/markdown` 取正文；
4. 规范化 Notion 的 Markdown：展开同步块 / callout / 折叠块 / 分栏，转换行内公式，清掉会过期的附件地址；
5. 下载图片到 `public/notion/`，替换链接；
6. 清空并重建 `src/content/notion/`，写入带 frontmatter 的 Markdown。

先抓取、后删除：抓取阶段失败不会清空已发布的文章。同名手写文章的 slug / 日期 / 标签会被复用，并在 `getPosts()` 里按标题去重，让 Notion 版本生效。
