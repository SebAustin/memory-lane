import type { Domain } from "@/contracts";

/** Plain-language label for each Cue domain (CONTEXT.md: music Cues are artists). */
export const DOMAIN_LABEL: Readonly<Record<Domain, string>> = {
  music: "Music",
  film: "Film",
  tv: "TV",
  book: "Book",
  place: "Place",
  brand: "Brand",
};
