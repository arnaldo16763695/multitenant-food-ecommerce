export type PlatformSurface = {
  readonly name: string;
  readonly description: string;
  readonly href: string;
};

export type ProjectPhase = {
  readonly name: string;
  readonly goal: string;
  readonly deliverables: readonly string[];
};

export type BrandCard = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly cuisine: string;
  readonly headline: string;
  readonly nearestBranch: string;
  readonly etaMinutes: number;
  readonly accent: string;
};
