/**
 * Type definitions for the Universal Interactive System Modeler
 */

export type NodeCategory =
  | "pressure"
  | "population"
  | "social"
  | "solution"
  | "environment"
  | "resource"
  | "policy"
  | "economic"
  | "default";

export interface SystemModelNode {
  id: string;
  label: string;
  desc: string;
  example?: string;
  category: NodeCategory;
  key?: boolean;
  // D3 simulation positions (set at runtime, not serialized)
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SystemModelLink {
  source: string;
  target: string;
  type: "reinforcing" | "balancing";
  label: "+" | "-";
  lag: string;
}

export interface SystemModelLoop {
  id: string;
  type: "R" | "B";
  name: string;
  desc: string;
  nodes: string[];
}

export interface SystemModelArchetype {
  id: string;
  name: string;
  description: string;
  relatedLoops: string[];
}

export interface SystemModel {
  name: string;
  description?: string;
  nodes: SystemModelNode[];
  links: SystemModelLink[];
  loops: SystemModelLoop[];
  archetypes?: SystemModelArchetype[];
}

export type ModelPhase =
  | "input"
  | "generate"
  | "iterate"
  | "collide"
  | "humanize";

export interface CollisionResult {
  concept: string;
  loadbearingDelusion: string;
  loadbearingDelusionExplanation: string;
  hiddenRelationships: string[];
  isomorphMapping: string;
  updatedModel: SystemModel;
}

export interface StakeholderPerspective {
  stakeholder: string;
  narrativeShift: string;
  hook: string;
  emotionalCore: string;
}

export type NarrativeMode = "story" | "professional";

export interface ProfessionalStakeholder {
  stakeholder: string;
  role: string;
  influence: "high" | "medium" | "low";
  incentives: string;
  keyLoops: string[];
}

export interface ProfessionalInsight {
  insight: string;
  relatedLoop: string;
  evidence: string;
  severity: "critical" | "significant" | "moderate";
}

export interface PolicyRecommendation {
  recommendation: string;
  targetLoop: string;
  expectedImpact: string;
  timeframe: string;
  difficulty: "high" | "medium" | "low";
}

export interface ProfessionalSection {
  executiveSummary: string;
  systemDynamicsOverview: string;
  stakeholderAnalysis: ProfessionalStakeholder[];
  keyInsights: ProfessionalInsight[];
  policyRecommendations: PolicyRecommendation[];
  archetypeAnalysis: string;
}

export interface NarrativeResult {
  title: string;
  narrative: string;
  characters: {
    name: string;
    representsNode: string;
    role: string;
  }[];
  stakeholderPerspectives?: StakeholderPerspective[];
  mode?: NarrativeMode;
  professional?: ProfessionalSection;
}

export interface ModelInputConfig {
  topic: string;
  inputType: "topic" | "text" | "pdf" | "url";
  content?: string;
  useRag: boolean;
}
