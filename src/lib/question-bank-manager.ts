import type { QuestionBankConfig, QuestionVersion, QuestionVersionId, QuestionBankType } from "@/types/question-bank";
import { logger } from './logger';
import { handleError, NetworkError, ValidationError, NotFoundError } from './error-handler';

export class QuestionBankManager {
  private config: QuestionBankConfig | null = null;
  private configVersion: string | null = null;

  async loadConfig(forceRefresh = false): Promise<QuestionBankConfig> {
    try {
      // 只有在强制刷新时才清除缓存
      if (forceRefresh) {
        this.config = null;
        this.configVersion = null;
      }

      if (this.config && !forceRefresh) return this.config;

      // 使用 no-cache 避免浏览器缓存问题，同时添加时间戳参数防止缓存
      const timestamp = Date.now();
      const response = await fetch(`/questions/config.json?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new NetworkError(`Failed to load question bank config: ${response.status} ${response.statusText}`);
      }

      const newConfig = await response.json();
      if (!newConfig) {
        throw new ValidationError('Invalid question bank config: empty response');
      }

      // 检查配置文件是否更新
      if (this.configVersion && newConfig.version !== this.configVersion) {
        logger.debug('Configuration file updated, clearing related cache');
        this.clearRelatedCache();
      }

      this.config = newConfig;
      this.configVersion = newConfig.version;
      return newConfig;
    } catch (error) {
      throw handleError(error, 'QuestionBankManager.loadConfig');
    }
  }

  private clearRelatedCache(): void {
    // 清除版本状态缓存
    if (typeof window !== 'undefined') {
      try {
        // 发送事件通知其他组件配置文件已更新
        window.dispatchEvent(new CustomEvent('questionBankConfigUpdated'));
      } catch (error) {
        handleError(error, 'QuestionBankManager.clearRelatedCache');
      }
    }
  }

  // 提供强制刷新方法
  async refreshConfig(): Promise<QuestionBankConfig> {
    return this.loadConfig(true);
  }

  // 获取当前配置版本
  getConfigVersion(): string | null {
    return this.configVersion;
  }

  async getLatestVersion(): Promise<QuestionVersion | null> {
    const config = await this.loadConfig();
    return config.versions.find(v => v.isLatest) || null;
  }

  async getVersion(versionId: QuestionVersionId, forceRefresh = false): Promise<QuestionVersion | null> {
    const config = await this.loadConfig(forceRefresh);
    return config.versions.find(v => v.id === versionId) || null;
  }

  async getAllVersions(forceRefresh = false): Promise<QuestionVersion[]> {
    const config = await this.loadConfig(forceRefresh);
    return config.versions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async resolveQuestionsUrl(versionId: QuestionVersionId, bank: QuestionBankType): Promise<string> {
    try {
      const version = await this.getVersion(versionId);
      if (!version) {
        throw new NotFoundError(`Version ${versionId} not found`);
      }

      // 兼容性处理：将版本路径映射到实际文件
      // 当前版本直接使用根目录下的文件
      const path = version.banks[bank].path;

      // 如果是标准的根目录路径，直接返回
      if (path.startsWith('/questions/') && !path.includes('/questions/202')) {
        return path;
      }

      // 如果是版本目录路径，映射到实际文件
      // 例如: /questions/2025-10/A.json -> /questions/A.json
      const match = path.match(/^\/questions\/[^\/]+\/([ABC]\.json)$/);
      if (match) {
        return `/questions/${match[1]}`;
      }

      return path;
    } catch (error) {
      throw handleError(error, 'QuestionBankManager.resolveQuestionsUrl');
    }
  }

  async checkBankAvailable(versionId: QuestionVersionId, bank: QuestionBankType): Promise<boolean> {
    try {
      const url = await this.resolveQuestionsUrl(versionId, bank);
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return false;

      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      logger.debug(`Bank ${bank} not available for version ${versionId}`, error);
      return false;
    }
  }

  async getAvailableBanks(versionId: QuestionVersionId): Promise<QuestionBankType[]> {
    const availableBanks: QuestionBankType[] = [];

    for (const bank of ['A', 'B', 'C'] as QuestionBankType[]) {
      if (await this.checkBankAvailable(versionId, bank)) {
        availableBanks.push(bank);
      }
    }

    return availableBanks;
  }
}

// 导出单例实例
export const questionBankManager = new QuestionBankManager();
