"use client";

import * as React from "react";
import axios from "axios";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    UploadCloud,
    CheckCircle2,
    FileText,
    AlertCircle,
    Lock,
    ShieldCheck,
    Check,
    RefreshCw,
} from "lucide-react";

export interface PortalInfo {
    professionalName: string;
    firmName: string;
    clientFirstName: string;
    clientName: string;
    matterType: string;
    requirements: Array<{
        id: string;
        label: string;
        category: string;
        isRequired: boolean;
        done: boolean;
    }>;
    expired: boolean;
}

interface UploadProgressItem {
    id: string;
    file: File;
    progress: number;
    status: "uploading" | "completed" | "error";
    errorMessage?: string;
    requirementId?: string;
}

interface PortalViewProps {
    token: string;
    initialInfo: PortalInfo | null;
}

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/webp",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function PortalView({ token, initialInfo }: PortalViewProps) {
    const [portalInfo, setPortalInfo] = React.useState<PortalInfo | null>(
        initialInfo,
    );
    const [selectedRequirementId, setSelectedRequirementId] =
        React.useState<string>("any");
    const [uploads, setUploads] = React.useState<UploadProgressItem[]>([]);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const reloadPortalInfo = async () => {
        try {
            const res = await axios.get<PortalInfo>(`/server/portal/${token}`);
            setPortalInfo(res.data);
        } catch {
            setPortalInfo(null);
        }
    };

    // Handle file selection & upload process
    const processFiles = (files: FileList | File[]) => {
        const fileList = Array.from(files);

        fileList.forEach((file) => {
            // Validate type
            if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
                alert(
                    `File "${file.name}" format is not allowed. Please upload PDF, JPEG, PNG, or WebP files.`,
                );
                return;
            }

            // Validate size
            if (file.size > MAX_FILE_SIZE) {
                alert(`File "${file.name}" exceeds the 25 MB maximum limit.`);
                return;
            }

            const uploadItem: UploadProgressItem = {
                id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                file,
                progress: 0,
                status: "uploading",
                requirementId:
                    selectedRequirementId !== "any"
                        ? selectedRequirementId
                        : undefined,
            };

            setUploads((prev) => [uploadItem, ...prev]);
            uploadSingleFile(uploadItem);
        });
    };

    const uploadSingleFile = async (item: UploadProgressItem) => {
        try {
            // 1. Presign
            const presignRes = await axios.post<{
                uploadUrl: string;
                s3Key: string;
                headers: Record<string, string>;
            }>(`/server/portal/${token}/uploads/presign`, {
                fileName: item.file.name,
                mimeType: item.file.type,
                sizeBytes: item.file.size,
                requirementId: item.requirementId,
            });

            const { uploadUrl, s3Key, headers } = presignRes.data;

            // 2. PUT with XMLHttpRequest for live progress
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", uploadUrl);

                Object.entries(headers || {}).forEach(([key, val]) => {
                    xhr.setRequestHeader(key, val);
                });

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round(
                            (event.loaded / event.total) * 95,
                        );
                        setUploads((prev) =>
                            prev.map((u) =>
                                u.id === item.id
                                    ? { ...u, progress: percent }
                                    : u,
                            ),
                        );
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(
                            new Error(`Storage returned status ${xhr.status}`),
                        );
                    }
                };

                xhr.onerror = () =>
                    reject(new Error("Network error uploading file."));
                xhr.send(item.file);
            });

            // 3. Complete
            await axios.post(`/server/portal/${token}/uploads/complete`, {
                s3Key,
                fileName: item.file.name,
                mimeType: item.file.type,
                sizeBytes: item.file.size,
                requirementId: item.requirementId,
            });

            setUploads((prev) =>
                prev.map((u) =>
                    u.id === item.id
                        ? { ...u, progress: 100, status: "completed" }
                        : u,
                ),
            );

            // Refresh checklist
            reloadPortalInfo();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.error || err.message
                : err instanceof Error
                  ? err.message
                  : "Failed to upload";

            setUploads((prev) =>
                prev.map((u) =>
                    u.id === item.id
                        ? { ...u, status: "error", errorMessage: msg }
                        : u,
                ),
            );
        }
    };

    // If portal link is invalid, expired, or revoked
    if (!portalInfo) {
        return (
            <div className="min-h-screen w-full bg-[var(--background)] flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] shadow-elevation-1 text-center p-6 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-[var(--foreground)]">
                            Link No Longer Valid
                        </h1>
                        <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">
                            This document upload link has either expired or been
                            closed by your consultant. Please reach out directly
                            to your professional to request an updated access
                            link.
                        </p>
                    </div>
                    <div className="pt-2 text-[11px] text-[var(--muted-foreground)] flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>LexiDesk Encrypted Client Vault</span>
                    </div>
                </Card>
            </div>
        );
    }

    const allCompleted =
        portalInfo.requirements.length > 0 &&
        portalInfo.requirements.every((r) => r.done);

    return (
        <div className="min-h-screen w-full bg-[var(--background)] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
            {/* Centered Main Card */}
            <div className="max-w-xl w-full mx-auto my-auto space-y-5">
                {/* Brand Banner */}
                <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded bg-[var(--primary)] text-white font-bold text-xs flex items-center justify-center">
                        L
                    </div>
                    <span className="text-xs font-bold tracking-tight text-[var(--foreground)]">
                        LexiDesk Secure Portal
                    </span>
                </div>

                <Card className="bg-[var(--card)] border border-[var(--border)] shadow-elevation-2 overflow-hidden">
                    <CardHeader className="border-b border-[var(--border)] pb-4 bg-[var(--background)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[var(--primary)] font-semibold uppercase tracking-wider">
                                {portalInfo.matterType} Matter
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1 font-medium">
                                <Lock className="w-3 h-3 text-[#059669]" />
                                End-to-End Encrypted
                            </span>
                        </div>
                        <CardTitle className="text-lg font-bold text-[var(--foreground)] mt-1">
                            Upload Documents for{" "}
                            {portalInfo.firmName || portalInfo.professionalName}
                        </CardTitle>
                        <CardDescription className="text-xs text-[var(--muted-foreground)]">
                            Welcome,{" "}
                            <strong className="text-[var(--foreground)]">
                                {portalInfo.clientFirstName}
                            </strong>
                            . Please upload the checklist items below requested
                            by {portalInfo.professionalName}.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 space-y-6">
                        {/* Checklist of Requirements */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                                Document Checklist
                            </h3>
                            <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] overflow-hidden bg-[var(--card)]">
                                {portalInfo.requirements.map((req) => (
                                    <div
                                        key={req.id}
                                        className="p-3 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                                    req.done
                                                        ? "bg-[#059669] text-white"
                                                        : "border border-[var(--border)] text-transparent"
                                                }`}
                                            >
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                            <span
                                                className={`truncate font-medium ${
                                                    req.done
                                                        ? "line-through text-[var(--muted-foreground)]"
                                                        : "text-[var(--foreground)]"
                                                }`}
                                            >
                                                {req.label}
                                            </span>
                                        </div>

                                        <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                                req.done
                                                    ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[#059669]"
                                                    : "bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)] text-[var(--secondary)]"
                                            }`}
                                        >
                                            {req.done ? "Uploaded" : "Required"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Checklist Item Target Selector */}
                        {portalInfo.requirements.length > 0 && (
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="reqSelect"
                                    className="text-xs font-medium text-[var(--foreground)]"
                                >
                                    Match this upload to checklist requirement
                                    (optional):
                                </label>
                                <select
                                    id="reqSelect"
                                    value={selectedRequirementId}
                                    onChange={(e) =>
                                        setSelectedRequirementId(e.target.value)
                                    }
                                    className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                >
                                    <option value="any">
                                        General / Unmatched document
                                    </option>
                                    {portalInfo.requirements
                                        .filter((r) => !r.done)
                                        .map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.label} ({r.category})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {/* Drag & Drop / Tap to Upload Zone */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                if (e.dataTransfer.files) {
                                    processFiles(e.dataTransfer.files);
                                }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                isDragOver
                                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                                    : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)]"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        processFiles(e.target.files);
                                    }
                                }}
                            />

                            <UploadCloud className="w-10 h-10 text-[var(--primary)] mx-auto mb-2 opacity-80" />
                            <p className="text-xs font-semibold text-[var(--foreground)]">
                                <span className="hidden sm:inline">
                                    Drag & drop files here, or{" "}
                                </span>
                                <span className="text-[var(--primary)] underline underline-offset-2">
                                    Tap to browse
                                </span>
                            </p>
                            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                                Supports PDF, JPG, PNG &bull; Max 25 MB per file
                            </p>
                        </div>

                        {/* Live Uploads Progress List */}
                        {uploads.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                                    Recent Uploads
                                </h4>
                                <div className="space-y-2">
                                    {uploads.map((u) => (
                                        <div
                                            key={u.id}
                                            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-2 text-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                                                    <span className="font-medium text-[var(--foreground)] truncate">
                                                        {u.file.name}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                                                    {(
                                                        u.file.size / 1024
                                                    ).toFixed(0)}{" "}
                                                    KB
                                                </span>
                                            </div>

                                            {/* Progress bar */}
                                            {u.status === "uploading" && (
                                                <div className="space-y-1">
                                                    <div className="w-full bg-[var(--background)] h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
                                                        <div
                                                            className="bg-[var(--primary)] h-full transition-all duration-300"
                                                            style={{
                                                                width: `${u.progress}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-[var(--muted-foreground)] block text-right font-mono">
                                                        {u.progress}%
                                                    </span>
                                                </div>
                                            )}

                                            {/* Completed */}
                                            {u.status === "completed" && (
                                                <div className="flex items-center gap-1.5 text-[#059669] text-[11px] font-medium">
                                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                    <span>
                                                        Securely sent to your
                                                        consultant
                                                    </span>
                                                </div>
                                            )}

                                            {/* Error */}
                                            {u.status === "error" && (
                                                <div className="flex items-center justify-between text-[var(--accent)] text-[11px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span>
                                                            {u.errorMessage ||
                                                                "Upload failed"}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            uploadSingleFile(u)
                                                        }
                                                        className="text-xs underline flex items-center gap-1 font-medium cursor-pointer"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        Retry
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All items completed celebration banner */}
                        {allCompleted && (
                            <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-center space-y-1 text-xs">
                                <CheckCircle2 className="w-6 h-6 text-[#059669] mx-auto" />
                                <p className="font-bold text-[#059669]">
                                    All Requested Documents Uploaded
                                </p>
                                <p className="text-[var(--muted-foreground)] text-[11px]">
                                    Thank you! Your consultant has been notified
                                    and will verify the submitted files.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <footer className="text-center text-[11px] text-[var(--muted-foreground)] py-4">
                Protected by 256-bit encryption &bull; LexiDesk Secure Legal &
                Tax Workspace
            </footer>
        </div>
    );
}
