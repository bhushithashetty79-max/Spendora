import type { Category } from '@/types';
import {
  UtensilsCrossed,
  Bus,
  GraduationCap,
  Clapperboard,
  ShoppingBag,
  ReceiptText,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_META: Record<Category, { icon: LucideIcon; color: string; bg: string; ring: string }> = {
  Food: { icon: UtensilsCrossed, color: 'text-mint-300', bg: 'bg-mint-500/15', ring: 'ring-mint-400/30' },
  Travel: { icon: Bus, color: 'text-teal-400', bg: 'bg-teal-500/15', ring: 'ring-teal-400/30' },
  Education: { icon: GraduationCap, color: 'text-sky-400', bg: 'bg-sky-500/15', ring: 'ring-sky-400/30' },
  Entertainment: { icon: Clapperboard, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', ring: 'ring-fuchsia-400/30' },
  Shopping: { icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-400/30' },
  Bills: { icon: ReceiptText, color: 'text-rose-400', bg: 'bg-rose-500/15', ring: 'ring-rose-400/30' },
  Other: { icon: Wallet, color: 'text-slate-300', bg: 'bg-slate-500/15', ring: 'ring-slate-400/30' },
};

export function statusColor(status: string): { bar: string; chip: string; text: string } {
  switch (status) {
    case 'over':
      return { bar: 'bg-rose-500', chip: 'border-rose-500/40 bg-rose-500/10 text-rose-400', text: 'text-rose-400' };
    case 'approaching':
      return { bar: 'bg-gold-500', chip: 'border-gold-500/40 bg-gold-500/10 text-gold-400', text: 'text-gold-400' };
    case 'pacing':
      return { bar: 'bg-gold-400', chip: 'border-gold-400/40 bg-gold-400/10 text-gold-400', text: 'text-gold-400' };
    default:
      return { bar: 'bg-mint-500', chip: 'border-mint-400/40 bg-mint-400/10 text-mint-300', text: 'text-mint-300' };
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'over':
      return 'Over Budget';
    case 'approaching':
      return 'Approaching Limit';
    case 'pacing':
      return 'Pacing Warning';
    default:
      return 'On Track';
  }
}
