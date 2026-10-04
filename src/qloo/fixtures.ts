import "server-only";
import indexFile from "../../fixtures/qloo/index.json";
import p1Music from "../../fixtures/qloo/fx-p1-music.json";
import search from "../../fixtures/qloo/fx-search.json";
import tags from "../../fixtures/qloo/fx-tags.json";
import { loadFixtureIndex } from "./fixture";

/**
 * The hand-made `fx-` fixtures, bundled statically so they travel with the
 * server build on any host (no runtime file-system access). Add each new
 * `fixtures/qloo/fx-*.json` file to this map.
 */
export const bundledFixtureIndex = loadFixtureIndex(indexFile, {
  "fx-p1-music.json": p1Music,
  "fx-search.json": search,
  "fx-tags.json": tags,
});
