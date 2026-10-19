import type { PropertyMedia } from "./types";

export const isVideo = (m: { url: string; media_type?: string | null }): boolean =>
  m.media_type === "video" || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(m.url);

/** Photos and videos in display order, with the first photo leading (a video uploaded first comes straight after it). */
export function orderedMedia(media: PropertyMedia[] | null | undefined): PropertyMedia[] {
  const list = (media ?? []).filter((m) => m?.url).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const first = list.findIndex((m) => !isVideo(m));
  if (first > 0) list.unshift(list.splice(first, 1)[0]);
  return list;
}

export const coverUrl = (media: PropertyMedia[] | null | undefined): string | null => {
  const photo = orderedMedia(media).find((m) => !isVideo(m));
  return photo?.url ?? null;
};
