import { questionBankManager } from "@/lib/question-bank-manager";
import type { QuestionVersion, QuestionVersionId, QuestionBankType } from "@/types/question-bank";
import { logger } from './logger';

export interface VersionStatus {
  versionId: QuestionVersionId;
  isAvailable: boolean;
  availableBanks: QuestionBankType[];
  lastChecked: number;
  error?: string;
}

export interface VersionStatusMap {
  [versionId: string]: VersionStatus;
}

export class VersionStatusManager {
  private statusCache: VersionStatusMap = {};
  private readonly CACHE_DURATION = 60 * 1000; // 缩短到1分钟
  private readonly SHORT_CACHE_DURATION = 10 * 1000; // 新增短缓存，用于不可用状态
  private checkingPromises: Map<string, Promise<VersionStatus>> = new Map();

  constructor() {
    // 监听配置文件更新事件
    if (typeof window !== 'undefined') {
      window.addEventListener('questionBankConfigUpdated', () => {
        logger.debug('配置文件已更新，清除版本状态缓存');
        this.clearCache();
      });
    }
  }

  /**
   * 获取版本状态，支持缓存
   */
  async getVersionStatus(versionId: QuestionVersionId, forceRefresh = false): Promise<VersionStatus> {
    const cacheKey = versionId;
    const now = Date.now();

    // 检查缓存是否有效
    if (!forceRefresh && this.statusCache[cacheKey]) {
      const cached = this.statusCache[cacheKey];
      const age = now - cached.lastChecked;

      // 根据状态类型使用不同缓存时间
      // 可用版本使用较长缓存时间，不可用的使用短缓存时间
      const maxAge = cached.isAvailable ? this.CACHE_DURATION : this.SHORT_CACHE_DURATION;

      if (age < maxAge) {
        return cached;
      }
    }

    // 检查是否正在检测中
    if (this.checkingPromises.has(cacheKey)) {
      return this.checkingPromises.get(cacheKey)!;
    }

    // 开始新的检测
    const checkPromise = this.checkVersionStatus(versionId);
    this.checkingPromises.set(cacheKey, checkPromise);

    try {
      const status = await checkPromise;
      this.statusCache[cacheKey] = status;
      return status;
    } finally {
      this.checkingPromises.delete(cacheKey);
    }
  }

  /**
   * 批量获取版本状态
   */
  async getAllVersionStatuses(forceRefresh = false): Promise<VersionStatus[]> {
    const versions = await questionBankManager.getAllVersions();
    const statusPromises = versions.map(version =>
      this.getVersionStatus(version.id, forceRefresh)
    );

    return Promise.all(statusPromises);
  }

  /**
   * 获取可用版本（有至少一个题库可用）
   */
  async getAvailableVersions(): Promise<QuestionVersion[]> {
    const allVersions = await questionBankManager.getAllVersions();

    // 优化：对于单版本情况，直接检查可用性
    if (allVersions.length === 1) {
      const version = allVersions[0];
      const status = await this.getVersionStatus(version.id);
      return status.isAvailable && status.availableBanks.length > 0 ? [version] : [];
    }

    // 多版本情况，并行检查
    const statusPromises = allVersions.map(async (version) => {
      const status = await this.getVersionStatus(version.id);
      return { version, status };
    });

    const results = await Promise.all(statusPromises);
    return results
      .filter(({ status }) => status.isAvailable && status.availableBanks.length > 0)
      .map(({ version }) => version);
  }

  /**
   * 刷新版本状态
   */
  async refreshVersionStatus(versionId: QuestionVersionId): Promise<VersionStatus> {
    return this.getVersionStatus(versionId, true);
  }

  /**
   * 刷新所有版本状态
   */
  async refreshAllVersionStatuses(): Promise<VersionStatus[]> {
    const allVersions = await questionBankManager.getAllVersions(true);
    const refreshPromises = allVersions.map(version =>
      this.refreshVersionStatus(version.id)
    );
    return Promise.all(refreshPromises);
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.statusCache = {};
    this.checkingPromises.clear();
  }

  /**
   * 实际检测版本状态
   */
  private async checkVersionStatus(versionId: QuestionVersionId): Promise<VersionStatus> {
    const availableBanks: QuestionBankType[] = [];

    try {
      // 并行检查所有题库类型
      const checkPromises = (['A', 'B', 'C'] as QuestionBankType[]).map(async (bank) => {
        const isAvailable = await questionBankManager.checkBankAvailable(versionId, bank);
        return { bank, isAvailable };
      });

      const results = await Promise.all(checkPromises);

      // 收集可用题库
      results.forEach(({ bank, isAvailable }) => {
        if (isAvailable) {
          availableBanks.push(bank);
        }
      });

      return {
        versionId,
        isAvailable: availableBanks.length > 0,
        availableBanks,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        versionId,
        isAvailable: false,
        availableBanks: [],
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 导出单例实例
export const versionStatusManager = new VersionStatusManager();
