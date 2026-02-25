<!--
  Translation: ZH-CN (简体中文)
  Original: /docs/getting-started.md
  Last sync: 2026-02-24
-->

# Synkra AIOS 快速入门

> **EN** | **PT** | **ES** | **ZH-CN**

---

欢迎使用 Synkra AIOS。本指南优化为 10 分钟内实现首次价值。

## 目录

1. [10 分钟快速路径](#10-分钟快速路径)
2. [安装](#安装)
3. [你的第一个项目](#你的第一个项目)
4. [基础命令](#基础命令)
5. [IDE 兼容性](#ide-兼容性)
6. [棕地项目：现有项目](#棕地项目现有项目)
7. [进阶路径](#进阶路径)
8. [故障排除](#故障排除)
9. [下一步](#下一步)

## 10 分钟快速路径

如果你是新手，请按照这个流程操作：

### 步骤 1：安装 AIOS

```bash
# 新项目
npx aios-core init my-first-project
cd my-first-project

# 现有项目
# cd existing-project
# npx aios-core install
```

### 步骤 2：选择你的 IDE 激活方式

- Claude Code: `/agent-name` 或 `@agent-name`
- Gemini CLI: `/aios-menu` 然后选择 `/aios-<agent>`
- Codex CLI: `/skills` 然后选择 `aios-<agent-id>`
- Cursor/Copilot/AntiGravity: 参考 `docs/ide-integration.md` 中的约束

### 步骤 3：验证首次价值

当以下 3 个条件全部满足时，即实现首次价值：

1. 你成功激活了一个 AIOS 代理
2. 你收到了有效的问候/激活响应
3. 你运行了一个入门命令（`*help` 或等效命令）并获得了有用的输出

通过规则：在 ≤ 10 分钟内完成所有 3 个条件。

## 安装

### 前置要求

- **Node.js** 18.0.0 或更高版本（推荐 v20+）
- **npm** 9.0.0 或更高版本
- **Git**（可选，但推荐）

### 快速安装

```bash
# 创建新项目
npx aios-core init my-first-project

# 进入项目目录
cd my-first-project

# 在 IDE 中开始使用 AIOS 代理
# （参见上方步骤 2 的 IDE 特定激活方式）
```

### 安装选项

```bash
# 1. 使用自定义模板创建新项目
npx aios-core init my-project --template enterprise

# 2. 在现有项目中安装
cd existing-project
npx aios-core install

# 3. 在非空目录中强制安装
npx aios-core init my-project --force

# 4. 跳过依赖安装（稍后手动安装）
npx aios-core init my-project --skip-install
```

## 你的第一个项目

### 项目结构

安装完成后，你的项目将包含：

```
my-first-project/
├── .aios-core/                 # AIOS 框架核心
│   ├── core/                   # 编排、内存、配置
│   ├── data/                   # 知识库、实体注册
│   ├── development/            # 代理、任务、模板、脚本
│   └── infrastructure/         # CI/CD 模板、验证脚本
├── .claude/                    # Claude Code 集成（如启用）
├── .codex/                     # Codex CLI 集成（如启用）
├── .gemini/                    # Gemini CLI 集成（如启用）
├── docs/                       # 文档
│   └── stories/                # 开发 Story
├── packages/                   # 共享包
├── tests/                      # 测试套件
└── package.json                # 项目依赖
```

### 配置

AIOS 配置位于 `.aios-core/core/config/`。安装程序会处理初始设置。要验证安装：

```bash
npx aios-core doctor
```

## 基础命令

### 代理激活

AIOS 代理通过你的 IDE 激活。激活后，代理响应以 `*` 为前缀的命令：

```bash
# 通用命令（适用于任何代理）
*help                    # 显示此代理的可用命令
*guide                   # 显示详细使用指南
*session-info            # 显示当前会话详情
*exit                    # 退出代理模式

# 代理特定示例
@dev *help               # 开发者代理命令
@qa *review STORY-42     # QA 代理审核 Story
@pm *create-epic         # PM 代理创建 Epic
@sm *draft               # Scrum Master 起草 Story
```

### 可用代理

| 代理 | 名称 | 职责 |
| --- | --- | --- |
| `@dev` | Dex | 代码实现、Bug 修复、重构 |
| `@qa` | Quinn | 测试、质量门控、代码审核 |
| `@architect` | Aria | 系统设计、技术决策 |
| `@pm` | Morgan | PRD、策略、路线图 |
| `@po` | Pax | Backlog、Story 验证、优先级 |
| `@sm` | River | Story 创建、Sprint 规划 |
| `@analyst` | Alex | 研究、竞品分析 |
| `@data-engineer` | Dara | 数据库设计、迁移 |
| `@ux-design-expert` | Uma | UI/UX 设计、可访问性 |
| `@devops` | Gage | Git 操作、CI/CD、部署 |

### 典型工作流

```
1. @pm 创建 PRD          → *create-epic
2. @sm 起草 Story        → *draft
3. @po 验证 Story        → *validate-story-draft
4. @dev 实现             → (从 Story 文件工作)
5. @qa 审核              → *review STORY-ID
6. @devops 推送          → *push (只有此代理有推送权限)
7. @po 关闭 Story        → *close-story STORY-ID
```

## IDE 兼容性

并非所有 IDE 都同等支持 AIOS 功能。完整比较请参见 [`docs/ide-integration.md`](../ide-integration.md)。

摘要：

| IDE/CLI | 总体状态 | 激活方式 |
| --- | --- | --- |
| Claude Code | 完全支持 | `/agent-name` 命令 |
| Gemini CLI | 完全支持 | `/aios-menu` 然后选择 `/aios-<agent>` |
| Codex CLI | 部分支持 | `/skills` 然后选择 `aios-<agent-id>` |
| Cursor | 部分支持 | `@agent` + 同步规则 |
| GitHub Copilot | 部分支持 | 聊天模式 + 仓库指令 |
| AntiGravity | 部分支持 | 工作流驱动激活 |

- **完全支持**: 完全推荐新用户使用
- **部分支持**: 可用，需要按照文档说明操作

## 棕地项目：现有项目

已有代码库？AIOS 通过专用工作流处理棕地项目。

### 快速棕地设置

```bash
# 进入现有项目目录
cd my-existing-project

# 安装 AIOS（非破坏性，保留你的配置）
npx aios-core install

# 运行 doctor 验证兼容性
npx aios-core doctor
```

### 首次运行时发生什么

当你首次在现有项目中激活 AIOS 代理时：

1. **检测**: AIOS 检测到代码但没有 AIOS 文档
2. **提议**: "我可以分析你的代码库。这需要 4-8 小时。"
3. **发现**: 多代理技术债务评估（可选）
4. **输出**: 系统架构文档 + 技术债务报告

### 棕地工作流选项

| 你的情况 | 推荐工作流 |
| --- | --- |
| 向现有项目添加主要功能 | `@pm → *create-doc brownfield-prd` |
| 审计遗留代码库 | `brownfield-discovery.yaml`（完整工作流） |
| 快速增强 | `@pm → *brownfield-create-epic` |
| 单个 Bug 修复 | `@pm → *brownfield-create-story` |

### 安全保证

- **非破坏性**: AIOS 创建文件，从不覆盖现有文件
- **可回滚**: `git checkout HEAD~1 -- .` 恢复到 AIOS 之前的状态
- **配置保留**: 你的 `.eslintrc`、`tsconfig.json` 等保持不变

### 资源

- **[棕地工作指南](../../.aios-core/working-in-the-brownfield.md)** - 完整的棕地文档
- **[兼容性检查清单](../../.aios-core/development/checklists/brownfield-compatibility-checklist.md)** - 迁移前后检查
- **[风险报告模板](../../.aios-core/product/templates/brownfield-risk-report-tmpl.yaml)** - 分阶段风险评估

---

## 进阶路径

适用于想深入了解的经验用户：

### 同步和验证

```bash
# 将代理同步到所有配置的 IDE
npm run sync:ide

# 验证跨 IDE 一致性
npm run validate:parity

# 运行所有质量检查
npm run lint && npm run typecheck && npm test
```

### Story 驱动开发

所有 AIOS 开发都遵循 `docs/stories/` 中的 Story。每个 Story 包含：

- 带复选框的验收标准
- 映射到特定 AC 的任务
- CodeRabbit 自动审核集成
- 质量门控分配

完整工作流请参见[用户指南](./guides/user-guide.md)。

### Squad 扩展

Squad 将 AIOS 扩展到软件开发之外的任何领域。参见 [Squad 指南](./guides/squads-guide.md)。

## 故障排除

### 安装问题

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 运行诊断
npx aios-core doctor

# 自动修复常见问题
npx aios-core doctor --fix
```

### 代理无响应

1. 验证你的 IDE 受支持（参见 [IDE 兼容性](#ide-兼容性)）
2. 运行 `npm run sync:ide` 刷新代理文件
3. 重启你的 IDE/CLI 会话

### 同步问题

```bash
# 预览将要更改的内容
npm run sync:ide -- --dry-run

# 强制重新同步
npm run sync:ide

# 同步后验证
npm run validate:parity
```

## 下一步

- **[用户指南](./guides/user-guide.md)** - 从规划到交付的完整工作流
- **[IDE 集成](../ide-integration.md)** - 各 IDE 的详细设置
- **[架构](./architecture/ARCHITECTURE-INDEX.md)** - 技术深入
- **[Squad 指南](./guides/squads-guide.md)** - 将 AIOS 扩展到任何领域
- **[故障排除](./troubleshooting.md)** - 常见问题和解决方案

---

_Synkra AIOS 快速入门指南 v4.2.11 - 中文版_
