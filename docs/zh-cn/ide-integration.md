<!--
  Translation: ZH-CN (简体中文)
  Original: /docs/ide-integration.md
  Last sync: 2026-02-24
-->

# IDE 集成指南

> **ZH-CN** | [EN](../ide-integration.md)

---

AIOS 与支持的 IDE 和 AI 开发平台的集成指南。

**版本:** 4.2.11
**最后更新:** 2026-02-24

---

## 兼容性协议 (AIOS 4.2.11)

IDE 矩阵由版本化协议强制执行：

- 协议文件：`.aios-core/infrastructure/contracts/compatibility/aios-4.2.11.yaml`
- 验证器：`npm run validate:parity`

如果本文档中的矩阵声明与验证器结果不一致，奇偶性验证将失败。

---

## 支持的 IDE

AIOS 支持多个 AI 驱动的开发平台。选择最适合你工作流程的那个。

### 快速状态矩阵 (AIOS 4.2.11)

| IDE/CLI | 总体状态 | 如何激活代理 | 操作前后自动检查 | 有限时的变通方案 |
| --- | --- | --- | --- | --- |
| Claude Code | 完全支持 | `/agent-name` 命令 | 完全支持 | -- |
| Gemini CLI | 完全支持 | `/aios-menu` 然后选择 `/aios-<agent>` | 支持（事件处理有细微差异） | -- |
| Codex CLI | 部分支持 | `/skills` 然后选择 `aios-<agent-id>` | 部分（某些检查需手动同步） | 运行 `npm run sync:ide:codex` 并按 `/skills` 流程操作 |
| Cursor | 部分支持 | `@agent` + 同步规则 | 不可用 | 遵循同步规则并手动运行验证器 |
| GitHub Copilot | 部分支持 | 聊天模式 + 仓库指令 | 不可用 | 使用仓库指令和 VS Code MCP 配置获取上下文 |
| AntiGravity | 部分支持 | 工作流驱动激活 | 不可用 | 使用生成的工作流并手动运行验证器 |

图例：
- `完全支持`: AIOS 4.2.11 中完全推荐新用户使用
- `部分支持`: 可用，需要按文档说明操作
- `不可用`: 此 IDE 不提供此功能；使用变通方案

### 没有完整自动检查会失去什么

某些 IDE 在每次操作前后运行自动检查（如验证上下文、强制规则）。在不可用的地方，你需要手动补偿：

| IDE | 自动检查级别 | 减少了什么 | 如何补偿 |
| --- | --- | --- | --- |
| Claude Code | 完整 | 无 | 内置检查处理一切 |
| Gemini CLI | 高 | 检查有细微时间差异 | Gemini 原生检查覆盖大多数场景 |
| Codex CLI | 部分 | 自动会话跟踪较少；某些前置/后置操作检查需手动触发 | 使用 `AGENTS.md` + `/skills` + 同步/验证脚本 |
| Cursor | 无 | 无自动前置/后置操作检查；无自动审计跟踪 | 遵循同步规则，使用 MCP 获取上下文，运行验证器 |
| GitHub Copilot | 无 | 同 Cursor，更依赖手动工作流 | 使用仓库指令、聊天模式、VS Code MCP |
| AntiGravity | 无 | 无等效自动检查 | 使用生成的工作流并运行验证器 |

### 初学者决策指南

如果你的目标是尽快上手：

1. **最佳选择**：使用 `Claude Code` 或 `Gemini CLI` —— 它们有最多自动化和最少手动步骤
2. **好选择**：使用 `Codex CLI` 如果你喜欢终端优先的工作流并能遵循 `/skills` 激活流程
3. **可用但需额外步骤**：使用 `Cursor`、`Copilot` 或 `AntiGravity` —— 它们可用但需要更多手动验证步骤

### 按能力的实际影响

- **会话跟踪**（自动开始/结束检测）：
  - Claude Code 和 Gemini CLI 上自动
  - Codex、Cursor、Copilot 和 AntiGravity 上手动或部分
- **前置/后置操作护栏**（每次工具使用前后运行的检查）：
  - Claude Code 和 Gemini CLI 上完整
  - Codex CLI 上部分（运行同步脚本补偿）
  - Cursor、Copilot 和 AntiGravity 上不可用（手动运行验证器）
- **自动审计跟踪**（每个会话中发生的事情记录）：
  - Claude Code 和 Gemini CLI 上最丰富
  - 其他 IDE 上减少（用手动日志或验证器输出补偿）

---

## 设置说明

### Claude Code

**推荐级别：** 最佳 AIOS 集成

```yaml
config_file: .claude/CLAUDE.md
agent_folder: .claude/commands/AIOS/agents
activation: /agent-name（斜杠命令）
format: full-markdown-yaml
mcp_support: 原生
special_features:
  - Task 工具用于子代理
  - 原生 MCP 集成
  - Hooks 系统（前置/后置）
  - 自定义技能
  - 记忆持久化
```

**设置：**

