import axios, { AxiosError } from "axios";
import { ApiErrorResponse, User, FirmSettingsInput } from "@/types/auth";

export const api = axios.create({
    baseURL: "/server",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

export function formatApiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosErr = error as AxiosError<ApiErrorResponse>;
        if (axiosErr.response?.data?.error) {
            return axiosErr.response.data.error;
        }
        if (axiosErr.message) {
            return axiosErr.message;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "An unexpected error occurred. Please try again.";
}

export function getFieldErrors(
    error: unknown,
): Record<string, string[]> | undefined {
    if (axios.isAxiosError(error)) {
        const axiosErr = error as AxiosError<ApiErrorResponse>;
        return axiosErr.response?.data?.details;
    }
    return undefined;
}

// Global response interceptor for 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (typeof window !== "undefined" && error.response?.status === 401) {
            const currentPath = window.location.pathname;
            if (
                !currentPath.startsWith("/login") &&
                !currentPath.startsWith("/portal")
            ) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    },
);

// ── Auth Endpoints ───────────────────────────────────────────────────────────
export async function loginUser(
    email: string,
    password: string,
): Promise<{ user: User }> {
    const { data } = await api.post<{ user: User }>("/auth/login", {
        email,
        password,
    });
    return data;
}

export async function getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    return data;
}

export async function logoutUser(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/logout");
    return data;
}

export async function updateFirmSettings(
    input: FirmSettingsInput,
): Promise<User> {
    const { data } = await api.patch<User>("/auth/me/firm", input);
    return data;
}

// ── Dashboard Types & Endpoints ──────────────────────────────────────────────
export interface DashboardMetric {
    key: string;
    label: string;
    value: number;
    urgent?: boolean;
}

export interface ActionRequiredItem {
    clientId: string;
    name: string;
    matterType: string;
    newFiles: number;
    needsReview: number;
    lastUploadAt: string | null;
}

export interface WaitingOnClientItem {
    clientId: string;
    name: string;
    matterType: string;
    missingCount: number;
    linkSentAt: string | null;
    phone: string;
    nudgeUrl: string;
}

export interface DashboardData {
    role: string;
    metrics: DashboardMetric[];
    actionRequired: ActionRequiredItem[];
    waitingOnClient: WaitingOnClientItem[];
}

export async function fetchDashboardData(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>("/dashboard");
    return data;
}

// ── Clients Endpoints ────────────────────────────────────────────────────────
export interface ClientItem {
    id: string;
    name: string;
    phone: string;
    matterType: string;
    status: "ACTION_NEEDED" | "WAITING_ON_CLIENT" | "UP_TO_DATE" | "CLOSED";
    lastActiveAt: string;
    createdAt: string;
    keyDate?: string | null;
    keyDateLabel?: string | null;
    isBilled?: boolean;
    _count?: {
        documents: number;
        requirements: number;
    };
}

