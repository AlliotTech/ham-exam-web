import type { QuestionBankConfig, QuestionVersion, QuestionVersionId, QuestionBankType } from "@/types/question-bank";

export class QuestionBankManager {
  private config: QuestionBankConfig | null = null;

  async loadConfig(): Promise<QuestionBankConfig> {
    if (this.config) return this.config;

    const response = await fetch('/questions/config.json', { cache: 'force-cache' });
    if (!response.ok) throw new Error('Failed to load question bank config');

    this.config = await response.json();
    if (!this.config) throw new Error('Invalid question bank config');
    return this.config;
  }

  async getLatestVersion(): Promise<QuestionVersion | null> {
    const config = await this.loadConfig();
    return config.versions.find(v => v.isLatest) || null;
  }

  async getVersion(versionId: QuestionVersionId): Promise<QuestionVersion | null> {
    const config = await this.loadConfig();
    return config.versions.find(v => v.id === versionId) || null;
  }

  async getAllVersions(): Promise<QuestionVersion[]> {
    const config = await this.loadConfig();
    return config.versions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async resolveQuestionsUrl(versionId: QuestionVersionId, bank: QuestionBankType): Promise<string> {
    const version = await this.getVersion(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);

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
  }

  async checkBankAvailable(versionId: QuestionVersionId, bank: QuestionBankType): Promise<boolean> {
    try {
      const url = await this.resolveQuestionsUrl(versionId, bank);
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return false;

      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    } catch {
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
