<!--
  Translation: ZH-CN (简体中文)
  Original: /docs/guides/user-guide.md
  Last sync: 2026-02-24
-->

# AIOS 用户指南

> **ZH-CN** | [EN](../../guides/user-guide.md)

---

Synkra AIOS 完整使用指南 - AI 驱动的全栈开发编排系统。

**版本:** 2.1.0
**最后更新:** 2026-02-24

---

## 快速开始

### 前置要求

使用 AIOS 前，请确保你有：

- **Node.js** 18.0.0 或更高版本
- **npm** 8.0.0 或更高版本
- **Git** 用于版本控制
- AI 提供商 API 密钥（Anthropic、OpenAI 或兼容）

### 安装

```bash
# 新项目（绿地）
npx @synkra/aios-core init my-project

# 现有项目（棕地）
cd existing-project
npx @synkra/aios-core install
```

### 首次步骤

```bash
# 进入项目目录
cd my-project

# 列出可用代理
aios agents list

# 激活代理
@dev

# 获取帮助
*help
```

---

## 核心概念

### 哲学

> **"结构神圣。语调灵活。"**

AIOS 提供编排的结构，同时允许沟通的灵活性。这意味着：

- **固定**：模板位置、章节顺序、度量格式、文件结构、工作流
- **灵活**：状态消息、词汇选择、表情符号使用、个性、语调

### AIOS 的差异

| 传统 AI 开发 | AIOS |
| --- | --- |
| 不协调的代理 | 11 个具有明确角色的专业代理 |
| 不一致的结果 | 带质量门控的结构化工作流 |
| 会话间上下文丢失 | 持久记忆和学习 |
| 重复造轮子 | 可重用的任务、工作流和 Squad |

---

## 代理

AIOS 包含 11 个专业代理，每个都有独特的角色和个性：

| 代理 | ID | 原型 | 职责 |
| --- | --- | --- | --- |
| **Dex** | `@dev` | 构建者 | 代码实现 |
| **Quinn** | `@qa` | 守护者 | 质量保证 |
| **Aria** | `@architect` | 架构师 | 技术架构 |
| **Pax** | `@po` | 愿景者 | 产品 Backlog |
| **Morgan** | `@pm` | 平衡者 | 产品策略 |
| **River** | `@sm` | 促进者 | 流程促进 |
| **Alex** | `@analyst` | 探索者 | 业务分析 |
| **Dara** | `@data-engineer` | 架构师 | 数据工程 |
| **Gage** | `@devops` | 优化者 | CI/CD 和运维 |
| **Uma** | `@ux-design-expert` | 创造者 | 用户体验 |
| **Orion** | `@aios-master` | 编排者 | 框架编排 |

### 代理激活

```bash
# 使用 @ 语法激活代理
@dev                # 激活 Dex（开发者）
@qa                 # 激活 Quinn（QA）
@architect          # 激活 Aria（架构师）
@aios-master        # 激活 Orion（编排者）

# 代理命令使用 * 前缀
*help               # 显示可用命令
*task <name>        # 执行特定任务
*exit               # 停用代理
```

### 代理上下文

当代理处于活动状态时：

- 遵循该代理的特定角色设定和专业知识
- 使用代理指定的工作流模式
- 在整个交互过程中保持代理的视角

### 命令可见性级别

代理命令使用可见性级别控制何时显示：

| 级别 | 名称 | 描述 |
| --- | --- | --- |
| `key` | 关键 | 简洁问候中显示的关键命令 |
| `quick` | 快速 | 快速参考中显示的常用命令 |
| `full` | 完整 | `*help` 输出中显示的所有命令 |

**可见性工作原理：**

```yaml
commands:
  - name: help
    visibility: [full, quick, key]  # 始终显示
    description: "显示可用命令"

  - name: create-prd
    visibility: [full, quick]       # 快速参考中显示
    description: "创建产品需求"

  - name: session-info
    visibility: [full]              # 仅在完整帮助中
    description: "显示会话详情"
```

**命令权威：**

每个命令只有一个权威代理所有者。当多个代理可能处理类似任务时：

| 命令 | 所有者 | 其他代理应... |
| --- | --- | --- |
| `*create-prd` | @pm | 委托给 @pm |
| `*create-epic` | @pm | 委托给 @pm |
| `*draft` | @sm | 使用 @sm 创建 Story |
| `*develop` | @dev | 使用 @dev 实现 |
| `*review` | @qa | 使用 @qa 审核代码 |

完整映射请参见[命令权威矩阵](../architecture/command-authority-matrix.md)。

---

## 任务

任务是 AIOS 的主要入口点。一切都是任务。

