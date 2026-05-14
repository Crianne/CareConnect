export enum UserRole {
  ADMIN = 'admin',
  DONOR = 'donor'
}

export enum LoyaltyTier {
  BRONZE = 'Bronze Champion',
  SILVER = 'Silver Champion',
  GOLD = 'Gold Champion',
  PLATINUM = 'Platinum Champion'
}

export enum PatientPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  GENERAL = 'General'
}

export enum PatientStatus {
  ACTIVE = 'Active',
  COMPLETED = 'TreatmentCompleted',
  INACTIVE = 'Inactive'
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  loyaltyTier: LoyaltyTier;
  totalContribution: number;
  verifiedContributionsCount: number;
  donationStreak: number;
  lastDonationDate?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Patient {
  id: string;
  publicIdentifier: string;
  fullName: string;
  age: number;
  diagnosis: string;
  treatmentPlan: string;
  priority: PatientPriority;
  fundingGoal: number;
  fundingRaised: number;
  status: PatientStatus;
  isPublic: boolean;
  medicalDocuments?: { id: string; name: string; url: string; uploadedAt: string }[];
  createdAt: string;
  lastUpdated: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName?: string;
  patientId?: string;
  amount: number;
  currency: string;
  paymentMethod: 'gcash' | 'card' | 'crypto';
  receiptUrl?: string; // For GCash proof
  blockchainTxHash?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  timestamp: string;
  verifiedAt?: string;
  verifiedBy?: string;
  type?: 'regular' | 'auction_payment';
  auctionId?: string;
}

export interface AuctionItem {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  imageUrl: string;
  startPrice: number;
  currentBid: number;
  highestBidderId?: string;
  highestBidderName?: string;
  endTime: string;
  status: 'draft' | 'audit' | 'active' | 'closed';
  paymentStatus?: 'pending_verification' | 'verified' | 'rejected';
  finalizedAt?: string;
  blockchainFinalTx?: string;
  contractAddress?: string;
  contractDeployed?: boolean;
  deployedAt?: string;
  lastUpdated?: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  timestamp: string;
  txHash?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
}

export interface AppConfiguration {
  gcashQrUrl: string;
  maintenanceMode: boolean;
  allowPublicSubmissions: boolean;
  privacyNotice: string;
}
