import type { CardPack } from "@/lib/game/types";
import ca from "./classic/ca.json";
import cs from "./classic/cs.json";
import de from "./classic/de.json";
import el from "./classic/el.json";
import enAu from "./classic/en-au.json";
import enCa from "./classic/en-ca.json";
import enFamily from "./classic/en-family.json";
import enGb from "./classic/en-gb.json";
import enIntl from "./classic/en-intl.json";
import enUs from "./classic/en-us.json";
import esAr from "./classic/es-ar.json";
import es from "./classic/es.json";
import gl from "./classic/gl.json";
import he from "./classic/he.json";
import it from "./classic/it.json";
import nl from "./classic/nl.json";
import ptBr from "./classic/pt-br.json";
import ptPt from "./classic/pt-pt.json";
import ro from "./classic/ro.json";
import ru from "./classic/ru.json";
import tr from "./classic/tr.json";
import { corePack } from "./core";
import { officePack } from "./office";

/**
 * Sets adapted from free print-and-play decks. They are shared under the licences in
 * `classic/LICENSE.md`, and the credits page shows the attribution those licences require.
 * The lobby groups sets by language in this order.
 */
const CLASSIC_PACKS: CardPack[] = [
  enUs,
  enGb,
  enCa,
  enAu,
  enIntl,
  enFamily,
  ca,
  cs,
  de,
  es,
  esAr,
  gl,
  it,
  nl,
  ptBr,
  ptPt,
  ro,
  tr,
  el,
  ru,
  he,
];

/** The first set is selected by default in new rooms. */
export const BUILT_IN_PACKS: CardPack[] = [corePack, officePack, ...CLASSIC_PACKS];

export function getBuiltInPack(id: string): CardPack | undefined {
  return BUILT_IN_PACKS.find((pack) => pack.id === id);
}
