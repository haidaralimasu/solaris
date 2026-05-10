import type { Network } from "./simulate";

export type AlertConditionType =
  | "any_activity"
  | "instruction_discriminator"
  | "error_events"
  | "large_sol_transfer";

export type AlertCondition =
  | { type: "any_activity" }
  | { type: "instruction_discriminator"; discriminator: string } // 8-byte hex
  | { type: "error_events" }
  | { type: "large_sol_transfer"; thresholdSol: number };

export type NotifyChannel = "in_app" | "browser";

export type AlertRule = {
  id: string;
  name: string;
  programId: string;
  network: Network;
  conditions: AlertCondition[];
  notifyVia: NotifyChannel[];
  enabled: boolean;
  createdAt: number;
  lastCheckedAt?: number;
  lastSignatureSeen?: string;
};

export type AlertEvent = {
  id: string;
  ruleId: string;
  ruleName: string;
  signature: string;
  network: Network;
  programId: string;
  conditionMatched: AlertConditionType;
  status: "success" | "failed";
  timestamp: number;
  acknowledged: boolean;
};

// /api/alerts/check request
export type AlertCheckRequest = {
  programId: string;
  network: Network;
  afterSignature?: string;
  conditions: AlertCondition[];
};

// One matching event from the check
export type AlertMatch = {
  signature: string;
  slot: number;
  blockTime: number | null;
  status: "success" | "failed";
  conditionMatched: AlertConditionType;
};

// /api/alerts/check response
export type AlertCheckResponse = {
  matches: AlertMatch[];
  latestSignature: string | null;
};
