export type UserRole = "player" | "operator";

export interface User {
  id: string;
  email?: string;
  walletAddress: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  kycStatus?: "pending" | "verified" | "rejected";
}

export interface UserBalance {
  userId: string;
  currency: string;
  balance: bigint; // in smallest currency unit
  updatedAt: Date;
}

export interface AuthSession {
  userId: string;
  walletAddress: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}