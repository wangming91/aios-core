/**
 * Agent State Module - 代理状态管理模块
 *
 * 提供代理激活、切换和协作追踪功能
 *
 * @module core/agent-state
 */

const { AgentStateManager, EventType: StateEventType } = require('./state-manager');
const { ActivityLog, EventType } = require('./activity-log');
const { CollaborationTracker } = require('./collaboration-tracker');

module.exports = {
  // 主要导出
  AgentStateManager,
  ActivityLog,
  CollaborationTracker,

  // 事件类型
  EventType: {
    ...EventType,
    ...StateEventType
  }
};
