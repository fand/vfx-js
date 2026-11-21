// `@vfx-js/effects/holo/static`: HoloEffect with every material built in. The default HoloEffect loads a material's
// code when it is first used (a separate file per material); this entry imports them all up front, for builds and
// environments where loading code later is not wanted (CommonJS, no bundler, no waiting when the material changes).
import { emboss } from "./_holo/materials/emboss.js";
import { nebula } from "./_holo/materials/nebula.js";
import { prism } from "./_holo/materials/prism.js";
import { registerMaterials } from "./_holo/materials/registry.js";
import { shatter } from "./_holo/materials/shatter.js";
import { sparkle } from "./_holo/materials/sparkle.js";
import { vortex } from "./_holo/materials/vortex.js";

registerMaterials([prism, shatter, nebula, sparkle, vortex, emboss]);

export type { HoloSettingId } from "./_holo/data/params.js";
export type { HoloStartingPointNames } from "./_holo/data/starting-points.js";
export * from "./holo.js";
