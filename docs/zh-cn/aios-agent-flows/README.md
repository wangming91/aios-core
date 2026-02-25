<!--
  Translation: ZH-CN (简体中文)
  Original: /docs/aios-agent-flows/README.md
  Last sync: 2026-02-24
-->

# AIOS 代理流程 - 代理详细文档

> 🌐 **ZH-CN** | [EN](../../en/aios-agent-flows/README.md) | [ES](../../es/aios-agent-flows/README.md) | [PT](../../aios-agent-flows/README.md)

---

**版本:** 1.0.0
**最后更新:** 2026-02-24
**状态:** 官方文档

---

## 概述

此文件夹包含 AIOS 所有代理的详细文档，包括：

- 每个代理的**完整系统**说明
- 操作的 **Mermaid 流程图**
- 命令到任务的**映射**
- 代理之间的**集成**
- 涉及每个代理的**工作流**
- **最佳实践**和故障排除

---

## 已文档化的代理

| 代理 | 角色 | 原型 | 文档 |
| --- | --- | --- | --- |
| **@aios-master** | Orion | 编排者 | [aios-master-system.md](./aios-master-system.md) |
| **@analyst** | Atlas | 研究员 | [analyst-system.md](./analyst-system.md) |
| **@architect** | Aria | 愿景者 | [architect-system.md](./architect-system.md) |
| **@data-engineer** | Dara | 数据专家 | [data-engineer-system.md](./data-engineer-system.md) |
| **@dev** | Dex | 构建者 | [dev-system.md](./dev-system.md) |
| **@devops** | Gage | 守护者 | [devops-system.md](./devops-system.md) |
| **@pm** | Morgan | 策略师 | [pm-system.md](./pm-system.md) |
| **@qa** | Quinn | 守护者 | [qa-system.md](./qa-system.md) |
| **@sm** | River | 促进者 | [sm-system.md](./sm-system.md) |
| **@squad-creator** | Nova | 创造者 | [squad-creator-system.md](./squad-creator-system.md) |
| **@ux-design-expert** | Uma | 设计师 | [ux-design-expert-system.md](./ux-design-expert-system.md) |

---

## 每个文档的结构

每个代理文档遵循此标准结构：

```
1. 概述
   - 主要职责
   - 核心原则

2. 完整文件列表
   - 核心任务
   - 代理定义
   - 模板
   - 检查清单
   - 相关文件

3. 系统流程图
   - 完整 Mermaid 图
   - 操作流程

4. 命令映射
   - 命令 → 任务
   - 参数和选项

5. 相关工作流
   - 使用该代理的工作流
   - 代理在每个工作流中的角色

6. 代理间集成
   - 从谁那里接收输入
   - 向谁交付输出
   - 协作关系

7. 配置
   - 配置文件
   - 可用工具
   - 约束

8. 最佳实践
   - 何时使用
   - 避免什么

9. 故障排除
   - 常见问题
   - 解决方案

10. 更新日志
    - 版本历史
```

---

## 代理关系图

```mermaid
flowchart TB
    subgraph ORCHESTRATION["编排层"]
        MASTER["@aios-master\n(Orion)"]
    end

    subgraph DISCOVERY["发现与规划"]
        ANALYST["@analyst\n(Atlas)"]
        PM["@pm\n(Morgan)"]
    end

    subgraph DESIGN["设计与架构"]
        ARCHITECT["@architect\n(Aria)"]
        UX["@ux-design-expert\n(Uma)"]
        DATA["@data-engineer\n(Dara)"]
    end

    subgraph MANAGEMENT["管理层"]
        PO["@po\n(Pax)"]
        SM["@sm\n(River)"]
    end

    subgraph EXECUTION["执行层"]
        DEV["@dev\n(Dex)"]
        QA["@qa\n(Quinn)"]
        DEVOPS["@devops\n(Gage)"]
    end

    MASTER --> ANALYST
    MASTER --> PM
    ANALYST --> PM
    PM --> UX
    PM --> ARCHITECT
    UX --> ARCHITECT
    ARCHITECT --> DATA
    ARCHITECT --> PO
    PO --> SM
    SM --> DEV
    DEV --> QA
    QA --> DEVOPS

    style MASTER fill:#e3f2fd
    style EXECUTION fill:#c8e6c9
```

---

## 如何使用此文档

### 理解代理

1. 访问所需代理的文档
2. 阅读**概述**了解角色
3. 查看**命令**了解能做什么
4. 查看**工作流**了解上下文

### 调试问题

1. 直接转到**故障排除**部分
2. 查看**流程图**了解流程
3. 检查**集成**了解依赖关系

### 扩展系统

1. 分析**文件列表**了解要修改什么
2. 遵循**最佳实践**保持一致性
3. 更改后更新**更新日志**

---

## 与其他文档的关系

| 文档 | 位置 | 用途 |
| --- | --- | --- |
| 代理参考指南 | [docs/agent-reference-guide.md](../agent-reference-guide.md) | 快速参考 |
| 工作流指南 | [docs/guides/workflows-guide.md](../guides/workflows-guide.md) | 工作流指南 |
| AIOS 工作流 | [docs/aios-workflows/](../aios-workflows/) | 工作流详情 |
| 架构 | [docs/architecture/](../architecture/) | 技术架构 |

---

## 贡献

添加或更新代理文档：

1. 遵循上述标准结构
2. 包含更新的 Mermaid 图
3. 保持更新日志更新
4. 创建 EN、ES 和 ZH-CN 翻译

---

*AIOS 代理流程文档 v1.0 - 代理系统详细文档*
