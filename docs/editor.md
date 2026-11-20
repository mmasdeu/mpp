# Mode editor

`npm run edit` arrenca el servidor de desenvolupament amb l'editor (`EDITOR=1`, escolta només a 127.0.0.1). A la web publicada (build estàtic) el
codi de l'editor no hi és. A la part superior hi ha la barra **Mode editor**: activeu-lo i indiqueu el vostre nom (revisor/a).

Cada canvi s'escriu directament als fitxers de dades (capes de superposició; l'extracció original no es toca) i la pàgina es recarrega:

| Des de | Què es pot fer | Fitxer |
|---|---|---|
| Fitxa d'agulla | corregir nom, noms alternatius, número de Semir, pàgines del llibre i text original; marcar com a **revisada** / **verificada**; desfer; rebutjar; fusionar | `data/review/decisions.json` |
| Fitxa d'agulla | coordenades i precisió (font: «Editor: nom, data») | `data/locations.json` |
| Fitxa d'agulla | treure un dibuix, **moure'l** a una altra agulla, afegir-ne un per número de pàgina | `data/drawings.json` + `data/source/drawings-manual.csv` |
| Pàgina de secció | text d'introducció, mapes (treure/moure/afegir), moure la secció a una altra regió | `data/review/intros.json`, `data/maps.json` + `data/source/maps-manual.csv`, `data/review/structure.json` |
| Pàgina de regió | text d'introducció, mapes | idem |

- Tot queda visible a git (`git diff data/`). Les assignacions d'imatges també s'anoten als CSV manuals perquè tornar a executar
  `match-drawings.py` / `match-maps.py` no les perdi.
- «Verificada» és el nivell més alt (una segona persona ha comparat la fitxa amb el llibre); «revisada» és la primera revisió.
- Seguretat: l'API (`/__edit/*`) només existeix amb `npm run edit`, exigeix la capçalera `x-editor` i rebutja orígens diferents.
  No exposeu aquest servidor a la xarxa.
- La cua de revisió (`/revisio/`) escriu a `data/review/decisions.json` en mode editor; sense l'editor desa al navegador i s'exporta.
- Proves: `npm run test` (servidor d'edició, sobre un directori temporal) i `npm run test:editor` (fum de la interfície; no escriu dades).

## Situar agulles al mapa

Al mapa (`/` o `/map/`), seleccioneu una agulla i premeu **Situa-la al mapa** (o **Mou-la al mapa** si ja té coordenades). També hi podeu anar
des del panell d'edició de la fitxa. Feu clic al mapa on és l'agulla, arrossegueu el marcador taronja per afinar-lo, trieu la precisió
(aproximada o verificada) i premeu **Desa la ubicació**. El registre es desa a `data/locations.json` amb la font `Editor: <nom>, <data>`.
**Treu-la del mapa** n'esborra la ubicació. Esc o **Cancel·la** surten sense desar. Activeu l'ortofoto o el 3D per situar-les amb més
precisió.

## Tot el text en un sol fitxer: `data/textos.json` (cercable i editable)

`data/textos.json` recull, en ordre del llibre, tot el text que mostra la web: introduccions de regió i de secció, agulles (amb les
entrades fusionades, en ordre de pàgina, cadascuna encapçalada amb `[Nom]`) i biografies d'escaladors. Cada entrada té `id`, `tipus`,
`nom`, `lloc`, `pagines`, `estat` (`revisat`, `ocr` o `sense text`), `web` (la pàgina corresponent) i `text`.

**Es pot editar a mà**, amb qualsevol eina. Es tenen en compte els canvis de:
- `text`: el text passa a ser la transcripció revisada (com si s'hagués desat a l'editor web);
- `estat`: posar `"revisat"` marca el text actual com a revisat sense canviar-lo;
- `nom` (agulles i escaladors) i `pagines` (agulles, escaladors, introduccions).

Els altres camps i l'ordre de les entrades no es fan servir. Els canvis s'importen:
- amb `npm run textos` (importa i torna a escriure el fitxer; també ho fa `npm run build`);
- amb l'editor engegat (`npm run edit`): sols, en desar el fitxer, i també abans de cada canvi fet a la web.

Com a signatura s'hi posa `$MPP_REVIEWER` o, si no hi és, el nom de `git config user.name`. Les correccions van a les mateixes capes que
l'editor web (`review/decisions.json`, `review/intros.json`, `review/biographies.json`), de manera que tot queda a git.
Només s'importa el que ha canviat respecte de l'última versió escrita (`data/ocr/textos-base.json`): un fitxer obert fa estona no desfà
les correccions fetes a la web mentrestant. Si el fitxer no és JSON vàlid, no s'importa ni se sobreescriu res i surt un avís.

Git ignora el fitxer (drets d'autor), com `data/ocr/`; `.vscode/settings.json` fa que la cerca de VS Code hi entri igualment.
