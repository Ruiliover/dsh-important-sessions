# Important sessions / 重要会话

A DSH Web UI plugin that adds a **重要会话 (Important sessions)** panel to the sidebar with categorized favorites, plus a star on every session.

## 功能

- **左侧栏「重要会话」入口**：面板图标列多出一项带星标的「重要会话」，展开侧边栏显示文字，点开后列出收藏的会话。
- **会话标题右上角的星标**：打开任意会话，标题右侧（溢出菜单左边）有星形按钮；点开后勾选一个或多个分类再保存，已收藏时星标是实心的，再点可调整分类。
- **会话列表每一行的星标**：鼠标移到左侧任意会话行，行尾操作区里也有星标按钮，不必先打开会话。
- **分类收藏**：默认有「默认收藏夹」「日常答疑」「工作答疑」三个分类；点星标后默认勾选「默认收藏夹」，也可以再勾其他分类，或当场新建分类。一个会话可以同时属于多个分类。
- **默认收藏夹与分类筛选**：面板顶部列出每个分类（带会话数量），默认先看「默认收藏夹」；点其他分类只显示该分类。没有分类的会话（例如分类被删光后）标为「未分类」，可用行尾星标重新归类。
- **管理分类**：面板右上角的「管理分类」可以新建分类、按回车改名、分两步删除分类。删除分类只会把会话从该分类移除，收藏本身还在。
- **收藏列表**：显示实时标题、分类标签、工作目录和最近更新时间；点行打开会话，点行尾实心星标在弹窗里调整分类或移出收藏。当前打开的会话会高亮，已归档的会话标「已归档」且不可从列表打开。
- **空状态**：没有收藏、或当前分类为空时分别有引导文案。

## 行为与限制

- 收藏和分类保存在当前浏览器的 `localStorage`（键 `dsh.important-sessions.v1`，格式版本 3），不写会话日志、不新增 Host 服务；换浏览器或清空站点数据后数据会丢失。
- 旧版数据会自动迁移：此前没有分类的收藏会放进「默认收藏夹」，原有的分类保持不变。
- 分类名按输入保存，长度上限 24 字；同名（不区分大小写）分类不会被重复创建。
- 会话标题和更新时间取实时数据；会话不可见时回退到收藏时保存的标题。
- 已归档的会话仍会留在收藏里并标上「已归档」，恢复后才能从列表打开。
- 只依赖 DSH 的公开插槽接口，使用主题 token，亮色/暗色主题下都跟随宿主样式。

## English

A categorized favorites panel for the DSH sidebar:

- The **Important sessions** entry in the sidebar's panel list.
- A star at the top right of any open session (and in every session row's hover strip) opens a category picker; a new favorite starts in the default category, and you can tick more categories and save.
- A session can belong to several categories at once. The panel filters by one category at a time (the default category first), showing counts.
- Categories can be created in the picker and managed (create, rename, delete) from the panel.
- Favorites and categories persist in this browser's `localStorage` under `dsh.important-sessions.v1`. No Host state or session-log record is written.

## 安装

通过 **插件 (Plugins) → 添加插件** 选择本目录，或用 `plugin_manager` 以本地目录安装；安装后在 Web 界面刷新即可看到。