export interface ClientsListResponse {
    clients: ClientItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export async function fetchClients(params?: {
    q?: string;
    status?: string;
    matterType?: string;
    sort?: string;
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
}): Promise<ClientsListResponse> {
    const { data } = await api.get<ClientsListResponse>("/clients", { params });
    return data;
}

export interface CreateClientPayload {
    name: string;
    phone: string;
    matterType: string;
    details?: Record<string, unknown>;
    keyDate?: string | null;
    keyDateLabel?: string | null;
}

export interface CreateClientResponse {
    client: ClientItem;
    magicLink: {
        url: string;
        expiresAt: string;
    };
}

export async function createClient(
    payload: CreateClientPayload,
): Promise<CreateClientResponse> {
    const { data } = await api.post<CreateClientResponse>("/clients", payload);
    return data;
}

export interface DocumentItem {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
    verification: "PENDING" | "VERIFIED" | "NEEDS_REVIEW";
    detectedType?: string | null;
    verificationNote?: string | null;
    reviewedAt?: string | null;
    uploadedAt: string;
    requirementId?: string | null;
}

export interface RequirementItem {
    id: string;
    label: string;
    category: string;
    isRequired: boolean;
    sortOrder: number;
    documents: DocumentItem[];
}

export interface ClientDetailResponse extends ClientItem {
    details: Record<string, unknown>;
    scratchpad: string;
    requirements: RequirementItem[];
    documents: DocumentItem[];
    magicLink?: {
        id: string;
        expiresAt: string;
        revokedAt?: string | null;
        lastUsedAt?: string | null;
        nudgedAt?: string | null;
        isRevoked: boolean;
        isExpired: boolean;
    } | null;
}

export async function fetchClientById(
    id: string,
): Promise<ClientDetailResponse> {
    const { data } = await api.get<ClientDetailResponse>(`/clients/${id}`);
    return data;
}

export async function updateClientScratchpad(
    id: string,
    scratchpad: string,
): Promise<{ scratchpad: string }> {
    const { data } = await api.patch<{ scratchpad: string }>(
        `/clients/${id}/scratchpad`,
        { scratchpad },
    );
    return data;
}

export async function regenerateMagicLink(
    clientId: string,
): Promise<{ url: string; expiresAt: string }> {
    const { data } = await api.post<{ url: string; expiresAt: string }>(
        `/clients/${clientId}/link/regenerate`,
    );
    return data;
}

export async function revokeMagicLink(
    clientId: string,
): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
        `/clients/${clientId}/link/revoke`,
    );
    return data;
}

export async function restoreMagicLink(
    clientId: string,
): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
        `/clients/${clientId}/link/restore`,
    );
    return data;
}

export async function nudgeClient(
    clientId: string,
): Promise<{ nudgeUrl: string; nudgedAt: string }> {
    const { data } = await api.post<{ nudgeUrl: string; nudgedAt: string }>(
        `/clients/${clientId}/nudge`,
    );
    return data;
}

// ── Documents Endpoints ──────────────────────────────────────────────────────
export async function fetchDocumentPreviewUrl(
    docId: string,
): Promise<{ previewUrl: string; fileName: string; mimeType: string }> {
    const { data } = await api.get<{
        previewUrl: string;
        fileName: string;
        mimeType: string;
    }>(`/documents/${docId}/preview-url`);
    return data;
}

export async function updateDocument(
    docId: string,
    payload: {
        category?: string;
        verification?: "PENDING" | "VERIFIED" | "NEEDS_REVIEW";
        verificationNote?: string | null;
        reviewed?: boolean;
    },
): Promise<DocumentItem> {
    const { data } = await api.patch<DocumentItem>(
        `/documents/${docId}`,
        payload,
    );
    return data;
}

export async function deleteDocument(
    docId: string,
): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(
        `/documents/${docId}`,
    );
    return data;
}

// ── Quick Notes Endpoints ────────────────────────────────────────────────────
export interface QuickNoteItem {
    id: string;
    body: string;
    createdAt: string;
}

export async function fetchQuickNotes(limit = 20): Promise<QuickNoteItem[]> {
    const { data } = await api.get<QuickNoteItem[]>("/notes", {
        params: { limit },
    });
    return data;
}

export async function createQuickNote(body: string): Promise<QuickNoteItem> {
    const { data } = await api.post<QuickNoteItem>("/notes", { body });
    return data;
}

export async function deleteQuickNote(
    id: string,
): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/notes/${id}`);
    return data;
}

// ── Omni Search Endpoints ────────────────────────────────────────────────────
export interface OmniSearchClient {
    id: string;
    name: string;
    matterType: string;
    phone: string;
    status: string;
}

export interface OmniSearchDocument {
    id: string;
    fileName: string;
    detectedType: string | null;
    category: string;
    clientId: string;
    clientName: string;
}

export interface OmniSearchResponse {
    clients: OmniSearchClient[];
    documents: OmniSearchDocument[];
}

export async function searchOmni(query: string): Promise<OmniSearchResponse> {
    const { data } = await api.get<OmniSearchResponse>("/search", {
        params: { q: query },
    });
    return data;
}
