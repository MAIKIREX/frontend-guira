import type { MapArcDatum } from '@/components/ui/map';

export interface GlobalFlowStat {
  flow_type: string;
  destination_currency: string;
  currency: string;
  transaction_count: number;
  total_amount: number;
}

export interface PaymentArc extends MapArcDatum {
  flow_type: 'bolivia_to_world' | 'world_to_bolivia';
  origin_label: string;
  destination_label: string;
  transaction_count: number;
  total_amount: number;
  source_currency: string;
  destination_currency: string;
}

const BOLIVIA: [number, number] = [-64.9631, -16.2902];

// Coordenadas representativas por moneda de destino/origen
const CURRENCY_COUNTRY: Record<
  string,
  { label: string; coords: [number, number] }
> = {
  USD: { label: 'Estados Unidos', coords: [-98.5795, 39.8283] },
  EUR: { label: 'Europa',         coords: [10.4515,  51.1657] },
  GBP: { label: 'Reino Unido',    coords: [-3.4360,  55.3781] },
  MXN: { label: 'México',         coords: [-102.5528, 23.6345] },
  COP: { label: 'Colombia',       coords: [-74.2973,  4.5709] },
  BRL: { label: 'Brasil',         coords: [-51.9253, -14.2350] },
  // Alias comunes
  BS:  { label: 'Bolivia',        coords: BOLIVIA },
  BOB: { label: 'Bolivia',        coords: BOLIVIA },
};

export function buildArcs(stats: GlobalFlowStat[]): PaymentArc[] {
  const result: PaymentArc[] = [];

  stats.forEach((stat, i) => {
    const destKey = stat.destination_currency.toUpperCase();
    const srcKey  = stat.currency.toUpperCase();

    if (stat.flow_type === 'bolivia_to_world') {
      const dest = CURRENCY_COUNTRY[destKey];
      if (!dest) return;
      result.push({
        id: `bo-to-world-${destKey}-${i}`,
        flow_type: 'bolivia_to_world',
        from: BOLIVIA,
        to: dest.coords,
        origin_label: 'Bolivia',
        destination_label: dest.label,
        transaction_count: stat.transaction_count,
        total_amount: stat.total_amount,
        source_currency: srcKey,
        destination_currency: destKey,
      });
      return;
    }

    if (stat.flow_type === 'world_to_bolivia') {
      // La moneda de origen es la del campo `currency` cuando no es BOB/BS
      const originKey = srcKey === 'BOB' || srcKey === 'BS' ? destKey : srcKey;
      const origin = CURRENCY_COUNTRY[originKey];
      if (!origin || origin.label === 'Bolivia') return;
      result.push({
        id: `world-to-bo-${originKey}-${i}`,
        flow_type: 'world_to_bolivia',
        from: origin.coords,
        to: BOLIVIA,
        origin_label: origin.label,
        destination_label: 'Bolivia',
        transaction_count: stat.transaction_count,
        total_amount: stat.total_amount,
        source_currency: originKey,
        destination_currency: destKey,
      });
    }
  });

  return result;
}

export const BOLIVIA_COORDS = BOLIVIA;
