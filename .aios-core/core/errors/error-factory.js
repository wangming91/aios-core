/**
 * ErrorFactory - 简化 AIOSError 创建的工厂类
 *
 * 提供便捷方法创建各类错误，自动从 error-codes.yaml 加载定义
 *
 * @module .aios-core/core/errors/error-factory
 * @version 2.0.0
 * @story ERR-001: Unified Error System
 */

const AIOSError = require('./base-error');
const ErrorCodes = require('./error-codes');

/**
 * ErrorFactory - 静态工厂类
 *
 * @example
 * // 使用预定义错误码
 * throw ErrorCodes.create('FIL_001', { path: '/config.yaml' });
 *
 * // 快捷方法
 * throw ErrorFactory.fileNotFound('/config.yaml');
 * throw ErrorFactory.agentNotFound('dev');
 */
class ErrorFactory {
  /**
   * 从错误码创建 AIOSError
   * @param {string} code - 错误码 (e.g., 'FIL_001')
   * @param {Object} [variables={}] - 变量插值
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static create(code, variables = {}, extra = {}) {
    const errorDef = ErrorCodes.getError(code);

    if (!errorDef) {
      // 未知错误码，返回通用错误
      return new AIOSError(code, `Unknown error code: ${code}`, {
        category: 'GENERAL',
        severity: 'ERROR',
        context: { originalCode: code, variables },
      });
    }

    // 插值变量
    const interpolated = ErrorCodes.interpolate(errorDef, variables);

    return new AIOSError(interpolated.code, interpolated.message, {
      category: interpolated.category,
      severity: interpolated.severity,
      recoverable: interpolated.recoverable,
      recoverySteps: interpolated.recoverySteps,
      docUrl: interpolated.docUrl,
      userMessage: interpolated.userMessage,
      context: { ...extra, ...variables },
    });
  }

  // ============================================================
  // 文件错误快捷方法
  // ============================================================

  /**
   * 文件未找到错误
   * @param {string} path - 文件路径
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static fileNotFound(path, extra = {}) {
    return ErrorFactory.create('FIL_001', { path }, extra);
  }

  /**
   * 文件读取错误
   * @param {string} path - 文件路径
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static fileReadError(path, extra = {}) {
    return ErrorFactory.create('FIL_002', { path }, extra);
  }

  /**
   * 文件写入错误
   * @param {string} path - 文件路径
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static fileWriteError(path, extra = {}) {
    return ErrorFactory.create('FIL_003', { path }, extra);
  }

  /**
   * 目录未找到错误
   * @param {string} path - 目录路径
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static directoryNotFound(path, extra = {}) {
    return ErrorFactory.create('FIL_004', { path }, extra);
  }

  // ============================================================
  // Agent 错误快捷方法
  // ============================================================

  /**
   * Agent 未找到错误
   * @param {string} agentName - Agent 名称
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static agentNotFound(agentName, extra = {}) {
    return ErrorFactory.create('AGT_001', { agentName }, extra);
  }

  /**
   * Agent 激活失败错误
   * @param {string} agentName - Agent 名称
   * @param {string} reason - 失败原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static agentActivationFailed(agentName, reason, extra = {}) {
    return ErrorFactory.create('AGT_002', { agentName, reason }, extra);
  }

  /**
   * Agent 超时错误
   * @param {string} agentName - Agent 名称
   * @param {number} seconds - 超时秒数
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static agentTimeout(agentName, seconds, extra = {}) {
    return ErrorFactory.create('AGT_003', { agentName, seconds }, extra);
  }

  // ============================================================
  // 配置错误快捷方法
  // ============================================================

  /**
   * 配置文件未找到错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static configNotFound(extra = {}) {
    return ErrorFactory.create('CFG_001', {}, extra);
  }

  /**
   * 配置值无效错误
   * @param {string} field - 字段名
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static configInvalidValue(field, extra = {}) {
    return ErrorFactory.create('CFG_002', { field }, extra);
  }

  /**
   * 配置解析错误
   * @param {string} file - 文件名
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static configParseError(file, extra = {}) {
    return ErrorFactory.create('CFG_003', { file }, extra);
  }

  // ============================================================
  // Git 错误快捷方法
  // ============================================================

  /**
   * 非 Git 仓库错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static notGitRepo(extra = {}) {
    return ErrorFactory.create('GIT_001', {}, extra);
  }

  /**
   * Git 合并冲突错误
   * @param {string} files - 冲突文件
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static gitMergeConflict(files, extra = {}) {
    return ErrorFactory.create('GIT_002', { files }, extra);
  }

  /**
   * Git push 被拒绝错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static gitPushRejected(reason, extra = {}) {
    return ErrorFactory.create('GIT_003', { reason }, extra);
  }

  /**
   * 未提交变更警告
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static uncommittedChanges(extra = {}) {
    return ErrorFactory.create('GIT_004', {}, extra);
  }

  // ============================================================
  // 网络错误快捷方法
  // ============================================================

  /**
   * 网络请求失败错误
   * @param {string} url - URL
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static networkError(url, extra = {}) {
    return ErrorFactory.create('NET_001', { url }, extra);
  }

  /**
   * API 限流错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static rateLimitExceeded(extra = {}) {
    return ErrorFactory.create('NET_002', {}, extra);
  }

  /**
   * 认证失败错误
   * @param {string} service - 服务名
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static authFailed(service, extra = {}) {
    return ErrorFactory.create('NET_003', { service }, extra);
  }

  // ============================================================
  // 验证错误快捷方法
  // ============================================================

  /**
   * 无效输入错误
   * @param {string} field - 字段名
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static invalidInput(field, reason, extra = {}) {
    return ErrorFactory.create('VAL_001', { field, reason }, extra);
  }

  /**
   * 必填字段缺失错误
   * @param {string} field - 字段名
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static requiredFieldMissing(field, extra = {}) {
    return ErrorFactory.create('VAL_002', { field }, extra);
  }

  /**
   * 值超出范围错误
   * @param {string} field - 字段名
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static valueOutOfRange(field, min, max, extra = {}) {
    return ErrorFactory.create('VAL_003', { field, min, max }, extra);
  }

  // ============================================================
  // 项目错误快捷方法
  // ============================================================

  /**
   * 项目未初始化错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static projectNotInitialized(extra = {}) {
    return ErrorFactory.create('PRJ_001', {}, extra);
  }

  /**
   * 项目版本不匹配错误
   * @param {string} expected - 期望版本
   * @param {string} actual - 实际版本
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static projectVersionMismatch(expected, actual, extra = {}) {
    return ErrorFactory.create('PRJ_002', { expected, actual }, extra);
  }

  /**
   * 依赖未找到错误
   * @param {string} name - 依赖名
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static dependencyNotFound(name, extra = {}) {
    return ErrorFactory.create('PRJ_004', { name }, extra);
  }

  // ============================================================
  // 通用错误快捷方法
  // ============================================================

  /**
   * 未知错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static unknownError(extra = {}) {
    return ErrorFactory.create('GEN_001', {}, extra);
  }

  /**
   * 操作取消错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static operationCancelled(extra = {}) {
    return ErrorFactory.create('GEN_002', {}, extra);
  }

  /**
   * 功能未实现错误
   * @param {string} feature - 功能名
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static featureNotImplemented(feature, extra = {}) {
    return ErrorFactory.create('GEN_003', { feature }, extra);
  }

  // ============================================================
  // 构建错误快捷方法
  // ============================================================

  /**
   * 构建状态未找到错误
   * @param {string} storyId - Story ID
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static buildStateNotFound(storyId, extra = {}) {
    return ErrorFactory.create('BLD_001', { storyId }, extra);
  }

  /**
   * 构建已完成错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static buildAlreadyCompleted(extra = {}) {
    return ErrorFactory.create('BLD_002', {}, extra);
  }

  /**
   * 构建状态未加载错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static buildStateNotLoaded(extra = {}) {
    return ErrorFactory.create('BLD_003', {}, extra);
  }

  /**
   * 无效构建状态错误
   * @param {string} errors - 错误列表
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static invalidBuildState(errors, extra = {}) {
    return ErrorFactory.create('BLD_004', { errors }, extra);
  }

  /**
   * 构建状态加载失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static buildStateLoadFailed(reason, extra = {}) {
    return ErrorFactory.create('BLD_005', { reason }, extra);
  }

  /**
   * 构建已放弃错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static buildAbandoned(reason, extra = {}) {
    return ErrorFactory.create('BLD_006', { reason }, extra);
  }

  // ============================================================
  // IDS 错误快捷方法
  // ============================================================

  /**
   * IDS 注册表加载失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsRegistryLoadFailed(reason, extra = {}) {
    return ErrorFactory.create('IDS_004', { reason }, extra);
  }

  /**
   * IDS 实体检索失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsEntitiesRetrieveFailed(reason, extra = {}) {
    return ErrorFactory.create('IDS_005', { reason }, extra);
  }

  /**
   * IDS 注册表写入失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsRegistryWriteFailed(reason, extra = {}) {
    return ErrorFactory.create('IDS_006', { reason }, extra);
  }

  /**
   * IDS 注册表锁获取失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsLockAcquireFailed(reason, extra = {}) {
    return ErrorFactory.create('IDS_007', { reason }, extra);
  }

  /**
   * IDS 备份创建失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsBackupCreateFailed(reason, extra = {}) {
    return ErrorFactory.create('IDS_008', { reason }, extra);
  }

  /**
   * IDS 备份未找到错误
   * @param {string} batchId - 批次 ID
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsBackupNotFound(batchId, extra = {}) {
    return ErrorFactory.create('IDS_009', { batchId }, extra);
  }

  /**
   * IDS 回滚失败错误
   * @param {string} reason - 原因
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static idsRollbackFailed(reason, extra = {}) {
    return ErrorFactory.create('IDS_010', { reason }, extra);
  }

  // ============================================================
  // Session 错误快捷方法
  // ============================================================

  /**
   * 无活跃会话错误
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static noActiveSession(extra = {}) {
    return ErrorFactory.create('SES_001', {}, extra);
  }

  /**
   * 会话未找到错误
   * @param {string} sessionId - 会话 ID
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static sessionNotFound(sessionId, extra = {}) {
    return ErrorFactory.create('SES_002', { sessionId }, extra);
  }

  /**
   * 不支持的导出格式错误
   * @param {string} format - 格式
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static unsupportedExportFormat(format, extra = {}) {
    return ErrorFactory.create('SES_003', { format }, extra);
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 检查错误码是否存在
   * @param {string} code - 错误码
   * @returns {boolean}
   */
  static hasCode(code) {
    return ErrorCodes.hasError(code);
  }

  /**
   * 获取所有错误码
   * @returns {string[]}
   */
  static getAllCodes() {
    return ErrorCodes.getAllCodes();
  }

  /**
   * 获取所有类别
   * @returns {Object}
   */
  static getCategories() {
    return ErrorCodes.getCategories();
  }

  /**
   * 将普通 Error 转换为 AIOSError
   * @param {Error} error - 原始错误
   * @param {string} [code='GEN_001'] - 错误码
   * @param {Object} [extra={}] - 额外上下文
   * @returns {AIOSError}
   */
  static wrap(error, code = 'GEN_001', extra = {}) {
    if (error instanceof AIOSError) {
      return error;
    }

    const aiosError = ErrorFactory.create(code, {}, {
      ...extra,
      originalMessage: error.message,
      originalStack: error.stack,
    });

    // 保留原始堆栈
    aiosError.stack = error.stack;

    return aiosError;
  }
}

module.exports = ErrorFactory;
