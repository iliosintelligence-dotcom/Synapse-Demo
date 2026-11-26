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

/** A video thumbnail shows its MIDDLE frame (2026-11-26, Eden: "the very first frame can be black ... the frame in the
 *  middle is what should display"). Once the length is known, the paused video jumps to halfway, which is what it then
 *  shows. A video whose length cannot be read keeps its first frame (#t=0.1), so nothing ever goes blank. */
export function seekToMiddle(v: HTMLVideoElement): void {
  const d = v.duration;
  if (Number.isFinite(d) && d > 0.4) v.currentTime = d / 2;
}
/** A video file by its address alone (no media_type to go on). */
export const isVideoUrl = (u: string | null | undefined): boolean => /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(u ?? ""));

/** The listing's cover: its first photo, else its first video (drawn as the video's first frame by <Thumb>), else none.
 *  A listing with only videos used to have no cover at all (2026-11-26: five listings showed blank everywhere). */
export const coverUrl = (media: PropertyMedia[] | null | undefined): string | null => {
  const list = orderedMedia(media);
  const photo = list.find((m) => !isVideo(m));
  return photo?.url ?? list[0]?.url ?? null;
};
