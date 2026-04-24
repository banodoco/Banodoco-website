export interface ShipButtonBundleLike {
  version?: number;
}

export function getShipButtonLabel(shippedBundle?: ShipButtonBundleLike | null): string {
  return `Ship v${(shippedBundle?.version ?? 0) + 1}`;
}