### 任务优先架构

```
用户请求 --> 任务 --> 代理执行 --> 输出
              |
         工作流（如果多步骤）
```

### 执行任务

```bash
# 执行特定任务
*task develop-story --story=1.1

# 列出可用任务
aios tasks list

# 获取任务帮助
*task --help
```

### 任务类别

| 类别 | 示例 |
| --- | --- |
| **开发** | develop-story, code-review, refactor |
| **质量** | run-tests, validate-code, security-scan |
| **文档** | generate-docs, update-readme |
| **工作流** | create-story, manage-sprint |

---

## 工作流

工作流编排多个任务和代理进行复杂操作。

### 可用工作流

| 工作流 | 用途 | 入口代理 |
| --- | --- | --- |
| `greenfield-fullstack` | 新全栈项目 | @pm |
| `greenfield-service` | 新后端项目 | @architect |
| `greenfield-ui` | 新前端项目 | @ux-expert |
| `brownfield-discovery` | 现有项目分析 | @analyst |
| `brownfield-fullstack` | 现有全栈演进 | @pm |
| `development-cycle` | 标准开发周期 | @sm |

### 执行工作流

```bash
# 列出可用工作流
aios workflows list

# 执行工作流
@pm *workflow greenfield-fullstack

# 检查工作流状态
aios workflow status
```

---

## Story 驱动开发

所有 AIOS 开发都遵循 `docs/stories/` 中的 Story。

### Story 结构

每个 Story 包含：

```markdown
# STORY-XXX: Story 标题

## Overview
简要描述

## Acceptance Criteria
- [ ] AC1: 具体验收标准
- [ ] AC2: 另一个验收标准

## Tasks
- [ ] Task 1.1: 具体任务
- [ ] Task 1.2: 另一个任务

## Files
- `path/to/file1.ts`
- `path/to/file2.ts`

## Notes
任何额外注释
```

### Story 生命周期

```mermaid
flowchart LR
    A[起草] --> B[验证]
    B --> C[实现]
    C --> D[审核]
    D --> E[完成]
```

### Story 命令

```bash
# 创建 Story
@sm *draft

# 验证 Story
@po *validate-story-draft

# 实现 Story
@dev *implement

# 审核 Story
@qa *review STORY-XXX

# 关闭 Story
@po *close-story STORY-XXX
```

---

## 质量门控

AIOS 实现三层质量防御：

### Layer 1: Pre-commit（本地）

```bash
✅ ESLint - 代码质量检查
✅ TypeScript - 类型检查
⚡ 耗时: < 5 秒
```

### Layer 2: Pre-push（本地）

```bash
✅ Story checkboxes 验证
✅ 状态一致性检查
✅ 必填章节验证
```

### Layer 3: CI/CD（云端）

```bash
✅ 所有测试
✅ 80% 测试覆盖率要求
✅ 完整验证
```

### 手动运行质量检查

```bash
# Layer 1
npm run lint
npm run typecheck

# Layer 2
npm run validate:manifest

# Layer 3
npm test
npm run test:coverage
```

---

## IDE 集成

### 支持的 IDE

| IDE/CLI | 状态 | 激活方式 |
| --- | --- | --- |
| Claude Code | ✅ 完全支持 | `/agent-name` |
| Gemini CLI | ✅ 完全支持 | `/aios-menu` |
| Codex CLI | ⚠️ 部分支持 | `/skills` |
| Cursor | ⚠️ 部分支持 | `@agent` |
| GitHub Copilot | ⚠️ 部分支持 | 聊天模式 |

### 同步配置

```bash
# 同步到所有 IDE
npm run sync:ide

# 同步到特定 IDE
npm run sync:ide:claude
npm run sync:ide:cursor

# 验证同步
npm run validate:parity
```

---

## 故障排除

### 安装问题

```bash
# 检查 Node.js 版本
node --version  # 应 >= 18.0.0

# 运行诊断
npx aios-core doctor

# 自动修复
npx aios-core doctor --fix
```

### 代理无响应

1. 验证 IDE 受支持
2. 运行 `npm run sync:ide`
3. 重启 IDE/CLI 会话

### 同步问题

```bash
# 预览变更
npm run sync:ide -- --dry-run

# 强制重新同步
npm run sync:ide
```

---

## 下一步

- [IDE 集成指南](../ide-integration.md) - 详细 IDE 设置
- [架构文档](../architecture/ARCHITECTURE-INDEX.md) - 技术深入
- [Squad 指南](./squads-guide.md) - 扩展 AIOS
- [故障排除](../troubleshooting.md) - 常见问题

---

*AIOS 用户指南 v2.1.0 - 中文版*
