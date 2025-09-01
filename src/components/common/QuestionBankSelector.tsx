"use client";

import { useEffect, useState, useCallback } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// 刷新按钮状态枚举
enum RefreshState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// 错误类型枚举
enum ErrorType {
  NETWORK = 'network',
  CONFIG = 'config',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}
import { questionBankManager } from "@/lib/question-bank-manager";
import { versionStatusManager } from "@/lib/version-status-manager";
import { logger } from '@/lib/logger';
import type { QuestionVersion, QuestionVersionId, QuestionBankType } from "@/types/question-bank";

interface QuestionBankSelectorProps {
  selectedVersion: QuestionVersionId | undefined;
  selectedBank: QuestionBankType;
  onVersionChange: (versionId: QuestionVersionId) => void;
  onBankChange: (bank: QuestionBankType) => void;
  disabled?: boolean;
}

interface VersionWithStatus extends QuestionVersion {
  status?: {
    isAvailable: boolean;
    availableBanks: QuestionBankType[];
    error?: string;
  };
  isLoading?: boolean;
}

export function QuestionBankSelector({
  selectedVersion,
  selectedBank,
  onVersionChange,
  onBankChange,
  disabled = false,
}: QuestionBankSelectorProps) {
  const [versions, setVersions] = useState<VersionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshState, setRefreshState] = useState<RefreshState>(RefreshState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  const loadVersionsWithStatus = useCallback(() => {
    const performLoad = async () => {
      try {
        setLoading(true);
        const [allVersions, statusResults] = await Promise.all([
          questionBankManager.getAllVersions(),
          versionStatusManager.getAllVersionStatuses()
        ]);

        // 合并版本信息和状态信息
        const versionsWithStatus: VersionWithStatus[] = allVersions.map(version => {
          const status = statusResults.find(s => s.versionId === version.id);
          return {
            ...version,
            status: status ? {
              isAvailable: status.isAvailable,
              availableBanks: status.availableBanks,
              error: status.error,
            } : undefined,
            isLoading: !status,
          };
        });

        setVersions(versionsWithStatus);

        // 如果没有选择版本，默认选择最新可用版本
        if (!selectedVersion && versionsWithStatus.length > 0) {
          const latestAvailable = versionsWithStatus.find(v => v.isLatest && v.status?.isAvailable) ||
                                versionsWithStatus.find(v => v.status?.isAvailable) ||
                                versionsWithStatus[0];
          if (latestAvailable) {
            onVersionChange(latestAvailable.id);
          }
        }
      } catch (error) {
        logger.error("Failed to load question bank versions", error);
      } finally {
        setLoading(false);
      }
    };

    performLoad();
  }, [selectedVersion, onVersionChange]);

  useEffect(() => {
    loadVersionsWithStatus();
  }, [loadVersionsWithStatus]);

  // 监听配置文件更新事件
  useEffect(() => {
    const handleConfigUpdate = () => {
      logger.debug('检测到配置文件更新，重新加载版本信息');
      loadVersionsWithStatus();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('questionBankConfigUpdated', handleConfigUpdate);
      return () => {
        window.removeEventListener('questionBankConfigUpdated', handleConfigUpdate);
      };
    }
  }, [loadVersionsWithStatus]);

  useEffect(() => {
    // 当版本改变时，自动选择第一个可用的题库
    if (selectedVersion) {
      const selectedVersionData = versions.find(v => v.id === selectedVersion);
      if (selectedVersionData?.status?.availableBanks.length) {
        const availableBanks = selectedVersionData.status.availableBanks;
        if (availableBanks.length > 0 && !availableBanks.includes(selectedBank)) {
          onBankChange(availableBanks[0]);
        }
      }
    }
  }, [selectedVersion, selectedBank, versions, onBankChange]);

  const handleRefresh = useCallback((isRetry = false) => {
    if (refreshState === RefreshState.LOADING) return; // 防止重复点击

    const performRefresh = async () => {
      try {
        setRefreshState(RefreshState.LOADING);
        setErrorMessage('');
        setErrorType(null);

        // 如果是重试，增加重试计数；如果是手动点击，重置计数和自动重试状态
        if (isRetry) {
          setRetryCount(prev => prev + 1);
          setIsAutoRetrying(true);
        } else {
          setRetryCount(0);
          setIsAutoRetrying(false);
        }

        // 强制刷新配置文件
        await questionBankManager.refreshConfig();

        // 刷新版本状态
        const versions = await questionBankManager.getAllVersions(true);
        await Promise.all(
          versions.map(v => versionStatusManager.refreshVersionStatus(v.id))
        );

        // 重新加载组件状态
        await loadVersionsWithStatus();

        logger.debug('配置刷新完成');
        setRefreshState(RefreshState.SUCCESS);
        setRetryCount(0); // 成功后重置重试计数
        setIsAutoRetrying(false); // 成功后重置自动重试状态

        // 3秒后自动恢复到闲置状态
        setTimeout(() => {
          setRefreshState(RefreshState.IDLE);
        }, 3000);

      } catch (error) {
        logger.error('刷新配置失败', error);
        
        // 分析错误类型
        let errorTypeResult = ErrorType.UNKNOWN;
        let errorMsg = '刷新失败，请重试';
        
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorTypeResult = ErrorType.NETWORK;
            errorMsg = '网络连接失败，请检查网络后重试';
          } else if (error.message.includes('timeout')) {
            errorTypeResult = ErrorType.TIMEOUT;
            errorMsg = '请求超时，请重试';
          } else if (error.message.includes('config')) {
            errorTypeResult = ErrorType.CONFIG;
            errorMsg = '配置文件加载失败，请重试';
          } else {
            errorMsg = error.message || '未知错误，请重试';
          }
        }
        
        setErrorType(errorTypeResult);
        setErrorMessage(errorMsg);
        setRefreshState(RefreshState.ERROR);

        // 只在首次失败且未在自动重试中时进行自动重试
        if (!isRetry && !isAutoRetrying && retryCount < 2) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s
          logger.debug(`自动重试 ${retryCount + 1}/2，延迟 ${retryDelay}ms`);
          setTimeout(() => {
            handleRefresh(true);
          }, retryDelay);
        } else {
          // 达到最大重试次数、正在自动重试中失败、或者是手动重试失败后，停止自动重试
          setIsAutoRetrying(false);
          setTimeout(() => {
            setRefreshState(RefreshState.IDLE);
          }, 3000);
        }
      }
    };

    performRefresh();
  }, [refreshState, isAutoRetrying, retryCount, loadVersionsWithStatus]);

  const selectedVersionData = versions.find(v => v.id === selectedVersion);
  const availableBanks = selectedVersionData?.status?.availableBanks || [];

  const getVersionStatusIcon = (version: VersionWithStatus) => {
    if (version.isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }

    if (!version.status) {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }

    if (version.status.isAvailable) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getVersionStatusText = (version: VersionWithStatus) => {
    if (version.isLoading) {
      return "检查中...";
    }

    if (!version.status) {
      return "状态未知";
    }

    if (version.status.isAvailable) {
      return `包含: ${version.status.availableBanks.join(', ')}`;
    }

    return version.status.error || "无可用题库";
  };

  // 获取刷新按钮内容
  const getRefreshButtonContent = () => {
    switch (refreshState) {
      case RefreshState.LOADING:
        return (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">
              {isAutoRetrying && retryCount > 0 ? `自动重试(${retryCount}/2)...` : '刷新中...'}
            </span>
          </div>
        );
      case RefreshState.SUCCESS:
        return (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500 animate-in fade-in slide-in-from-left-1 duration-300" />
            <span className="text-xs text-green-600 animate-in fade-in slide-in-from-right-1 duration-300">成功</span>
          </div>
        );
      case RefreshState.ERROR:
        return (
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500 animate-in fade-in slide-in-from-left-1 duration-300" />
            <span className="text-xs text-red-600 animate-in fade-in slide-in-from-right-1 duration-300">
              {retryCount >= 2 || isAutoRetrying ? '重试' : '失败'}
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 transition-transform hover:rotate-12" />
            <span className="text-xs">刷新</span>
          </div>
        );
    }
  };

  // 获取按钮样式
  const getButtonVariant = () => {
    switch (refreshState) {
      case RefreshState.SUCCESS:
        return "outline border-green-200 bg-green-50 hover:bg-green-100";
      case RefreshState.ERROR:
        return "outline border-red-200 bg-red-50 hover:bg-red-100";
      case RefreshState.LOADING:
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载题库版本中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 版本选择 */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-muted-foreground">题库版本</div>
          <div className="flex items-center gap-2">
            {selectedVersionData && (
              <div className="text-xs text-muted-foreground">
                更新时间: {new Date(selectedVersionData.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            )}
            <Button
              onClick={() => handleRefresh(false)}
              disabled={refreshState === RefreshState.LOADING || disabled}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 px-2 transition-all duration-300",
                getButtonVariant(),
                // 确保错误状态下按钮仍然可见和可用
                refreshState === RefreshState.ERROR && "border-orange-300 bg-orange-50 hover:bg-orange-100"
              )}
              title={errorMessage || "刷新题库配置"}
            >
              {getRefreshButtonContent()}
              <span className="sr-only">刷新配置</span>
            </Button>
          </div>
        </div>
        <Select
          value={selectedVersion || ""}
          onValueChange={onVersionChange}
          disabled={disabled || versions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择题库版本">
              {selectedVersionData && (
                <div className="flex items-center gap-2">
                  {getVersionStatusIcon(selectedVersionData)}
                  <span>{selectedVersionData.name}</span>
                  {selectedVersionData.isLatest && (
                    <Badge variant="secondary" className="text-xs">最新</Badge>
                  )}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getVersionStatusIcon(version)}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.name}</span>
                        {version.isLatest && (
                          <Badge variant="secondary" className="text-xs">最新</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getVersionStatusText(version)}
                      </div>
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* 错误提示区域 */}
        {refreshState === RefreshState.ERROR && errorMessage && (retryCount >= 2 || !isAutoRetrying) && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-orange-800">
                  刷新失败 {errorType && `(${errorType})`}
                </div>
                <div className="text-xs text-orange-700 mt-1">{errorMessage}</div>
                <div className="mt-2">
                  <Button
                    onClick={() => handleRefresh(false)}
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    手动重试
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 题库类型选择 */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">选择题库</div>
        <RadioGroup
          className="flex gap-6"
          value={selectedBank}
          onValueChange={(v: QuestionBankType) => onBankChange(v)}
          disabled={disabled || availableBanks.length === 0}
        >
          {availableBanks.map((bank) => {
            const bankInfo = selectedVersionData?.banks[bank];
            return (
              <div key={bank} className="flex items-center gap-2">
                <RadioGroupItem id={`bank-${bank}`} value={bank} />
                <Label htmlFor={`bank-${bank}`}>
                  {bank} 类
                  {bankInfo && (
                    <div className="text-xs text-muted-foreground">
                      {bankInfo.description}
                    </div>
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {availableBanks.length === 0 && selectedVersion && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            该版本暂无可用的题库
          </div>
        )}
      </div>
    </div>
  );
}
