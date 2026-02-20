/**
 * Story Lifecycle Module - Story 生命周期管理模块
 *
 * 提供 Story 创建、读取、更新、删除和搜索功能
 *
 * @module core/story-lifecycle
 */

const { StoryManager } = require('./story-manager');
const {
  StoryModel,
  StoryStatus,
  StoryType,
  StoryPriority,
  DEFAULT_STORY_TEMPLATE
} = require('./story-model');

module.exports = {
  // 主要导出
  StoryManager,
  StoryModel,

  // 枚举
  StoryStatus,
  StoryType,
  StoryPriority,

  // 模板
  DEFAULT_STORY_TEMPLATE
};
