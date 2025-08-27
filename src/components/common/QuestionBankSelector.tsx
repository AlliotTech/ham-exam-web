"use client";

import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { questionBankManager } from "@/lib/question-bank-manager";
import { versionStatusManager } from "@/lib/version-status-manager";
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

  useEffect(() => {
    async function loadVersionsWithStatus() {
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
        console.error("Failed to load question bank versions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadVersionsWithStatus();
  }, [selectedVersion, onVersionChange]);

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
          {selectedVersionData && (
            <div className="text-xs text-muted-foreground">
              更新时间: {new Date(selectedVersionData.updatedAt).toLocaleDateString('zh-CN')}
            </div>
          )}
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
