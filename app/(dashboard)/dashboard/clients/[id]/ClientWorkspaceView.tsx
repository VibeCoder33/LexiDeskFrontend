"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import {
    ClientDetailResponse,
    fetchClientById,
    updateClient,
    updateClientScratchpad,
    regenerateMagicLink,
    revokeMagicLink,
    restoreMagicLink,
    fetchDocumentPreviewUrl,
    updateDocument,
    deleteDocument,
    formatApiError,
    updateClientStatus,
    getCurrentUser,
} from "@/lib/api";
import { getRoleConfig } from "@/lib/roleConfig";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    ArrowLeft,
    Copy,
    Check,
    RotateCw,
    Ban,
    FileText,
    Loader2,
    Calendar,
    Phone,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Eye,
    Trash2,
    Lock,
    Download,
    ExternalLink,
    Archive,
    ArchiveRestore,
    Pencil,
    Plus,
    X,
    Save,
    Clock,
    Share2,
    Layers,
    MessageCircle,
} from "lucide-react";

interface ClientWorkspaceViewProps {
    clientId: string;
    initialData: ClientDetailResponse | null;
}

interface DetailFieldRow {
    id: string;
    key: string;
    value: string;
}

export function ClientWorkspaceView({
    clientId,
    initialData,
}: ClientWorkspaceViewProps) {
    const { data, mutate } = useSWR<ClientDetailResponse>(
        `/api/clients/${clientId}`,
        () => fetchClientById(clientId),
        {
            fallbackData: initialData || undefined,
            // SWR poll every 3 seconds while any document is PENDING per spec
            refreshInterval: (latest) => {
                const hasPending = latest?.documents.some(
                    (d) => d.verification === "PENDING",
                );
                return hasPending ? 3000 : 0;
            },
        },
    );

    const { data: currentUser } = useSWR("/api/auth/me", getCurrentUser);
    const roleConfig = currentUser?.role ? getRoleConfig(currentUser.role) : null;

    // ── Lawyer Case & Deadline Update State ─────────────────────────────────
    const [isEditingCase, setIsEditingCase] = React.useState(false);
    const [isSavingCase, setIsSavingCase] = React.useState(false);
    const [editName, setEditName] = React.useState("");
    const [editPhone, setEditPhone] = React.useState("");
    const [editMatterType, setEditMatterType] = React.useState("");
    const [editKeyDate, setEditKeyDate] = React.useState("");
    const [editKeyDateLabel, setEditKeyDateLabel] = React.useState("");
    const [editDetails, setEditDetails] = React.useState<DetailFieldRow[]>([]);

    // Initialize edit fields when entering edit mode or when data loads
    const startEditing = () => {
        if (!data) return;
        setEditName(data.name || "");
        setEditPhone(data.phone || "");
        setEditMatterType(data.matterType || "");
        setEditKeyDate(data.keyDate ? data.keyDate.split("T")[0] : "");
        setEditKeyDateLabel(data.keyDateLabel || "Deadline");

        const rows: DetailFieldRow[] = Object.entries(data.details || {}).map(
            ([key, val], idx) => ({
                id: `existing-${idx}-${key}`,
                key,
                value: String(val ?? ""),
            }),
        );
        setEditDetails(rows);
        setIsEditingCase(true);
    };

    const handleCancelEdit = () => {
        setIsEditingCase(false);
    };

    const handleAddDetailRow = () => {
        setEditDetails((prev) => [
            ...prev,
            { id: `custom-${Date.now()}`, key: "", value: "" },
        ]);
    };

    const handleRemoveDetailRow = (id: string) => {
        setEditDetails((prev) => prev.filter((row) => row.id !== id));
    };

    const handleDetailRowChange = (
        id: string,
        field: "key" | "value",
        val: string,
    ) => {
        setEditDetails((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [field]: val } : row)),
        );
    };

    const handleSaveCase = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!data) return;

        if (!editName.trim() || editName.trim().length < 2) {
            toast.error("Client name must be at least 2 characters");
            return;
        }

        const phoneClean = editPhone.trim();
        if (phoneClean && !/^\+?[1-9]\d{9,14}$/.test(phoneClean)) {
            toast.error("Phone must be in valid E.164 format (e.g. +919876543210)");
            return;
        }

        setIsSavingCase(true);
        try {
            const detailsMap: Record<string, unknown> = {};
            editDetails.forEach((row) => {
                const k = row.key.trim();
                if (k) {
                    detailsMap[k] = row.value.trim();
                }
            });

            const isoKeyDate = editKeyDate
                ? new Date(`${editKeyDate}T00:00:00.000Z`).toISOString()
                : null;

            await updateClient(clientId, {
                name: editName.trim(),
                phone: phoneClean,
                matterType: editMatterType.trim() || data.matterType,
                keyDate: isoKeyDate,
                keyDateLabel: editKeyDate ? editKeyDateLabel.trim() || "Deadline" : null,
                details: detailsMap,
            });

            toast.success("Case details and deadlines updated successfully");
            setIsEditingCase(false);
            mutate();
        } catch (err: unknown) {
            toast.error(formatApiError(err));
        } finally {
            setIsSavingCase(false);
        }
    };

    // ── Scratchpad state & debounced autosave (800ms) ────────────────────────
    const [scratchpadText, setScratchpadText] = React.useState(
        data?.scratchpad || "",
    );
    const [prevDataScratchpad, setPrevDataScratchpad] = React.useState(
        data?.scratchpad,
    );
    const [scratchpadStatus, setScratchpadStatus] = React.useState<
        "saved" | "saving" | "dirty"
    >("saved");
    const debouncedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    if (
        data?.scratchpad !== undefined &&
        data.scratchpad !== prevDataScratchpad &&
        scratchpadStatus === "saved"
    ) {
        setPrevDataScratchpad(data.scratchpad);
        setScratchpadText(data.scratchpad);
    }

    const handleScratchpadChange = (newVal: string) => {
        setScratchpadText(newVal);
        setScratchpadStatus("dirty");

        if (debouncedTimeoutRef.current) {
            clearTimeout(debouncedTimeoutRef.current);
        }

        debouncedTimeoutRef.current = setTimeout(async () => {
            setScratchpadStatus("saving");
            try {
                await updateClientScratchpad(clientId, newVal);
                setScratchpadStatus("saved");
            } catch {
                setScratchpadStatus("dirty");
            }
        }, 800);
    };

    // ── Link controls ───────────────────────────────────────────────────────
    const [copiedLink, setCopiedLink] = React.useState(false);
    const [isRevoking, setIsRevoking] = React.useState(false);
    const [isRegenerating, setIsRegenerating] = React.useState(false);

    const copyMagicLink = () => {
        if (!data?.magicLink) return;
        const appUrl =
            typeof window !== "undefined" ? window.location.origin : "";
        const url = `${appUrl}/portal/${data.magicLink.id}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success("Magic link copied to clipboard");
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleToggleRevoke = async () => {
        setIsRevoking(true);
        try {
            if (data?.magicLink?.isRevoked) {
                await restoreMagicLink(clientId);
                toast.success("Portal access restored");
            } else {
                await revokeMagicLink(clientId);
                toast.success("Portal access revoked");
            }
            mutate();
        } catch (err: unknown) {
            toast.error(formatApiError(err));
        } finally {
            setIsRevoking(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const res = await regenerateMagicLink(clientId);
            toast.success("New magic link generated & copied!");
            navigator.clipboard.writeText(res.url);
            mutate();
        } catch (err: unknown) {
            toast.error(formatApiError(err));
        } finally {
            setIsRegenerating(false);
        }
    };

    const shareOnWhatsApp = () => {
        if (!data?.magicLink) return;
        const appUrl =
            typeof window !== "undefined" ? window.location.origin : "";
        const url = `${appUrl}/portal/${data.magicLink.id}`;
        const cleanPhone = (data.phone || "").replace(/[^0-9]/g, "");
        const msg = `Hello ${data.name}, please access your secure LexiDesk portal to view and upload documents: ${url}`;
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
    };

    // ── Status & Closure ────────────────────────────────────────────────────
    const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

    const handleToggleStatus = async () => {
        if (!data) return;
        const newStatus = data.status === "CLOSED" ? "ACTION_NEEDED" : "CLOSED";
        const actionText = newStatus === "CLOSED" ? "close" : "reopen";

        if (!confirm(`Are you sure you want to ${actionText} this matter?`))
            return;

        setIsUpdatingStatus(true);
        try {
            await updateClientStatus(clientId, newStatus);
            toast.success(
                `Matter ${newStatus === "CLOSED" ? "closed" : "reopened"} successfully`,
            );
            mutate();
        } catch (err: unknown) {
            toast.error(formatApiError(err));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // ── Collapsible Document Categories State ───────────────────────────────
    const [collapsedCategories, setCollapsedCategories] = React.useState<
        Record<string, boolean>
    >({});

    const toggleCategoryCollapse = (cat: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [cat]: !prev[cat],
        }));
    };

    // Group documents by category
    const categories = React.useMemo(() => {
        if (!data) return [];
        return Array.from(
            new Set([
                ...data.requirements.map((r) => r.category),
                ...data.documents.map((d) => d.category),
            ]),
        );
    }, [data]);

    const areAllCollapsed =
        categories.length > 0 &&
        categories.every((cat) => Boolean(collapsedCategories[cat]));

    const toggleAllCategories = () => {
        if (areAllCollapsed) {
            setCollapsedCategories({});
        } else {
            const next: Record<string, boolean> = {};
            categories.forEach((cat) => {
                next[cat] = true;
            });
            setCollapsedCategories(next);
        }
    };

    // ── Document Preview Modal State ────────────────────────────────────────
    const [previewDocIndex, setPreviewDocIndex] = React.useState<number | null>(
        null,
    );
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

    const allDocuments = React.useMemo(
        () => data?.documents || [],
        [data?.documents],
    );
    const activePreviewDoc =
        previewDocIndex !== null ? allDocuments[previewDocIndex] || null : null;

    const openPreview = React.useCallback(
        async (index: number) => {
            setPreviewDocIndex(index);
            setIsPreviewLoading(true);
            setPreviewUrl(null);
            const doc = allDocuments[index];
            if (doc) {
                try {
                    const res = await fetchDocumentPreviewUrl(doc.id);
                    setPreviewUrl(res.previewUrl);
                    mutate(); // Marks reviewed
                } catch (err: unknown) {
                    toast.error(formatApiError(err));
                } finally {
                    setIsPreviewLoading(false);
                }
            }
        },
        [allDocuments, mutate],
    );

    const closePreview = () => {
        setPreviewDocIndex(null);
        setPreviewUrl(null);
    };

    // Keyboard navigation for preview modal (Left, Right, Esc)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewDocIndex === null) return;
            if (e.key === "Escape") {
                closePreview();
            } else if (
                e.key === "ArrowRight" &&
                previewDocIndex < allDocuments.length - 1
            ) {
                openPreview(previewDocIndex + 1);
            } else if (e.key === "ArrowLeft" && previewDocIndex > 0) {
                openPreview(previewDocIndex - 1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [previewDocIndex, allDocuments.length, openPreview]);

    // Badge Override & Document Management
    const handleOverrideStatus = async (
        docId: string,
        newStatus: "VERIFIED" | "NEEDS_REVIEW",
    ) => {
        try {
            await updateDocument(docId, { verification: newStatus });
            toast.success(`Document marked as ${newStatus}`);
            mutate();
        } catch (err: unknown) {
            toast.error(formatApiError(err));
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (
            !confirm(
                "Are you sure you want to delete this document from the vault?",
            )
        )
            return;
        try {
            await deleteDocument(docId);
            toast.success("Document deleted");
            mutate();
        } catch (err: unknown) {
            toast.error(formatApiError(err));
        }
    };

    // Calculate deadline days remaining & visual variant
    const deadlineDetails = React.useMemo(() => {
        if (!data?.keyDate) return null;
        const deadlineDate = new Date(data.keyDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(deadlineDate);
        target.setHours(0, 0, 0, 0);
        const diffMs = target.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let badgeText = "";
        let badgeVariant: "verified" | "warning" | "action" | "muted" = "muted";

        if (diffDays < 0) {
            badgeText = `${Math.abs(diffDays)}d overdue`;
            badgeVariant = "action";
        } else if (diffDays === 0) {
            badgeText = "Due today";
            badgeVariant = "warning";
        } else if (diffDays === 1) {
            badgeText = "Due tomorrow";
            badgeVariant = "warning";
        } else {
            badgeText = `In ${diffDays} days`;
            badgeVariant = "verified";
        }

        return {
            formattedDate: deadlineDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
            }),
            diffDays,
            badgeText,
            badgeVariant,
        };
    }, [data?.keyDate]);

    if (!data) {
        return (
            <div className="p-8 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
                <span>Loading workspace…</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full">
            <SiteHeader
                title={`${data.name} — Workspace`}
                subtitle={`${data.matterType} • Created ${new Date(data.createdAt).toLocaleDateString("en-IN")}`}
            />

            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
                <Link
                    href="/dashboard/clients"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors mb-1"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Clients Directory</span>
                </Link>

                {/* ── Main Layout: Center Column (8 cols) + Side Column (4 cols) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ══════════════════════════════════════════════════════════════
                        CENTER COLUMN:
                        1. Case Details & Deadlines (Editable by Lawyer)
                        2. Collapsible Document Vault Below
                    ══════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* ── Center Box 1: Case Details & Deadlines ── */}
                        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-xs">
                            <CardHeader className="pb-3 border-b border-[var(--border)] flex flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base font-bold text-[var(--foreground)] truncate">
                                                {data.name}
                                            </CardTitle>
                                            <StatusBadge
                                                variant={
                                                    data.status === "ACTION_NEEDED"
                                                        ? "action"
                                                        : data.status === "UP_TO_DATE"
                                                          ? "verified"
                                                          : data.status ===
                                                              "WAITING_ON_CLIENT"
                                                            ? "warning"
                                                            : "muted"
                                                }
                                            >
                                                {data.status.replace(/_/g, " ")}
                                            </StatusBadge>
                                        </div>
                                        <span className="text-xs text-[var(--muted-foreground)] block">
                                            Matter:{" "}
                                            <strong className="text-[var(--foreground)]">
                                                {data.matterType}
                                            </strong>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {!isEditingCase ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={startEditing}
                                            className="h-8 text-xs px-2.5 gap-1.5 border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
                                            title="Update case parameters, client info and deadlines"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-[var(--primary)]" />
                                            <span>Update Case</span>
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancelEdit}
                                            disabled={isSavingCase}
                                            className="h-8 text-xs px-2 gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            <span>Cancel</span>
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleToggleStatus}
                                        disabled={isUpdatingStatus}
                                        className={`h-8 text-xs px-2.5 gap-1.5 ${
                                            data.status === "CLOSED"
                                                ? "text-[#059669] hover:text-[#059669] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border-[#059669]"
                                                : "text-[var(--accent)] hover:text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[var(--accent)]"
                                        }`}
                                    >
                                        {data.status === "CLOSED" ? (
                                            <ArchiveRestore className="w-3.5 h-3.5" />
                                        ) : (
                                            <Archive className="w-3.5 h-3.5" />
                                        )}
                                        <span className="hidden sm:inline">
                                            {data.status === "CLOSED"
                                                ? "Reopen"
                                                : "Close"}
                                        </span>
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-4 space-y-4">
                                {!isEditingCase ? (
                                    /* ── VIEW MODE ── */
                                    <div className="space-y-4">
                                        {/* Deadline Highlight Box */}
                                        <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--background)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-md bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)] flex items-center justify-center shrink-0">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider block">
                                                        {data.keyDateLabel ||
                                                            "Upcoming Deadline"}
                                                    </span>
                                                    {deadlineDetails ? (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-sm font-bold text-[var(--foreground)]">
                                                                {
                                                                    deadlineDetails.formattedDate
                                                                }
                                                            </span>
                                                            <StatusBadge
                                                                variant={
                                                                    deadlineDetails.badgeVariant
                                                                }
                                                                className="text-[10px]"
                                                            >
                                                                <Clock className="w-3 h-3 mr-1 inline" />
                                                                {
                                                                    deadlineDetails.badgeText
                                                                }
                                                            </StatusBadge>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-[var(--muted-foreground)] italic block mt-0.5">
                                                            No deadline scheduled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={startEditing}
                                                className="h-7 text-xs px-2.5 gap-1 text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
                                            >
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    {data.keyDate
                                                        ? "Change Deadline"
                                                        : "+ Set Deadline"}
                                                </span>
                                            </Button>
                                        </div>

                                        {/* Contact & Case Details Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="p-3 rounded-md bg-[var(--card)] border border-[var(--border)] space-y-1.5">
                                                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider block">
                                                    Client Contact
                                                </span>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 text-[var(--foreground)] font-mono">
                                                        <Phone className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                                                        <span>{data.phone}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={shareOnWhatsApp}
                                                        className="text-[11px] inline-flex items-center gap-1 text-[#059669] hover:underline font-medium cursor-pointer"
                                                        title="Open chat on WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>WhatsApp</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-md bg-[var(--card)] border border-[var(--border)] space-y-1.5">
                                                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider block">
                                                    Matter Status
                                                </span>
                                                <div className="flex items-center justify-between text-[var(--foreground)]">
                                                    <span>
                                                        Matter Type:{" "}
                                                        <strong>
                                                            {data.matterType}
                                                        </strong>
                                                    </span>
                                                    <span className="text-[11px] text-[var(--muted-foreground)]">
                                                        Active{" "}
                                                        {new Date(
                                                            data.lastActiveAt,
                                                        ).toLocaleDateString("en-IN", {
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Case Parameters / Dynamic Details */}
                                        <div className="border border-[var(--border)] rounded-md p-3.5 bg-[var(--background)]/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                                                    Case Details & Parameters
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={startEditing}
                                                    className="text-[11px] text-[var(--primary)] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    <span>Edit Parameters</span>
                                                </button>
                                            </div>

                                            {data.details &&
                                            Object.keys(data.details).length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                    {Object.entries(data.details).map(
                                                        ([key, val]) => (
                                                            <div
                                                                key={key}
                                                                className="flex items-center justify-between p-2 rounded bg-[var(--card)] border border-[var(--border)] text-xs"
                                                            >
                                                                <span className="text-[var(--muted-foreground)] capitalize truncate pr-2">
                                                                    {key.replace(
                                                                        /([A-Z])/g,
                                                                        " $1",
                                                                    )}
                                                                    :
                                                                </span>
                                                                <span className="font-semibold text-[var(--foreground)] truncate text-right">
                                                                    {String(val ?? "")}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                                                    No case parameters configured.
                                                    Click{" "}
                                                    <button
                                                        onClick={startEditing}
                                                        className="text-[var(--primary)] underline font-medium cursor-pointer"
                                                    >
                                                        Update Case
                                                    </button>{" "}
                                                    to add details such as court,
                                                    opposing party, property numbers,
                                                    etc.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* ── EDIT MODE (Lawyer updating details & deadlines) ── */
                                    <form
                                        onSubmit={handleSaveCase}
                                        className="space-y-4 pt-1"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="edit-name"
                                                    className="text-xs font-semibold text-[var(--foreground)]"
                                                >
                                                    Client Name
                                                </Label>
                                                <Input
                                                    id="edit-name"
                                                    value={editName}
                                                    onChange={(e) =>
                                                        setEditName(e.target.value)
                                                    }
                                                    required
                                                    className="text-xs h-8 bg-[var(--background)] border-[var(--border)]"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="edit-phone"
                                                    className="text-xs font-semibold text-[var(--foreground)]"
                                                >
                                                    Phone (WhatsApp E.164)
                                                </Label>
                                                <Input
                                                    id="edit-phone"
                                                    value={editPhone}
                                                    onChange={(e) =>
                                                        setEditPhone(e.target.value)
                                                    }
                                                    placeholder="+919876543210"
                                                    className="text-xs h-8 font-mono bg-[var(--background)] border-[var(--border)]"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="edit-matter-type"
                                                    className="text-xs font-semibold text-[var(--foreground)]"
                                                >
                                                    Matter Type
                                                </Label>
                                                {roleConfig?.matterTypes ? (
                                                    <select
                                                        id="edit-matter-type"
                                                        value={editMatterType}
                                                        onChange={(e) =>
                                                            setEditMatterType(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full text-xs h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                                    >
                                                        {roleConfig.matterTypes.map(
                                                            (mt) => (
                                                                <option
                                                                    key={mt}
                                                                    value={mt}
                                                                >
                                                                    {mt}
                                                                </option>
                                                            ),
                                                        )}
                                                        {!roleConfig.matterTypes.includes(
                                                            editMatterType,
                                                        ) && (
                                                            <option
                                                                value={
                                                                    editMatterType
                                                                }
                                                            >
                                                                {editMatterType}
                                                            </option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id="edit-matter-type"
                                                        value={editMatterType}
                                                        onChange={(e) =>
                                                            setEditMatterType(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="text-xs h-8 bg-[var(--background)] border-[var(--border)]"
                                                    />
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="edit-date-label"
                                                    className="text-xs font-semibold text-[var(--foreground)]"
                                                >
                                                    Deadline Description
                                                </Label>
                                                <Input
                                                    id="edit-date-label"
                                                    value={editKeyDateLabel}
                                                    onChange={(e) =>
                                                        setEditKeyDateLabel(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. Next hearing, Filing due"
                                                    className="text-xs h-8 bg-[var(--background)] border-[var(--border)]"
                                                />
                                            </div>

                                            <div className="space-y-1 sm:col-span-2">
                                                <Label
                                                    htmlFor="edit-key-date"
                                                    className="text-xs font-semibold text-[var(--foreground)] flex items-center justify-between"
                                                >
                                                    <span>Deadline Date</span>
                                                    {editKeyDate && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditKeyDate("")
                                                            }
                                                            className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer font-normal"
                                                        >
                                                            Clear Deadline
                                                        </button>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="edit-key-date"
                                                    type="date"
                                                    value={editKeyDate}
                                                    onChange={(e) =>
                                                        setEditKeyDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="text-xs h-8 bg-[var(--background)] border-[var(--border)]"
                                                />
                                            </div>
                                        </div>

                                        {/* Dynamic Parameters List */}
                                        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[var(--foreground)]">
                                                    Case Parameters & Details
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleAddDetailRow}
                                                    className="h-7 text-xs px-2 gap-1 text-[var(--primary)] border-[var(--border)]"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    <span>Add Field</span>
                                                </Button>
                                            </div>

                                            {editDetails.length === 0 ? (
                                                <p className="text-xs text-[var(--muted-foreground)] italic">
                                                    No custom parameters yet. Click
                                                    &apos;Add Field&apos; to specify
                                                    case jurisdiction, opposing
                                                    parties, property identifiers,
                                                    etc.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {editDetails.map((row) => (
                                                        <div
                                                            key={row.id}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Input
                                                                placeholder="Parameter Name (e.g. Jurisdiction)"
                                                                value={row.key}
                                                                onChange={(e) =>
                                                                    handleDetailRowChange(
                                                                        row.id,
                                                                        "key",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="text-xs h-8 flex-1 bg-[var(--background)] border-[var(--border)]"
                                                            />
                                                            <Input
                                                                placeholder="Value"
                                                                value={row.value}
                                                                onChange={(e) =>
                                                                    handleDetailRowChange(
                                                                        row.id,
                                                                        "value",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="text-xs h-8 flex-1 bg-[var(--background)] border-[var(--border)]"
                                                            />
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleRemoveDetailRow(
                                                                        row.id,
                                                                    )
                                                                }
                                                                className="h-8 w-8 p-0 text-[var(--muted-foreground)] hover:text-[var(--accent)]"
                                                                title="Delete field"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelEdit}
                                                disabled={isSavingCase}
                                                className="h-8 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={isSavingCase}
                                                className="h-8 text-xs gap-1.5 bg-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-white shadow-xs"
                                            >
                                                {isSavingCase ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Save className="w-3.5 h-3.5" />
                                                )}
                                                <span>Save Case Changes</span>
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        {/* ── Center Box 2: Smart Document Vault (Collapsible Categories) ── */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-sm font-bold text-[var(--foreground)]">
                                        Documents & Verification Vault
                                    </h2>
                                    <span className="text-xs text-[var(--muted-foreground)] font-medium">
                                        ({data.documents.length} files uploaded)
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={toggleAllCategories}
                                        className="h-7 text-xs px-2.5 gap-1.5 border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
                                    >
                                        <Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
                                        <span>
                                            {areAllCollapsed
                                                ? "Expand All Categories"
                                                : "Collapse All Categories"}
                                        </span>
                                    </Button>
                                </div>
                            </div>

                            {/* Bundled Collapsible Document Category Cards */}
                            <div className="space-y-3">
                                {categories.map((category) => {
                                    const categoryReqs =
                                        data.requirements.filter(
                                            (r) => r.category === category,
                                        );
                                    const categoryDocs = data.documents.filter(
                                        (d) => d.category === category,
                                    );
                                    const isCollapsed = Boolean(
                                        collapsedCategories[category],
                                    );

                                    // Category Stats
                                    const missingCount = categoryReqs.filter(
                                        (r) =>
                                            !data.documents.some(
                                                (d) =>
                                                    d.requirementId === r.id,
                                            ),
                                    ).length;
                                    const verifiedCount = categoryDocs.filter(
                                        (d) => d.verification === "VERIFIED",
                                    ).length;
                                    const reviewCount = categoryDocs.filter(
                                        (d) =>
                                            d.verification === "NEEDS_REVIEW",
                                    ).length;

                                    return (
                                        <Card
                                            key={category}
                                            className="bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-xs transition-shadow"
                                        >
                                            {/* Collapsible Category Header */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleCategoryCollapse(
                                                        category,
                                                    )
                                                }
                                                className="w-full py-2.5 px-4 bg-[var(--background)] hover:bg-[color-mix(in_srgb,var(--muted)_60%,transparent)] border-b border-[var(--border)] flex items-center justify-between text-left transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <ChevronDown
                                                        className={`w-4 h-4 text-[var(--muted-foreground)] shrink-0 transition-transform duration-200 ${
                                                            isCollapsed
                                                                ? "-rotate-90"
                                                                : "rotate-0"
                                                        }`}
                                                    />
                                                    <span className="text-xs font-bold text-[var(--foreground)]">
                                                        {category}
                                                    </span>
                                                    <span className="text-[11px] text-[var(--muted-foreground)] font-medium">
                                                        ({categoryDocs.length}{" "}
                                                        {categoryDocs.length === 1
                                                            ? "file"
                                                            : "files"}
                                                        )
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {missingCount > 0 ? (
                                                        <StatusBadge
                                                            variant="action"
                                                            className="text-[10px] py-0 px-1.5"
                                                        >
                                                            {missingCount}{" "}
                                                            missing
                                                        </StatusBadge>
                                                    ) : categoryReqs.length > 0 ? (
                                                        <StatusBadge
                                                            variant="verified"
                                                            className="text-[10px] py-0 px-1.5"
                                                        >
                                                            All requirements met
                                                        </StatusBadge>
                                                    ) : null}

                                                    {reviewCount > 0 && (
                                                        <StatusBadge
                                                            variant="warning"
                                                            className="text-[10px] py-0 px-1.5"
                                                        >
                                                            {reviewCount} to
                                                            review
                                                        </StatusBadge>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Collapsible Content */}
                                            {!isCollapsed && (
                                                <CardContent className="p-0 divide-y divide-[var(--border)] text-xs">
                                                    {/* Requirements checklist rows */}
                                                    {categoryReqs.map((req) => {
                                                        const matchedDoc =
                                                            data.documents.find(
                                                                (d) =>
                                                                    d.requirementId ===
                                                                    req.id,
                                                            );
                                                        return (
                                                            <div
                                                                key={req.id}
                                                                className="p-3 flex items-center justify-between gap-3 bg-[var(--card)]"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="font-medium text-[var(--foreground)] truncate">
                                                                        {req.label}
                                                                    </span>
                                                                    {req.isRequired && (
                                                                        <span className="text-[10px] text-[var(--muted-foreground)]">
                                                                            (Required)
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="shrink-0">
                                                                    {!matchedDoc ? (
                                                                        <StatusBadge variant="action">
                                                                            🔴 Missing
                                                                        </StatusBadge>
                                                                    ) : matchedDoc.verification ===
                                                                      "VERIFIED" ? (
                                                                        <StatusBadge variant="verified">
                                                                            🟢 Verified
                                                                        </StatusBadge>
                                                                    ) : matchedDoc.verification ===
                                                                      "NEEDS_REVIEW" ? (
                                                                        <StatusBadge
                                                                            variant="warning"
                                                                            title={
                                                                                matchedDoc.verificationNote ||
                                                                                "Review required"
                                                                            }
                                                                        >
                                                                            🟡 Needs
                                                                            Review
                                                                        </StatusBadge>
                                                                    ) : (
                                                                        <StatusBadge variant="muted">
                                                                            Checking…
                                                                        </StatusBadge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Documents in this category */}
                                                    {categoryDocs.length === 0 ? (
                                                        <div className="p-3 pl-6 text-xs text-[var(--muted-foreground)] italic bg-[var(--card)]">
                                                            No files uploaded yet in
                                                            this category.
                                                        </div>
                                                    ) : (
                                                        categoryDocs.map((doc) => {
                                                            const globalIndex =
                                                                allDocuments.findIndex(
                                                                    (d) =>
                                                                        d.id ===
                                                                        doc.id,
                                                                );
                                                            return (
                                                                <div
                                                                    key={doc.id}
                                                                    className="p-3 pl-6 flex items-center justify-between gap-3 bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors group"
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                                                                        <div className="min-w-0">
                                                                            <span className="font-semibold text-[var(--foreground)] block truncate">
                                                                                {
                                                                                    doc.fileName
                                                                                }
                                                                            </span>
                                                                            <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                                                                                <span>
                                                                                    {(
                                                                                        doc.sizeBytes /
                                                                                        1024
                                                                                    ).toFixed(
                                                                                        0,
                                                                                    )}{" "}
                                                                                    KB
                                                                                </span>
                                                                                {doc.detectedType && (
                                                                                    <span>
                                                                                        &bull;{" "}
                                                                                        AI:{" "}
                                                                                        {
                                                                                            doc.detectedType
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                                {doc.verificationNote && (
                                                                                    <span className="text-[var(--secondary)] truncate max-w-xs font-medium">
                                                                                        &bull;{" "}
                                                                                        {
                                                                                            doc.verificationNote
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                openPreview(
                                                                                    globalIndex,
                                                                                )
                                                                            }
                                                                            className="h-7 text-xs px-2 gap-1 bg-[var(--card)] hover:bg-[var(--background)]"
                                                                            title="Open preview modal"
                                                                        >
                                                                            <Eye className="w-3 h-3" />
                                                                            <span>
                                                                                Preview
                                                                            </span>
                                                                        </Button>

                                                                        {doc.verification ===
                                                                            "NEEDS_REVIEW" && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    handleOverrideStatus(
                                                                                        doc.id,
                                                                                        "VERIFIED",
                                                                                    )
                                                                                }
                                                                                className="h-7 text-[11px] px-2 text-[#059669] border-[#059669] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                                                                                title="Manually verify document"
                                                                            >
                                                                                Verify
                                                                            </Button>
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleDeleteDoc(
                                                                                    doc.id,
                                                                                )
                                                                            }
                                                                            className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[var(--accent)] p-1 rounded transition-opacity cursor-pointer"
                                                                            title="Delete document"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </CardContent>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════
                        SIDE COLUMN:
                        "on the side of the center things, i want the notes and
                        link regeneration thing box."
                        1. Magic Link Regeneration Box
                        2. Notes (Private Scratchpad) Box
                    ══════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-4 space-y-5">
                        {/* ── Side Box 1: Link Regeneration & Portal Controls ── */}
                        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-xs">
                            <CardHeader className="pb-2 border-b border-[var(--border)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Lock className="w-4 h-4 text-[var(--primary)]" />
                                        <CardTitle className="text-xs font-bold text-[var(--foreground)]">
                                            Magic Link & Portal
                                        </CardTitle>
                                    </div>
                                    {data.magicLink?.isRevoked ? (
                                        <StatusBadge variant="action">
                                            Access Revoked
                                        </StatusBadge>
                                    ) : data.magicLink?.isExpired ? (
                                        <StatusBadge variant="warning">
                                            Link Expired
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge variant="verified">
                                            Portal Active
                                        </StatusBadge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="pt-3 space-y-3 text-xs">
                                {data.magicLink && (
                                    <div className="space-y-1 text-[11px] text-[var(--muted-foreground)]">
                                        <div>
                                            Expires:{" "}
                                            <span className="text-[var(--foreground)] font-medium">
                                                {new Date(
                                                    data.magicLink.expiresAt,
                                                ).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                        {data.magicLink.lastUsedAt && (
                                            <div>
                                                Last accessed:{" "}
                                                {new Date(
                                                    data.magicLink.lastUsedAt,
                                                ).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 pt-1">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={copyMagicLink}
                                            disabled={data.magicLink?.isRevoked}
                                            className="text-xs h-8 gap-1.5 bg-[var(--card)] hover:bg-[var(--muted)]"
                                        >
                                            {copiedLink ? (
                                                <Check className="w-3.5 h-3.5 text-[#059669]" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                                {copiedLink ? "Copied" : "Copy Link"}
                                            </span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleRegenerate}
                                            disabled={isRegenerating}
                                            className="text-xs h-8 gap-1.5 bg-[var(--card)] hover:bg-[var(--muted)]"
                                            title="Regenerate link token and copy new URL"
                                        >
                                            <RotateCw
                                                className={`w-3.5 h-3.5 ${
                                                    isRegenerating
                                                        ? "animate-spin"
                                                        : ""
                                                }`}
                                            />
                                            <span>Regenerate</span>
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={shareOnWhatsApp}
                                            disabled={data.magicLink?.isRevoked}
                                            className="text-xs h-8 gap-1.5 text-[#059669] border-[color-mix(in_srgb,var(--success)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                                            title="Send upload link via WhatsApp"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span>WhatsApp</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleToggleRevoke}
                                            disabled={isRevoking}
                                            className={`text-xs h-8 gap-1.5 ${
                                                data.magicLink?.isRevoked
                                                    ? "text-[#059669] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border-[#059669]"
                                                    : "text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                                            }`}
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            <span>
                                                {data.magicLink?.isRevoked
                                                    ? "Restore"
                                                    : "Revoke"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Side Box 2: Private Notes (Scratchpad) ── */}
                        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-xs">
                            <CardHeader className="pb-2 border-b border-[var(--border)] flex flex-row items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-[var(--primary)]" />
                                    <CardTitle className="text-xs font-bold text-[var(--foreground)]">
                                        Case Notes & Scratchpad
                                    </CardTitle>
                                </div>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                    {scratchpadStatus === "saving"
                                        ? "Saving…"
                                        : scratchpadStatus === "dirty"
                                          ? "Unsaved changes"
                                          : "Saved"}
                                </span>
                            </CardHeader>
                            <CardContent className="pt-3">
                                <Textarea
                                    value={scratchpadText}
                                    onChange={(e) =>
                                        handleScratchpadChange(e.target.value)
                                    }
                                    placeholder="Private lawyer notes for this matter (autosaves automatically, strictly invisible to client)…"
                                    rows={7}
                                    className="text-xs resize-none bg-[var(--background)] border-[var(--border)] focus-visible:ring-1 focus-visible:ring-[var(--primary)] leading-relaxed"
                                />
                                <span className="text-[10px] text-[var(--muted-foreground)] block mt-1.5">
                                    Autosaves after you pause typing.
                                </span>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ── Document Preview Modal (PDF / Images / Keyboard Navigation) ── */}
            <Dialog open={previewDocIndex !== null} onOpenChange={closePreview}>
                <DialogContent className="max-w-4xl w-[95vw] h-[85vh] bg-[var(--card)] border border-[var(--border)] shadow-elevation-2 flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-[var(--border)] bg-[var(--card)] flex flex-row items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 min-w-0 pr-4">
                            {previewUrl && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2"
                                        title="Open in new tab"
                                        onClick={() =>
                                            window.open(
                                                previewUrl,
                                                "_blank",
                                                "noopener,noreferrer",
                                            )
                                        }
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2"
                                        title="Download original file"
                                        onClick={() => {
                                            const link =
                                                document.createElement("a");
                                            link.href = previewUrl;
                                            link.download =
                                                activePreviewDoc?.fileName ||
                                                "document";
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    <div className="w-px h-4 bg-[var(--border)] mx-1" />
                                </>
                            )}
                            <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                            <DialogTitle className="text-sm font-bold text-[var(--foreground)] truncate">
                                {activePreviewDoc?.fileName}
                            </DialogTitle>
                            {activePreviewDoc && (
                                <StatusBadge
                                    variant={
                                        activePreviewDoc.verification ===
                                        "VERIFIED"
                                            ? "verified"
                                            : activePreviewDoc.verification ===
                                                "NEEDS_REVIEW"
                                              ? "warning"
                                              : "muted"
                                    }
                                    className="text-[10px] ml-2 shrink-0"
                                >
                                    {activePreviewDoc.verification}
                                </StatusBadge>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={previewDocIndex === 0}
                                onClick={() =>
                                    previewDocIndex !== null &&
                                    openPreview(previewDocIndex - 1)
                                }
                                className="h-7 px-2"
                                title="Previous file (Left Arrow)"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                    previewDocIndex === allDocuments.length - 1
                                }
                                onClick={() =>
                                    previewDocIndex !== null &&
                                    openPreview(previewDocIndex + 1)
                                }
                                className="h-7 px-2"
                                title="Next file (Right Arrow)"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 bg-[var(--background)] flex items-center justify-center p-4 overflow-hidden relative">
                        {isPreviewLoading ? (
                            <div className="flex flex-col items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                                <span>Loading preview…</span>
                            </div>
                        ) : previewUrl ? (
                            activePreviewDoc?.mimeType.includes("pdf") ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full rounded border border-[var(--border)] bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={previewUrl}
                                    alt={
                                        activePreviewDoc?.fileName ||
                                        "Document Preview"
                                    }
                                    className="max-w-full max-h-full object-contain rounded shadow-sm"
                                />
                            )
                        ) : (
                            <div className="text-xs text-[var(--muted-foreground)]">
                                Unable to load preview for this file.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
