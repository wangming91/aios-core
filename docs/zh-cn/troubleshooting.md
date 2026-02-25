<!--
  Translation: ZH-CN (简体中文)
  Original: /docs/troubleshooting.md
  Last sync: 2026-02-24
-->

# Synkra AIOS 故障排除指南

> 🌐 **ZH-CN** | [EN](../troubleshooting.md) | [PT](../pt/troubleshooting.md) | [ES](../es/troubleshooting.md)

---

本综合指南帮助你诊断和解决 Synkra AIOS 的常见问题。

## 目录

1. [快速诊断](#快速诊断)
2. [安装问题](#安装问题)
3. [代理问题](#代理问题)
4. [性能问题](#性能问题)
5. [API 和集成问题](#api-和集成问题)
6. [安全和权限错误](#安全和权限错误)
7. [平台特定问题](#平台特定问题)
8. [高级故障排除](#高级故障排除)
9. [获取帮助](#获取帮助)

## 快速诊断

### 运行系统诊断

始终从内置诊断开始：

```bash
# 基础诊断
npx @synkra/aios-core doctor

# 自动修复常见问题
npx @synkra/aios-core doctor --fix

# 详细输出
npx @synkra/aios-core doctor --verbose

# 检查特定组件
npx @synkra/aios-core doctor --component memory-layer
```

### 常见快速修复

```bash
# 清除所有缓存
rm -rf .aios/cache/*

# 重建内存索引
*memory rebuild

# 重置配置
*config --reset

# 更新到最新版本
npx @synkra/aios-core update
```

## 安装问题

### 问题：找不到 NPX 命令

**症状：**
```
bash: npx: command not found
```

**解决方案：**
```bash
# 检查 npm 版本
npm --version

# 如果 npm < 5.2，全局安装 npx
npm install -g npx

# 或直接使用 npm
npm exec @synkra/aios-core init my-project
```

### 问题：安装因权限错误失败

**症状：**
```
Error: EACCES: permission denied
```

**解决方案：**

**选项 1：修复 npm 权限（推荐）**
```bash
# 创建 npm 目录
mkdir ~/.npm-global

# 配置 npm
npm config set prefix '~/.npm-global'

# 添加到 PATH（添加到 ~/.bashrc 或 ~/.zshrc）
export PATH=~/.npm-global/bin:$PATH

# 重新加载 shell
source ~/.bashrc
```

**选项 2：使用不同目录**
```bash
# 在用户目录安装
cd ~
npx @synkra/aios-core init my-project
```

### 问题：Node.js 版本错误

**症状：**
```
Error: Node.js version 18.0.0 or higher required
```

**解决方案：**
```bash
# 检查当前版本
node --version

# 更新 Node.js
# macOS（使用 Homebrew）
brew upgrade node

# Windows（使用 Chocolatey）
choco upgrade nodejs

# Linux（使用 NodeSource）
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 nvm（Node 版本管理器）
nvm install 18
nvm use 18
```

### 问题：安装卡住或超时

**症状：**
- 安装卡在 "Installing dependencies..."
- 网络超时错误

**解决方案：**

```bash
# 使用不同注册表
npm config set registry https://registry.npmmirror.com/

# 清除 npm 缓存
npm cache clean --force

# 使用 verbose 模式查看进度
npx @synkra/aios-core init my-project --verbose
```

## 代理问题

### 问题：代理无响应

**症状：**
- 激活代理后没有响应
- 命令被忽略

**解决方案：**

1. **验证 IDE 支持**
   ```bash
   # 检查 IDE 兼容性
   npx @synkra/aios-core doctor --component ide
   ```

2. **刷新代理文件**
   ```bash
   npm run sync:ide
   ```

3. **重启会话**
   - 关闭并重新打开 IDE/CLI
   - 清除任何缓存的会话状态

### 问题：命令未识别

**症状：**
```
Unknown command: *create-prd
```

**解决方案：**

```bash
# 检查可用命令
*help

# 确保你使用了正确的代理
@pm *create-prd  # 不是 @dev *create-prd

# 验证代理定义
npx @synkra/aios-core validate:agents
```

### 问题：代理行为异常

**症状：**
- 代理提供不一致的建议
- 代理忘记上下文

**解决方案：**

```bash
# 重建记忆索引
*memory rebuild

# 清除会话状态
rm -rf .aios/session/*

# 重新激活代理
*exit
@dev
```

## 性能问题

### 问题：操作缓慢

**症状：**
- 命令执行时间长
- 超时错误

**解决方案：**

```bash
# 检查系统资源
npx @synkra/aios-core doctor --component performance

# 清除缓存
rm -rf .aios/cache/*

# 减少上下文大小
*memory prune --older-than 30d
```

### 问题：内存使用过高

**症状：**
- 高 RAM 使用率
- 系统变慢

**解决方案：**

```bash
# 检查内存使用
*memory status

# 清理旧记忆
*memory prune --older-than 30d

# 限制记忆保留
# 编辑 .aios-core/core-config.yaml
memory:
  maxEntries: 1000
  retentionDays: 30
```

## API 和集成问题

### 问题：API 认证失败

**症状：**
```
Error: Invalid API key
```

**解决方案：**

```bash
# 检查 API 密钥配置
npx @synkra/aios-core config show

# 更新 API 密钥
export ANTHROPIC_API_KEY=your-key-here

# 或在配置文件中设置
# .aios-core/core-config.yaml
ai:
  provider: anthropic
  apiKey: ${ANTHROPIC_API_KEY}
```

### 问题：MCP 服务器连接失败

**症状：**
```
Error: Failed to connect to MCP server
```

**解决方案：**

```bash
# 检查 MCP 状态
npx @synkra/aios-core mcp status

# 重启 MCP 服务器
npx @synkra/aios-core mcp restart

# 验证 MCP 配置
npx @synkra/aios-core validate:mcp
```

## 安全和权限错误

### 问题：Git 操作被拒绝

**症状：**
```
Error: Git push denied
```

**解决方案：**

```bash
# 验证使用正确的代理
# 只有 @devops 可以 push
@devops *push

# 检查 git 配置
git config --list

# 验证远程访问
git remote -v
```

### 问题：文件权限错误

**症状：**
```
Error: EACCES: permission denied
```

**解决方案：**

```bash
# 检查文件权限
ls -la .aios-core/

# 修复权限
chmod -R u+rw .aios-core/

# 如果需要，更改所有权
chown -R $(whoami) .aios-core/
```

## 平台特定问题

### macOS 特定

```bash
# 如果遇到 "too many open files" 错误
ulimit -n 10240

# 添加到 shell 配置以持久化
echo "ulimit -n 10240" >> ~/.zshrc
```

### Windows 特定

```powershell
# 如果遇到执行策略错误
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 如果遇到路径长度问题
# 启用长路径支持（需要管理员）
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Linux 特定

```bash
# 如果遇到内存问题
# 增加可用内存
sudo sysctl vm.overcommit_memory=1

# 持久化更改
echo "vm.overcommit_memory=1" | sudo tee -a /etc/sysctl.conf
```

## 高级故障排除

### 启用调试模式

```bash
# 启用详细日志
export AIOS_DEBUG=true

# 运行带调试的命令
npx @synkra/aios-core doctor --verbose --debug
```

### 检查日志

```bash
# 查看最近日志
tail -f .aios/logs/agent.log

# 查看特定组件日志
cat .aios/logs/memory.log
cat .aios/logs/workflow.log
```

### 完全重置

```bash
# ⚠️ 警告：这将删除所有 AIOS 数据

# 备份配置
cp -r .aios-core/core-config.yaml ~/aios-backup/

# 删除 AIOS 数据
rm -rf .aios/
rm -rf .aios-core/

# 重新安装
npx @synkra/aios-core install
```

## 获取帮助

### 日志收集

在报告问题前，收集诊断信息：

```bash
# 生成诊断报告
npx @synkra/aios-core doctor --report > diagnostics.txt

# 包含系统信息
node --version >> diagnostics.txt
npm --version >> diagnostics.txt
git --version >> diagnostics.txt
```

### 支持渠道

| 渠道 | 用途 |
| --- | --- |
| **GitHub Issues** | Bug 报告和功能请求 |
| **Discord** | 社区支持和讨论 |
| **文档** | 使用指南和教程 |

### 报告 Bug

报告问题时，请包含：

1. 诊断报告输出
2. 重现步骤
3. 预期行为
4. 实际行为
5. 环境信息（OS、Node 版本等）

---

*Synkra AIOS 故障排除指南 - 中文版*
