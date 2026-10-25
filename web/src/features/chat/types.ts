import type { TojuMatch } from "@/features/browse/types";

/** One row of a Tayo market-history card. */
interface PriceHistory {
  area: string;
  unit?: string;
  summary?: string;
  rows: Array<{ period: string; typical: string; change?: string }>;
  sources?: Array<{ url: string; title: string }>;
}

/** What the server read to answer: said above the homes, in plain words. */
interface SearchedInfo { where?: string | null; live?: number; found?: number; kinds?: string }

/** A message in the saved thread. User messages carry only text; Tayo's carry everything that rendered with them, so a restored thread looks the same. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  matches?: TojuMatch[];
  priceHistory?: PriceHistory | null;
  more?: string | null;
  searched?: SearchedInfo | null;
}

/** The raw answer from the `toju-demo` function. */
export interface TojuResponse {
  reply?: string;
  more?: string | null;
  matches?: TojuMatch[];
  suggestions?: unknown;
  priceHistory?: PriceHistory | null;
  searched?: SearchedInfo | null;
  offerViewing?: boolean;
  error?: string;
}

/** The listing a buyer is replying about ("Discuss with an agent"). */
export interface ReplyTo {
  id: string;
  title: string | null;
  price: number | null;
  price_period: string | null;
  currency: string | null;
  listing_type: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: string | null;
  trust_score: number | null;
  property_media: Array<{ url: string; display_order: number | null; media_type: string | null }> | null;
}

/** "discuss": answer about this home and negotiate. "info": a home met on social; answer questions, do not open a negotiation. */
export type ReplyMode = "discuss" | "info";

/** A conversation set aside by "New chat", kept so it can be picked up again (its visitor id restores Tayo's memory). */
export interface ArchivedChat { id: string; visitorId: string; endedAt: number; title: string; homes: number; messages: ChatMessage[] }

/** A pinned reply and the homes under it. */
export interface Pin { id: string; text: string; more: string | null; matches: Array<{ id: string; title?: string; price?: number }>; at: number }