1. AIOS 在 init 时自动创建 `.claude/` 目录
2. 代理作为斜杠命令可用：`/dev`、`/qa`、`/architect`
3. 在 `~/.claude.json` 中配置 MCP 服务器

**配置：**

```bash
# 同步所有启用的 IDE 目标（包括 Claude）
npm run sync:ide

# 验证设置
ls -la .claude/commands/AIOS/agents/
```

---

### Codex CLI

**推荐级别：** 最佳（终端优先工作流）

```yaml
config_file: AGENTS.md
agent_folder: .codex/agents
activation: 终端指令
skills_folder: .codex/skills（源码），~/.codex/skills（Codex 菜单）
format: markdown
mcp_support: 通过 Codex 工具原生支持
special_features:
  - AGENTS.md 项目指令
  - /skills 激活器（aios-<agent-id>）
  - 强大的 CLI 工作流支持
  - 易于与仓库脚本集成
```

**设置：**

1. 在仓库根目录保留 `AGENTS.md`
2. 运行 `npm run sync:ide:codex` 同步辅助代理文件
3. 运行 `npm run sync:skills:codex` 在 `.codex/skills` 中生成项目本地技能
4. 使用 `/skills` 并选择 `aios-architect`、`aios-dev` 等

**配置：**

```bash
# 同步 Codex 支持文件
npm run sync:ide:codex
npm run sync:skills:codex
npm run validate:codex-sync
npm run validate:codex-integration
npm run validate:codex-skills

# 验证设置
ls -la AGENTS.md .codex/agents/ .codex/skills/
```

---

### Cursor

**推荐级别：** 最佳（流行 AI IDE）

```yaml
config_file: .cursor/rules.md
agent_folder: .cursor/rules
activation: @agent-name
format: condensed-rules
mcp_support: 通过配置
special_features:
  - Composer 集成
  - 聊天模式
  - @codebase 上下文
  - 多文件编辑
  - 子代理和云交接支持
```

**设置：**

1. AIOS 在 init 时创建 `.cursor/` 目录
2. 使用 @提及 激活代理：`@dev`、`@qa`
3. 规则同步到 `.cursor/rules/`

**配置：**

```bash
# 仅同步 Cursor
npm run sync:ide:cursor

# 验证设置
ls -la .cursor/rules/
```

**MCP 配置（`.cursor/mcp.json`）：**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-playwright"]
    }
  }
}
```

---

### Gemini CLI

**推荐级别：** 最佳（Google AI 生态系统）

```yaml
config_file: .gemini/GEMINI.md
agent_folder: .gemini/commands
activation: /aios-menu 然后选择代理
format: markdown
mcp_support: 通过扩展
special_features:
  - 原生 Google AI 集成
  - 扩展系统
  - 命令菜单
```

**设置：**

1. AIOS 创建 `.gemini/` 目录
2. 使用 `/aios-menu` 访问 AIOS 命令
3. 选择所需代理

**配置：**

```bash
# 同步 Gemini
npm run sync:ide:gemini

# 验证设置
ls -la .gemini/commands/
```

---

### GitHub Copilot

**推荐级别：** 有限

```yaml
config_file: .github/copilot-instructions.md
activation: 聊天模式 + 仓库指令
format: condensed
mcp_support: 通过 VS Code
special_features:
  - VS Code 集成
  - 内联建议
  - 聊天模式
```

**设置：**

1. AIOS 创建 `.github/copilot-instructions.md`
2. 在 VS Code 中使用 Copilot Chat
3. 代理通过仓库指令激活

**配置：**

```bash
# 同步 Copilot 指令
npm run sync:ide:copilot

# 验证设置
cat .github/copilot-instructions.md
```

---

## 同步命令

### 同步所有 IDE

```bash
# 同步到所有配置的 IDE
npm run sync:ide

# 验证跨 IDE 一致性
npm run validate:parity
```

### 同步特定 IDE

```bash
# Claude Code
npm run sync:ide:claude

# Codex CLI
npm run sync:ide:codex
npm run sync:skills:codex

# Gemini CLI
npm run sync:ide:gemini

# Cursor
npm run sync:ide:cursor

# GitHub Copilot
npm run sync:ide:copilot
```

---

## 验证命令

```bash
# 验证所有同步
npm run validate:parity

# 验证特定 IDE
npm run validate:claude-sync
npm run validate:codex-sync
npm run validate:gemini-sync
npm run validate:cursor-sync

# 验证集成
npm run validate:claude-integration
npm run validate:codex-integration
npm run validate:codex-skills
```

---

## 故障排除

### 同步问题

```bash
# 预览变更
npm run sync:ide -- --dry-run

# 强制重新同步
npm run sync:ide

# 验证后检查
npm run validate:parity
```

### 代理未显示

1. 运行 `npm run sync:ide` 刷新代理文件
2. 重启 IDE/CLI 会话
3. 检查代理目录是否存在

### MCP 连接问题

1. 验证 MCP 配置文件格式
2. 检查 MCP 服务器是否运行
3. 查看 IDE 的 MCP 日志

---

*IDE 集成指南 v4.2.11 - 中文版*
