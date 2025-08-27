import { questionBankManager } from "@/lib/question-bank-manager";
import type { QuestionItem } from "@/types/question";

/**
 * 存储迁移服务
 * 处理从旧版本存储格式到新版本的迁移
 */

// 旧版本的存储结构（用于迁移）
interface LegacyExamSavedState {
  version: 1;
  bank: string;
  timestamp: number;
  endAtMs: number;
  index: number;
  answersByPosition: (string[] | null)[];
  flagsByPosition: boolean[];
  total: number;
  questionIds?: (string | null)[];
  questionsSnapshot?: QuestionItem[];
}

interface LegacyPracticeSavedState {
  version: 1;
  bank: string;
  timestamp: number;
  index: number;
  order: "sequential" | "random";
  showAnswer: boolean;
  orderIndices: number[];
  answersByPosition: (string[] | null)[];
  total: number;
}

/**
 * 迁移考试存储数据
 */
export async function migrateExamStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 获取所有localStorage键
    const keys = Object.keys(window.localStorage);

    // 找到旧版本的考试存储
    const legacyExamKeys = keys.filter(key => key.startsWith('exam:savedState:') && !key.includes(':'));

    if (legacyExamKeys.length === 0) return;

    console.log('发现旧版本考试存储，正在迁移...');

    // 获取最新版本作为默认迁移目标
    const latestVersion = await questionBankManager.getLatestVersion();
    if (!latestVersion) {
      console.warn('未找到最新版本，跳过迁移');
      return;
    }

    for (const legacyKey of legacyExamKeys) {
      try {
        const raw = window.localStorage.getItem(legacyKey);
        if (!raw) continue;

        const legacyData: LegacyExamSavedState = JSON.parse(raw);

        // 只迁移版本1的数据
        if (legacyData.version !== 1) continue;

        // 创建新版本的数据结构
        const migratedData = {
          ...legacyData,
          version: 2 as const,
          versionId: latestVersion.id,
        };

        // 生成新key
        const newKey = `exam:savedState:${latestVersion.id}:${legacyData.bank}`;

        // 保存新版本数据
        window.localStorage.setItem(newKey, JSON.stringify(migratedData));

        // 删除旧版本数据
        window.localStorage.removeItem(legacyKey);

        console.log(`迁移考试存储: ${legacyKey} -> ${newKey}`);
      } catch (error) {
        console.error(`迁移考试存储失败 ${legacyKey}:`, error);
      }
    }

    console.log('考试存储迁移完成');
  } catch (error) {
    console.error('考试存储迁移过程出错:', error);
  }
}

/**
 * 迁移练习存储数据
 */
export async function migratePracticeStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 获取所有localStorage键
    const keys = Object.keys(window.localStorage);

    // 找到旧版本的练习存储（不包含版本信息的key）
    const legacyPracticeKeys = keys.filter(key =>
      key.startsWith('practice:') &&
      !key.includes('practice:lastMode') &&
      !key.includes('practice:noResumePrompt') &&
      key.split(':').length === 2
    );

    if (legacyPracticeKeys.length === 0) return;

    console.log('发现旧版本练习存储，正在迁移...');

    // 获取最新版本作为默认迁移目标
    const latestVersion = await questionBankManager.getLatestVersion();
    if (!latestVersion) {
      console.warn('未找到最新版本，跳过迁移');
      return;
    }

    for (const legacyKey of legacyPracticeKeys) {
      try {
        const raw = window.localStorage.getItem(legacyKey);
        if (!raw) continue;

        const legacyData: LegacyPracticeSavedState = JSON.parse(raw);

        // 只迁移版本1的数据
        if (legacyData.version !== 1) continue;

        // 创建新版本的数据结构
        const migratedData = {
          ...legacyData,
          version: 2 as const,
          versionId: latestVersion.id,
        };

        // 生成新key
        const newKey = `practice:${latestVersion.id}:${legacyData.bank}`;

        // 保存新版本数据
        window.localStorage.setItem(newKey, JSON.stringify(migratedData));

        // 删除旧版本数据
        window.localStorage.removeItem(legacyKey);

        console.log(`迁移练习存储: ${legacyKey} -> ${newKey}`);
      } catch (error) {
        console.error(`迁移练习存储失败 ${legacyKey}:`, error);
      }
    }

    console.log('练习存储迁移完成');
  } catch (error) {
    console.error('练习存储迁移过程出错:', error);
  }
}

/**
 * 迁移用户偏好设置
 */
export async function migratePreferenceStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 获取所有localStorage键
    const keys = Object.keys(window.localStorage);

    // 找到旧版本的无resume提示设置
    const legacyNoResumeKeys = keys.filter(key =>
      key.startsWith('practice:noResumePrompt:') &&
      key.split(':').length === 3
    );

    if (legacyNoResumeKeys.length === 0) return;

    console.log('发现旧版本偏好设置，正在迁移...');

    // 获取最新版本作为默认迁移目标
    const latestVersion = await questionBankManager.getLatestVersion();
    if (!latestVersion) {
      console.warn('未找到最新版本，跳过迁移');
      return;
    }

    for (const legacyKey of legacyNoResumeKeys) {
      try {
        const value = window.localStorage.getItem(legacyKey);
        if (!value) continue;

        // 解析旧key获取bank信息
        const parts = legacyKey.split(':');
        if (parts.length !== 3) continue;

        const bank = parts[2];

        // 生成新key
        const newKey = `practice:noResumePrompt:${latestVersion.id}:${bank}`;

        // 保存到新key
        window.localStorage.setItem(newKey, value);

        // 删除旧key
        window.localStorage.removeItem(legacyKey);

        console.log(`迁移偏好设置: ${legacyKey} -> ${newKey}`);
      } catch (error) {
        console.error(`迁移偏好设置失败 ${legacyKey}:`, error);
      }
    }

    console.log('偏好设置迁移完成');
  } catch (error) {
    console.error('偏好设置迁移过程出错:', error);
  }
}

/**
 * 执行所有存储迁移
 */
export async function migrateAllStorage(): Promise<void> {
  console.log('开始执行存储迁移...');

  await Promise.all([
    migrateExamStorage(),
    migratePracticeStorage(),
    migratePreferenceStorage()
  ]);

  console.log('所有存储迁移完成');
}

/**
 * 检查是否需要迁移
 */
export function needsMigration(): boolean {
  if (typeof window === "undefined") return false;

  const keys = Object.keys(window.localStorage);

  // 检查是否有旧版本的存储
  return keys.some(key =>
    (key.startsWith('exam:savedState:') && !key.includes(':')) ||
    (key.startsWith('practice:') && key.split(':').length === 2 && !key.includes('lastMode') && !key.includes('noResumePrompt')) ||
    (key.startsWith('practice:noResumePrompt:') && key.split(':').length === 3)
  );
}
