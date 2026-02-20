# Synkra AIOS 长期迭代优化计划

> **版本:** v1.0
> **创建日期:** 2026-02-20
> **规划周期:** 2026-2027
> **目标:** 将新用户 7 日留存率从 <20% 提升到 >50%
> **文档所有者:** @pm (Morgan)

---

## 📋 目录

1. [执行摘要](#执行摘要)
2. [核心问题分析](#核心问题分析)
3. [技术架构设计](#技术架构设计)
4. [实施路线图](#实施路线图)
5. [依赖关系](#依赖关系)
6. [关键文件清单](#关键文件清单)
7. [成功指标](#成功指标)
8. [风险评估与缓解](#风险评估与缓解)
9. [验证方法](#验证方法)
10. [下一步行动](#下一步行动)

---

## 执行摘要

### 项目背景

Synkra AIOS 是一个 AI 驱动的全栈开发框架，当前版本 v4.2.13。虽然技术架构成熟（完善的分层配置、健康检查系统、IDS 决策引擎），但用户体验存在明显痛点，导致新用户流失率超过 60%。

### 核心目标

| 指标 | 当前值 | 目标值 | 时间框架 |
|------|--------|--------|----------|
| 新用户 7 日留存率 | <20% | >50% | H1 2026 |
| 首次功能使用时间 | >30分钟 | <5分钟 | Q1 2026 |
| 错误自助解决率 | <40% | >70% | Q2 2026 |
| Story 创建时间 | >30分钟 | <15分钟 | Q2 2026 |

### 优化策略

遵循 **"CLI First → Observability Second → UI Third"** 架构原则，分 4 个 Horizon 渐进实施：

- **Horizon 1 (H1 2026):** 快速致胜 - 解决最紧迫的用户痛点
- **Horizon 2 (H2 2026):** 体验深化 - 提升协作效率和智能化
- **Horizon 3 (2027):** 生态扩展 - 构建开放生态系统

---

## 核心问题分析

### 用户痛点矩阵

| 痛点 | 当前状态 | 业务影响 | 优先级 |
|------|----------|----------|--------|
| **上手曲线陡峭** | 无交互式引导，需阅读大量文档 | 流失率 >60% | P0 |
| **配置复杂度高** | 5层配置系统 (L1-L5) 难以理解 | 采用率 <30% | P0 |
| **代理协作不透明** | 无状态追踪，职责边界不清 | 团队效率降低 | P1 |
| **Story 管理分散** | YAML + Markdown 分离存储 | 跟踪困难 | P1 |
| **进度可见性差** | 缺乏整体项目进度可视化 | 管理盲区 | P2 |
| **错误处理不友好** | 仅安装模块有错误模板 | 挫败感强 | P0 |
| **文档可发现性** | 难以快速找到所需文档 | 学习成本高 | P2 |

### 根因分析

```
┌─────────────────────────────────────────────────────────────┐
│                     新用户流失率 >60%                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌───────────┐      ┌───────────┐      ┌───────────┐
   │ 上手困难  │      │ 错误挫败  │      │ 配置混乱  │
   └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌───────────┐      ┌───────────┐      ┌───────────┐
   │无引导系统 │      │错误信息   │      │5层配置   │
   │无快速开始│      │晦涩难懂   │      │无向导    │
   └───────────┘      │无修复建议│      └───────────┘
                      └───────────┘
```

---

## 技术架构设计

### Epic 概览

| Epic | 名称 | Horizon | 优先级 | 预计工时 |
|------|------|---------|--------|----------|
| **D** | 错误处理优化 | H1 2026 | P0 | 40h |
| **A** | 降低上手门槛 | H1 2026 | P0 | 60h |
| **B** | 代理协作透明化 | H1 2026 | P1 | 50h |
| **C** | Story 生命周期管理 | H1 2026 | P1 | 55h |
| **G** | 文档可发现性 | H2 2026 | P2 | 35h |
| **E** | 工作流可视化 | H2 2026 | P2 | 45h |
| **F** | 智能辅助增强 | H2 2026 | P2 | 50h |
| **H** | 集成与扩展 | 2027 | P3 | 80h |
| **I** | 企业级协作 | 2027 | P3 | 90h |

---

### Epic D: 错误处理优化 (最高优先级)

**理由:** 最高 ROI，解决所有用户痛点，是其他 Epic 的基础

#### 新增文件结构

```
.aios-core/core/errors/
├── index.js               # 入口导出
├── base-error.js          # AIOSError 基类
├── error-codes.yaml       # 错误代码定义
├── error-formatter.js     # 格式化器
└── recovery-engine.js     # 恢复建议引擎
```

#### AIOSError 基类设计

```javascript
/**
 * AIOSError - 统一错误处理基类
 * @extends Error
 */
class AIOSError extends Error {
  /**
   * @param {string} code - 错误代码 (如 'CFG_001')
   * @param {string} message - 技术错误消息
   * @param {Object} options - 附加选项
   * @param {string} options.category - 错误类别 (CONFIG|AGENT|STORY|SYSTEM)
   * @param {string} options.severity - 严重程度 (CRITICAL|ERROR|WARNING|INFO)
   * @param {boolean} options.recoverable - 是否可恢复
   * @param {Array<string>} options.recoverySteps - 恢复步骤
   * @param {string} options.docUrl - 文档链接
   * @param {Object} options.context - 错误上下文
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AIOSError';
    this.code = code;
    this.category = options.category || 'GENERAL';
    this.severity = options.severity || 'ERROR';
    this.recoverable = options.recoverable || false;
    this.recoverySteps = options.recoverySteps || [];
    this.docUrl = options.docUrl || null;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();

    // 保持正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 格式化为用户友好消息
   * @returns {Object} 格式化后的错误对象
   */
  toUserMessage() {
    return {
      code: this.code,
      title: this.getUserFriendlyTitle(),
      message: this.message,
      severity: this.severity,
      recoverable: this.recoverable,
      recoverySteps: this.recoverySteps,
      docUrl: this.docUrl,
    };
  }

  /**
   * 格式化为 JSON (用于 API)
   */
  toJSON() {
    return {
      error: true,
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}
```

#### 错误代码定义 (error-codes.yaml)

```yaml
# AIOS 错误代码定义
# 格式: {类别}_{序号} 如 CFG_001, AGT_002

metadata:
  version: "1.0.0"
  lastUpdated: "2026-02-20"

categories:
  CFG:
    name: Configuration
    description: 配置相关错误
  AGT:
    name: Agent
    description: 代理相关错误
  STR:
    name: Story
    description: Story 相关错误
  SYS:
    name: System
    description: 系统级错误
  IDS:
    name: IDS
    description: 增量决策系统错误

codes:
  # 配置错误 (CFG-*)
  CFG_001:
    code: "CFG_001"
    category: "CONFIG"
    severity: "ERROR"
    message: "Configuration file not found"
    userMessage: "配置文件未找到"
    recoverable: true
    recoverySteps:
      - "运行 'aios config init' 创建默认配置"
      - "或检查配置文件路径是否正确"
    docUrl: "https://docs.aios.dev/errors/CFG_001"

  CFG_002:
    code: "CFG_002"
    category: "CONFIG"
    severity: "ERROR"
    message: "Invalid YAML syntax in configuration"
    userMessage: "配置文件 YAML 语法错误"
    recoverable: true
    recoverySteps:
      - "运行 'aios doctor --fix' 自动修复"
      - "检查 YAML 缩进和格式"
    docUrl: "https://docs.aios.dev/errors/CFG_002"

  CFG_003:
    code: "CFG_003"
    category: "CONFIG"
    severity: "WARNING"
    message: "Configuration schema validation failed"
    userMessage: "配置项验证失败"
    recoverable: true
    recoverySteps:
      - "检查配置项是否符合 schema 定义"
      - "运行 'aios config validate' 查看详情"

  # 代理错误 (AGT-*)
  AGT_001:
    code: "AGT_001"
    category: "AGENT"
    severity: "ERROR"
    message: "Agent not found: {agentId}"
    userMessage: "代理不存在"
    recoverable: false
    recoverySteps:
      - "运行 'aios agents list' 查看可用代理"
      - "检查代理 ID 拼写是否正确"
    docUrl: "https://docs.aios.dev/errors/AGT_001"

  AGT_002:
    code: "AGT_002"
    category: "AGENT"
    severity: "ERROR"
    message: "Agent activation failed"
    userMessage: "代理激活失败"
    recoverable: true
    recoverySteps:
      - "运行 'aios doctor' 检查系统状态"
      - "检查代理配置文件是否存在"
    docUrl: "https://docs.aios.dev/errors/AGT_002"

  AGT_003:
    code: "AGT_003"
    category: "AGENT"
    severity: "WARNING"
    message: "Agent permission denied"
    userMessage: "代理权限不足"
    recoverable: true
    recoverySteps:
      - "检查当前操作是否需要其他代理"
      - "运行 'aios agents route \"{intent}\"' 获取推荐"

  # Story 错误 (STR-*)
  STR_001:
    code: "STR_001"
    category: "STORY"
    severity: "ERROR"
    message: "Story not found: {storyId}"
    userMessage: "Story 不存在"
    recoverable: false
    recoverySteps:
      - "运行 'aios story list' 查看所有 Story"
      - "检查 Story ID 是否正确"

  STR_002:
    code: "STR_002"
    category: "STORY"
    severity: "ERROR"
    message: "Invalid story format"
    userMessage: "Story 格式无效"
    recoverable: true
    recoverySteps:
      - "检查 Story 文件格式是否符合模板"
      - "运行 'aios story validate {storyId}' 验证"

  # 系统错误 (SYS-*)
  SYS_001:
    code: "SYS_001"
    category: "SYSTEM"
    severity: "CRITICAL"
    message: "AIOS installation corrupted"
    userMessage: "AIOS 安装已损坏"
    recoverable: true
    recoverySteps:
      - "运行 'aios doctor --fix' 修复安装"
      - "如问题持续，重新运行 'npx aios-core install'"
    docUrl: "https://docs.aios.dev/errors/SYS_001"

  SYS_002:
    code: "SYS_002"
    category: "SYSTEM"
    severity: "ERROR"
    message: "Node.js version incompatible"
    userMessage: "Node.js 版本不兼容"
    recoverable: true
    recoverySteps:
      - "升级 Node.js 到 v18 或更高版本"
      - "推荐使用 LTS 版本 (v20+)"
    docUrl: "https://docs.aios.dev/errors/SYS_002"
```

#### CLI 命令扩展

```bash
# 增强的 doctor 命令
aios doctor                         # 快速健康检查 (现有)
aios doctor --full                  # 完整诊断
aios doctor --fix                   # 自动修复
aios doctor --report                # 生成报告

# 新增诊断命令
aios diagnose <error-code>          # 诊断特定错误
aios diagnose --last                # 诊断最近一次错误
aios fix <error-code>               # 修复特定问题
```

#### 复用现有代码

| 现有组件 | 路径 | 复用方式 |
|----------|------|----------|
| 错误模板模式 | `bin/utils/install-errors.js` | 参考 formatErrorMessage 等函数 |
| 诊断引擎 | `.aios-core/core/health-check/engine.js` | 扩展为通用诊断 |
| 修复机制 | `.aios-core/core/health-check/healers/` | 集成到 RecoveryEngine |

---

### Epic A: 降低上手门槛

#### 新增文件结构

```
.aios-core/core/onboarding/
├── index.js
├── tour-manager.js        # 引导流程管理
├── progress-tracker.js    # 进度追踪 (复用配置系统)
└── templates/
    ├── first-run.tour.yaml
    └── feature-tours/

.aios-core/cli/commands/quickstart/
├── index.js               # aios quickstart 命令
└── templates/             # 预设模板
    ├── feature.yaml
    ├── bugfix.yaml
    └── learning.yaml

.aios-core/cli/commands/tour/
├── index.js               # aios tour 命令
├── start.js
├── resume.js
└── reset.js
```

#### TourManager 核心类

```javascript
/**
 * TourManager - 引导流程管理器
 */
class TourManager {
  constructor(projectRoot, userProfile) {
    this.progressTracker = new ProgressTracker(projectRoot);
    this.templateLoader = new TourTemplateLoader();
    this.currentTour = null;
    this.currentStep = 0;
  }

  /**
   * 开始引导
   * @param {string} tourId - 引导 ID
   */
  async start(tourId) {
    const template = await this.templateLoader.load(tourId);
    this.currentTour = template;
    this.currentStep = 0;
    await this.progressTracker.save(tourId, { step: 0, started: true });
    return this.renderStep(0);
  }

  /**
   * 恢复引导
   */
  async resume() {
    const progress = await this.progressTracker.load();
    if (progress) {
      this.currentTour = await this.templateLoader.load(progress.tourId);
      this.currentStep = progress.step;
      return this.renderStep(progress.step);
    }
    return null;
  }

  /**
   * 完成当前步骤
   */
  async completeStep(stepId) {
    this.currentStep++;
    await this.progressTracker.save(this.currentTour.id, {
      step: this.currentStep,
      completedSteps: [...this.progressTracker.data.completedSteps, stepId]
    });

    if (this.currentStep >= this.currentTour.steps.length) {
      await this.complete();
      return { completed: true };
    }
    return this.renderStep(this.currentStep);
  }

  /**
   * 获取上下文相关帮助
   */
  getContextualHelp(currentContext) {
    // 基于当前文件、命令等上下文提供帮助
  }
}
```

#### 首次运行引导模板 (first-run.tour.yaml)

```yaml
id: first-run
title: "欢迎使用 AIOS"
description: "5 分钟快速了解 AIOS 核心功能"
estimatedTime: "5 min"

steps:
  - id: welcome
    title: "欢迎"
    type: info
    content: |
      👋 欢迎使用 Synkra AIOS!

      AIOS 是一个 AI 驱动的开发框架，帮助您：
      • 使用专业化 AI 代理协作开发
      • 通过 Story 驱动的开发流程
      • 自动化质量保证

      让我们花 5 分钟了解一下核心概念。
    action:
      type: confirm
      label: "开始教程"

  - id: agents
    title: "代理系统"
    type: interactive
    content: |
      🤖 AIOS 使用专业化的 AI 代理来完成不同任务：

      | 代理 | 角色 | 使用场景 |
      |------|------|----------|
      | @dev | 开发者 | 编写代码 |
      | @qa | 质量保证 | 测试审查 |
      | @architect | 架构师 | 系统设计 |
      | @pm | 产品经理 | 需求管理 |

      试试看：
    action:
      type: command
      command: "aios agents list"
      label: "查看所有代理"

  - id: stories
    title: "Story 驱动开发"
    type: interactive
    content: |
      📝 AIOS 使用 Story 来管理开发任务。

      每个 Story 包含：
      • 需求描述
      • 任务清单
      • 验收标准
      • 上下文信息

      让我们看看现有的 Story：
    action:
      type: command
      command: "aios story list"
      label: "查看 Story 列表"

  - id: quickstart
    title: "快速开始"
    type: interactive
    content: |
      🚀 准备好开始了吗？

      您可以：
      1. 创建一个新的 Story：aios story create
      2. 开始开发任务：@dev *develop
      3. 运行诊断检查：aios doctor

      推荐您的第一个命令：
    action:
      type: command
      command: "aios quickstart feature"
      label: "开始第一个功能"

  - id: complete
    title: "教程完成！"
    type: info
    content: |
      🎉 恭喜！您已完成 AIOS 快速入门。

      接下来：
      • 查看 aios --help 了解所有命令
      • 阅读 docs/getting-started.md 深入了解
      • 加入社区讨论：discord.gg/aios

      祝您开发愉快！
    action:
      type: complete
```

#### CLI 命令

```bash
aios quickstart                    # 交互式快速开始
aios quickstart feature            # 开始功能开发流程
aios quickstart bugfix             # 开始 Bug 修复流程
aios quickstart learning           # 学习模式

aios tour                          # 启动默认引导
aios tour first-run                # 启动特定引导
aios tour --resume                 # 恢复引导
aios tour --reset                  # 重置进度

aios config wizard                 # 智能配置向导
aios config wizard --preset=react  # 使用预设模板
```

---

### Epic B: 代理协作透明化

#### 新增文件结构

```
.aios-core/core/agent-state/
├── index.js
├── state-manager.js       # 状态管理器
├── activity-tracker.js    # 活动追踪
├── router.js              # 智能路由 (复用 IDS 引擎)
└── collaboration-log.js   # 协作日志

.aios-core/cli/commands/agents/
├── index.js               # agents 命令入口
├── status.js              # aios agents status
├── route.js               # aios agents route
└── history.js             # aios agents history

.aios-core/data/agent-sessions/
└── {agent-id}/
    ├── state.json         # 当前状态
    ├── activity.log       # 活动日志
    └── handoffs.json      # 交接记录
```

#### AgentStateManager 核心类

```javascript
/**
 * AgentStateManager - 代理状态管理器
 */
class AgentStateManager {
  constructor(projectRoot) {
    this.storage = new AgentStateStorage(projectRoot);
    this.agents = this.loadAgentDefinitions();
  }

  /**
   * 更新代理状态 (由 unified-activation-pipeline 调用)
   */
  async updateState(agentId, state) {
    const currentState = await this.storage.load(agentId);
    const newState = {
      ...currentState,
      ...state,
      lastActivity: new Date().toISOString(),
    };
    await this.storage.save(agentId, newState);
  }

  /**
   * 获取代理状态
   */
  async getStatus(agentId) {
    const state = await this.storage.load(agentId);
    const definition = this.agents[agentId];
    return {
      id: agentId,
      name: definition.name,
      icon: definition.icon,
      status: this.calculateStatus(state),
      currentTask: state?.currentTask,
      lastActivity: state?.lastActivity,
      dependencies: await this.getDependencies(agentId),
      blockers: state?.blockers || [],
      capabilities: definition.capabilities,
      restrictions: definition.restrictions,
    };
  }

  /**
   * 获取所有代理状态
   */
  async getAllAgentStates() {
    const states = {};
    for (const agentId of Object.keys(this.agents)) {
      states[agentId] = await this.getStatus(agentId);
    }
    return states;
  }
}
```

#### AgentRouter 智能路由

```javascript
/**
 * AgentRouter - 智能路由器
 * 复用 IDS IncrementalDecisionEngine 进行意图分析
 */
class AgentRouter {
  constructor(idsEngine, agentRegistry) {
    this.idsEngine = idsEngine;
    this.agentRegistry = agentRegistry;
    this.intentMapping = this.buildIntentMapping();
  }

  /**
   * 基于用户意图推荐代理
   * @param {string} userIntent - 用户意图描述
   * @returns {Object} 推荐结果
   */
  async recommendAgent(userIntent) {
    // 1. 使用 IDS 引擎分析意图
    const analysis = await this.idsEngine.analyze(userIntent, {
      context: 'agent-routing'
    });

    // 2. 匹配代理能力
    const matches = this.matchAgents(analysis.keywords);

    // 3. 计算推荐分数
    const recommendations = matches.map(match => ({
      agent: match.agent,
      score: match.score,
      reason: this.generateReason(match),
      alternatives: match.alternatives,
    }));

    return {
      primary: recommendations[0],
      alternatives: recommendations.slice(1, 3),
      confidence: recommendations[0]?.score || 0,
    };
  }

  /**
   * 意图关键词映射
   */
  buildIntentMapping() {
    return {
      'implement': { agent: 'dev', weight: 0.9 },
      'code': { agent: 'dev', weight: 0.8 },
      'develop': { agent: 'dev', weight: 0.9 },
      'fix': { agent: 'dev', weight: 0.7 },
      'bug': { agent: 'qa', weight: 0.8 },
      'test': { agent: 'qa', weight: 0.9 },
      'review': { agent: 'qa', weight: 0.8 },
      'architecture': { agent: 'architect', weight: 0.95 },
      'design': { agent: 'architect', weight: 0.7 },
      'requirement': { agent: 'pm', weight: 0.85 },
      'story': { agent: 'po', weight: 0.8 },
      'deploy': { agent: 'devops', weight: 0.9 },
      'push': { agent: 'devops', weight: 0.95 },
      'database': { agent: 'data-engineer', weight: 0.9 },
      'ux': { agent: 'ux-design-expert', weight: 0.95 },
    };
  }
}
```

#### CLI 命令

```bash
# 代理状态
aios agents status                  # 所有代理状态概览
aios agents status @dev             # 特定代理详情
aios agents status --json           # JSON 输出

# 智能路由
aios agents route "implement auth"  # 意图路由
aios agents route "fix login bug"   # 获取推荐代理

# 协作历史
aios agents history                 # 全部协作历史
aios agents history @dev            # 特定代理历史
aios agents handoff @dev @qa        # 记录代理交接
```

#### 状态输出示例

```
┌─────────────────────────────────────────────────┐
│ 💻 @dev - Dex (Full Stack Developer)            │
├─────────────────────────────────────────────────┤
│ Status:         ✅ Available                    │
│ Last Activity:  2 minutes ago                   │
│ Current Task:   STORY-42.3 (用户认证)           │
│ Progress:       ████████░░ 80%                  │
├─────────────────────────────────────────────────┤
│ Dependencies:                                   │
│   @architect (审核中) - OAuth 架构设计          │
├─────────────────────────────────────────────────┤
│ Capabilities:                                   │
│   ✓ Code Implementation                         │
│   ✓ Testing                                     │
│   ✓ Refactoring                                 │
│   ✗ Git Push (requires @devops)                 │
└─────────────────────────────────────────────────┘
```

---

### Epic C: Story 生命周期管理

#### 新增文件结构

```
.aios-core/core/story-lifecycle/
├── index.js
├── story-manager.js       # Story CRUD
├── progress-analyzer.js   # 进度分析 (解析 checkbox)
├── dependency-resolver.js # 依赖解析
└── template-engine.js     # 模板引擎 (扩展现有)

.aios-core/cli/commands/story/
├── index.js               # story 命令入口
├── list.js                # 列表视图
├── create.js              # 创建 Story
├── show.js                # 显示详情
├── progress.js            # 进度追踪
├── update.js              # 更新 Story
└── visualize.js           # 依赖可视化

.aios-core/templates/stories/
├── feature.yaml           # Feature 模板
├── bug.yaml               # Bug 模板
├── refactor.yaml          # Refactor 模板
└── spike.yaml             # Spike 模板
```

#### 统一 Story 数据模型

```yaml
# story-{id}.yaml - 统一 Story 格式
id: STORY-42
title: Implement User Authentication
type: feature  # feature | bug | refactor | spike
status: in-progress  # draft | ready-for-dev | in-progress | blocked | ready-for-review | done
epic: EPIC-A
sprint: SPRINT-3

# 元数据
metadata:
  created: 2026-02-15T10:00:00Z
  updated: 2026-02-20T14:30:00Z
  author: @pm
  assignee: @dev

# 进度追踪
progress:
  total_tasks: 8
  completed_tasks: 5
  estimated_hours: 16
  logged_hours: 12
  completion_percentage: 62.5

# 任务清单 (自动同步 markdown checkbox)
tasks:
  - id: T1
    title: Design auth flow
    status: done
    assignee: @architect
    completed_at: 2026-02-16T10:00:00Z
  - id: T2
    title: Implement API
    status: in-progress
    assignee: @dev
  - id: T3
    title: Write tests
    status: pending
    assignee: @qa

# 依赖关系
dependencies:
  blocks: [STORY-43, STORY-44]
  blocked_by: [STORY-41]

# 上下文快照
context:
  prd_ref: docs/prd/auth.md
  arch_ref: docs/architecture/auth-flow.md
  related_files:
    - src/auth/
    - src/middleware/auth.ts

# 检查点
checkpoints:
  - timestamp: 2026-02-20T10:00:00Z
    event: Development started
    agent: @dev
    note: "Starting implementation after architecture review"
  - timestamp: 2026-02-18T15:00:00Z
    event: Architecture approved
    agent: @architect

# 验收标准
acceptance_criteria:
  - "User can login with email/password"
  - "OAuth 2.0 integration works"
  - "Session management implemented"
  - "Tests pass with >80% coverage"
```

#### ProgressAnalyzer 核心类

```javascript
/**
 * ProgressAnalyzer - 进度分析器
 * 自动解析 Markdown checkbox 并计算进度
 */
class ProgressAnalyzer {
  /**
   * 解析 Markdown 中的 checkbox
   * @param {string} content - Markdown 内容
   * @returns {Object} 解析结果
   */
  parseCheckboxes(content) {
    const lines = content.split('\n');
    const tasks = [];
    let total = 0;
    let completed = 0;

    for (const line of lines) {
      const checkedMatch = line.match(/^- \[x\]\s+(.+)$/);
      const uncheckedMatch = line.match(/^- \[ \]\s+(.+)$/);

      if (checkedMatch) {
        tasks.push({ title: checkedMatch[1], status: 'done' });
        total++;
        completed++;
      } else if (uncheckedMatch) {
        tasks.push({ title: uncheckedMatch[1], status: 'pending' });
        total++;
      }
    }

    return {
      tasks,
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * 预估剩余时间
   * @param {Object} story - Story 对象
   * @param {Object} velocityData - 历史速度数据
   */
  estimateRemaining(story, velocityData) {
    const remainingTasks = story.progress.total_tasks - story.progress.completed_tasks;
    const avgTimePerTask = velocityData?.avgTimePerTask || 2; // 默认 2 小时
    const estimatedHours = remainingTasks * avgTimePerTask;

    return {
      remainingTasks,
      estimatedHours,
      confidence: velocityData ? 'high' : 'low',
    };
  }

  /**
   * 检测阻塞风险
   */
  detectBlockerRisk(story) {
    const risks = [];

    // 检查依赖是否完成
    if (story.dependencies.blocked_by?.length > 0) {
      risks.push({
        type: 'dependency',
        severity: 'high',
        message: `Blocked by ${story.dependencies.blocked_by.length} stories`,
      });
    }

    // 检查长时间无更新
    const lastUpdate = new Date(story.metadata.updated);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 3) {
      risks.push({
        type: 'stale',
        severity: 'medium',
        message: `No updates for ${Math.floor(daysSinceUpdate)} days`,
      });
    }

    return risks;
  }
}
```

#### CLI 命令

```bash
# Story 列表
aios story list                     # 列出所有 Story
aios story list --status=in-progress
aios story list --epic=EPIC-A
aios story list --assignee=@dev

# Story 创建
aios story create                   # 交互式创建
aios story create --template=feature
aios story create --title="..." --type=bug

# Story 详情
aios story show STORY-42            # 显示详情
aios story show STORY-42 --full     # 完整信息

# 进度追踪
aios story progress STORY-42        # 进度分析
aios story progress STORY-42 --watch # 实时监控

# 依赖可视化
aios story visualize                # 依赖图
aios story visualize --type=tree    # 树形视图
aios story visualize --output=flowchart.png

# 检查点
aios story checkpoint STORY-42 "Started implementation"
aios story history STORY-42         # 查看历史
```

---

## 实施路线图

### Phase 1: 快速致胜 (Q1 2026, 3-5月)

| Sprint | 周次 | Epic | 核心任务 | 预计工时 |
|--------|------|------|----------|----------|
| **S1** | 3月 W1-2 | D | AIOSError 基类 + ErrorCodes 定义 | 16h |
| **S2** | 3月 W3-4 | D+A | doctor --fix 增强 + TourManager 接口 | 18h |
| **S3** | 4月 W1-2 | A | quickstart 命令 + 配置向导 | 20h |
| **S4** | 4月 W3-4 | B | AgentStateManager + agents status | 18h |
| **S5** | 5月 W1-2 | B+C | agents route + Story 数据模型 | 20h |

### Phase 2: 核心增强 (Q2 2026, 6-8月)

| Sprint | 周次 | Epic | 核心任务 | 预计工时 |
|--------|------|------|----------|----------|
| **S6** | 6月 W1-2 | C | StoryManager + story 命令组 | 18h |
| **S7** | 6月 W3-4 | C | ProgressAnalyzer + 依赖可视化 | 18h |
| **S8** | 7月 W1-2 | G | 文档搜索引擎 | 16h |
| **S9** | 7月 W3-4 | G | 上下文帮助集成 | 12h |
| **S10** | 8月 | 回顾 | H1 指标评估 + H2 规划 | 8h |

### Phase 3: 体验深化 (H2 2026)

| Epic | 功能 | 预计工时 |
|------|------|----------|
| E | 工作流可视化 + 瓶颈检测 | 45h |
| F | 智能辅助增强 + 学习模式 | 50h |

### Phase 4: 生态扩展 (2027)

| Epic | 功能 | 预计工时 |
|------|------|----------|
| H | 第三方集成 (Jira, Linear, Slack) | 80h |
| I | 企业级功能 (多项目, RBAC, 审计) | 90h |

---

## 依赖关系

### Epic 依赖图

```
                    ┌─────────────┐
                    │   Epic D    │
                    │ 错误处理基础 │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  Epic A   │    │  Epic B   │    │  Epic C   │
    │ 新手引导  │    │ 代理透明化│    │Story管理  │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          │    ┌───────────┴───────────┐    │
          │    ▼                       ▼    │
          └───►│      Epic G           │◄───┘
               │    文档可发现性        │
               └───────────┬───────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  Epic E   │    │  Epic F   │    │  (独立)   │
    │ 工作流可视│    │ 智能辅助  │    │           │
    └───────────┘    └───────────┘    └───────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌───────────┐ ┌───────────┐
              │  Epic H   │ │  Epic I   │
              │ 集成扩展  │ │ 企业协作  │
              └───────────┘ └───────────┘
```

### 并行开发可能性

| 并行组 | Epic | 依赖条件 |
|--------|------|----------|
| 组 1 | A + B + C | D 完成后可并行 |
| 组 2 | E + F | G 完成后可并行 |
| 组 3 | H + I | 所有 H1/H2 完成后 |

---

## 关键文件清单

### 需要新建的文件

| 文件路径 | 用途 | Epic |
|----------|------|------|
| `.aios-core/core/errors/index.js` | 错误处理入口 | D |
| `.aios-core/core/errors/base-error.js` | AIOSError 基类 | D |
| `.aios-core/core/errors/error-codes.yaml` | 错误代码定义 | D |
| `.aios-core/core/errors/error-formatter.js` | 错误格式化 | D |
| `.aios-core/core/errors/recovery-engine.js` | 恢复建议引擎 | D |
| `.aios-core/core/onboarding/index.js` | 新手引导入口 | A |
| `.aios-core/core/onboarding/tour-manager.js` | 引导流程管理 | A |
| `.aios-core/core/agent-state/index.js` | 代理状态入口 | B |
| `.aios-core/core/agent-state/state-manager.js` | 状态管理 | B |
| `.aios-core/core/agent-state/router.js` | 智能路由 | B |
| `.aios-core/core/story-lifecycle/index.js` | Story 管理入口 | C |
| `.aios-core/core/story-lifecycle/story-manager.js` | Story CRUD | C |
| `.aios-core/core/story-lifecycle/progress-analyzer.js` | 进度分析 | C |

### 需要修改的文件

| 文件路径 | 修改内容 | Epic |
|----------|----------|------|
| `.aios-core/cli/index.js` | 注册新命令 | 全部 |
| `bin/aios.js` | 集成错误处理 | D |
| `.aios-core/development/scripts/unified-activation-pipeline.js` | 添加状态写入 | B |
| `.aios-core/core/health-check/index.js` | 集成诊断 | D |

### 参考文件 (复用模式)

| 文件路径 | 复用内容 | Epic |
|----------|----------|------|
| `bin/utils/install-errors.js` | 错误模板模式 | D |
| `.aios-core/core/config/config-resolver.js` | 配置存储模式 | A, C |
| `.aios-core/core/ids/incremental-decision-engine.js` | 决策算法 | B |
| `.aios-core/core/health-check/engine.js` | 诊断执行 | D |

---

## 成功指标

### Horizon 1 (H1 2026)

| 指标 | 基线 | Q2 目标 | H1 目标 | 测量方法 |
|------|------|---------|---------|----------|
| 新用户 7 日留存率 | <20% | >40% | >50% | 分析系统 |
| 首次功能使用时间 | >30min | <10min | <5min | 引导完成时间 |
| 错误自助解决率 | <40% | >60% | >70% | doctor 成功率 |
| Story 创建时间 | >30min | <20min | <15min | 命令时间戳 |
| 代理选择准确率 | N/A | >80% | >90% | route 采纳率 |

### Horizon 2 (H2 2026)

| 指标 | 基线 | 目标 | 测量方法 |
|------|------|------|----------|
| 用户满意度 (NPS) | N/A | >40 | 用户调研 |
| 流程可见性评分 | N/A | >4.5/5 | 用户调研 |
| 建议采纳率 | N/A | >40% | suggest 统计 |
| 文档查找时间 | >2min | <30s | 搜索日志 |

### Horizon 3 (2027)

| 指标 | 基线 | 目标 | 测量方法 |
|------|------|------|----------|
| 企业客户数 | 0 | >10 | 销售记录 |
| 官方集成数 | 0 | >10 | 集成目录 |
| 社区插件数 | 0 | >50 | 插件市场 |
| API 调用 QPS | 0 | >1000 | 监控系统 |

---

## 风险评估与缓解

### 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 与现有代码冲突 | 中 | 高 | 渐进式迁移，保持向后兼容 |
| 性能下降 | 低 | 中 | 复用现有缓存系统，性能测试 |
| CLI 命令膨胀 | 中 | 中 | 命令分组，智能命令发现 |
| 代理状态丢失 | 低 | 高 | 多重存储策略，状态恢复机制 |

### 产品风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 功能未被采用 | 中 | 高 | 用户测试，快速迭代 |
| 引导过于冗长 | 中 | 中 | basic/advanced 模式，渐进揭示 |
| 错误信息过于简单 | 低 | 中 | 可配置详细程度 |
| Story 范围蔓延 | 高 | 中 | 严格 Story 验证门控 |

### 组织风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 开发资源不足 | 中 | 高 | 优先级排序，MVP 定义 |
| 需求变更频繁 | 中 | 中 | 敏捷迭代，快速响应 |

---

## 验证方法

### 单元测试

```bash
# 运行测试
npm test -- --coverage

# 目标: 新代码覆盖率 >80%
```

### 集成测试

```bash
# 错误处理
aios doctor --full              # 完整诊断
aios diagnose CFG_001           # 诊断特定错误
aios doctor --fix               # 自动修复

# 新手引导
aios quickstart                 # 快速开始
aios tour --reset               # 重置引导

# 代理状态
aios agents status              # 所有代理状态
aios agents route "implement login"  # 智能路由

# Story 管理
aios story list                 # Story 列表
aios story create --template=feature  # 创建 Story
aios story progress STORY-42    # 进度分析
```

### 端到端验证

1. **新用户流程:**
   ```
   npx aios-core install → aios quickstart → 5分钟完成 → 成功创建第一个 Story
   ```

2. **错误恢复流程:**
   ```
   遇到错误 → aios diagnose → 获得修复建议 → aios doctor --fix → 问题解决
   ```

3. **协作流程:**
   ```
   aios agents route "任务" → 获得代理推荐 → 激活代理 → 完成任务 → 交接
   ```

---

## 下一步行动

### 立即行动 (本周)

1. **创建 Story 文档**
   ```
   docs/stories/active/STORY-OPT-001/
   └── story.md - Epic D: 错误处理优化
   ```

2. **创建开发分支**
   ```bash
   git checkout -b feat/error-handling-enhancement
   ```

3. **开始 D1.1 任务**
   - 创建 `.aios-core/core/errors/` 目录
   - 实现 `base-error.js`

### 短期规划 (本月)

1. 完成 Sprint 1 任务 (D1.1 - D1.5)
2. 建立指标追踪基线
3. 设置 CI/CD 测试门禁

### 中期规划 (本季度)

1. 完成 Phase 1 (Epic D 基础 + Epic A 启动)
2. 建立用户反馈循环
3. 规划 Phase 2 详细任务

---

## 相关文档

- [功能迭代规划](功能迭代规划.md) - 原始产品规划
- [Constitution](../.aios-core/constitution.md) - 框架宪法
- [Architecture](architecture/ARCHITECTURE-INDEX.md) - 架构文档
- [User Guide](guides/user-guide.md) - 用户指南

---

**文档所有者:** @pm (Morgan)
**技术审核:** @architect (Aria)
**更新频率:** 每月审查
**版本:** v1.0
**最后更新:** 2026-02-20

---

_让 AI 代理协同工作，实现自主化软件开发_
