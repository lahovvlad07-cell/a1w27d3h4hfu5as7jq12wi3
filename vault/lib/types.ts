export type ServiceType = "vpn" | "ai" | "points";

export interface PrizeSummary {
  label: string;
  serviceType: ServiceType;
  oddsPercent: number;
  isFreeTier: boolean;
}

export interface CaseSummary {
  key: string;
  title: string;
  price: number;
  prizes: PrizeSummary[];
}

export interface OpenCaseResult {
  prize: {
    label: string;
    serviceType: ServiceType;
    rewardValue: string;
  };
  promocode: string | null;
  mock: { note: string; vlessLink?: string } | null;
  balance: number;
}
