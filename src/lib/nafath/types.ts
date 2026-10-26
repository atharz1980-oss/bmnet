export type NafathStatus = "pending" | "completed" | "failed" | "expired" | "cancelled";

export interface NafathStartResponse {
  success: boolean;
  authUrl?: string;
  requestId?: string;
  error?: string;
}

export interface NafathVerifyResponse {
  success: boolean;
  status: NafathStatus;
  nationalId?: string;
  fullName?: string;
  verifiedAt?: string;
  requestId?: string;
  error?: string;
}

export interface NafathSession {
  id: string;
  rentalId: string | null;
  status: NafathStatus;
  requestId: string | null;
  nationalId: string | null;
  fullName: string | null;
  verifiedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
