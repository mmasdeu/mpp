# Agulles al mapa i mapa 3D: estudi i prototip

## 1. Interfície (nov. 2026)

La pàgina d'inici és ara el mapa (`/`, també `/map/`). A l'ordinador hi ha un mapa a pantalla completa amb un panell lateral per cercar, filtrar
i llistar les agulles. Al mòbil el panell és una fulla inferior amb tres alçades (arrossegueu-la o toqueu-ne la nansa), i la navegació
principal passa a una barra de pestanyes a baix: Mapa, Regions, Cerca i Més. La llista de regions s'ha mogut a `/regions/`. El tema fosc
segueix la configuració del sistema. Les pàgines de regió, secció i agulla tenen un mapa petit que es carrega quan entra a la pantalla.

L'estat del mapa es desa a l'URL: `?needle=`, `region=`, `section=`, `q=`, `geo=`, `base=topo|orto|otm` i `3d=1`. Així es pot enllaçar una vista.

## 2. Agulles directament al mapa

**Estat actual.** Implementat. Hi ha 200 de 569 agulles (35 %) amb coordenades, totes `approximate` i totes procedents d'OpenStreetMap: 188
s'han enllaçat pel nom i 12 per l'identificador OSM. Cada punt té el color de la seva regió. Els noms apareixen a partir del zoom 14,3, amb
gestió de col·lisions, perquè no se superposin. En passar-hi el ratolí surt el nom. En fer-hi clic s'obre una fitxa resum al panell: dibuix,
estat de revisió, número de Semir, pàgina i enllaç a la fitxa completa. S'ha tret l'agrupament (*clustering*): amb 200 punts en un massís
petit amagava més del que ajudava.

**Agulles sense coordenades (369).** Surten a la llista amb una icona. Si se'n selecciona una, el mapa enquadra les agulles localitzades de la
seva secció. Res no s'inventa: les coordenades només s'afegeixen amb font i precisió documentades.

| Regió | Localitzades |
|---|---|
| Agulles | 53 / 104 |
| Frares Encantats | 29 / 73 |
| Ecos | 46 / 103 |
| Sant Jeroni | 19 / 84 |
| Magdalenes o Tebes | 32 / 102 |
| Tebaida | 21 / 103 |

**Com localitzar la resta**, de més a menys rendible:

1. **Situar-les a mà al mode editor (implementat).** Amb `npm run edit` i el mode editor actiu, seleccioneu una agulla al mapa i premeu
   «Situa-la al mapa» (o «Mou-la al mapa»). Feu clic on és, arrossegueu el marcador per afinar-lo, trieu la precisió i deseu-ho. Es desa a
   `data/locations.json` amb la font «Editor: nom, data». També hi ha un enllaç al panell d'edició de cada fitxa.
2. **Georeferenciar els 37 plànols de secció del llibre.** Es posen 4–6 punts de control per plànol (agulles ja localitzades, cims, coll i
   camins de l'ICGC) i es fa una transformació afí o polinòmica. Després es marquen els números de Semir de cada plànol. Això donaria posicions
   aproximades (±20–50 m) per a gairebé totes les agulles, amb una font traçable (pàgina i número). L'esforç és mitjà: es pot fer en lots,
   amb un petit editor de punts de control.
3. **Més aparellament de noms.** Es pot comparar amb la toponímia de l'ICGC (Nomenclàtor, capa de topònims de ContextMaps) i amb noms
   alternatius d'OSM. És barat, però cobreix poc: moltes agulles del llibre no tenen topònim oficial.
4. **El plànol de Ramon de Semir**, si se'n troba una versió georeferenciable. Els números ja són a les fitxes.

Quan hi hagi més de 400 punts, convé tornar a l'agrupament a zoom baix (< 13) o amagar els punts de les regions no seleccionades.

## 3. Mapa 3D

**Prototip implementat.** Al mapa gran i als mapes petits, el botó **3D** activa el relleu (MapLibre `setTerrain`), un ombrejat de relleu, el
cel i una inclinació de 62°. Per inclinar i girar es fa servir el botó dret del ratolí o dos dits. El botó de capes permet triar el mapa de
fons: topogràfic ICGC (per defecte), ortofoto ICGC o OpenTopoMap.

| Font | Resolució | Ús | Llicència |
|---|---|---|---|
| ICGC MDT 5 m (terrain-RGB 512 px, `geoserveis.icgc.cat/servei/catalunya/contextmaps-terreny-5m-rgb`) | 5 m a Catalunya, 30 m fora | elevació 3D i ombres (per defecte) | CC BY 4.0 |
| Mapterhorn (terrarium) | ~30 m global | alternativa automàtica si l'ICGC falla | oberta, cal citar |
| ICGC topogràfic / ortofoto (WMTS `MON3857NW`) | fins a z18 | mapa de fons | CC BY 4.0 |

Els URL vénen de la configuració oficial de la llibreria MapICGC GL JS. El codi del 3D s'ha provat amb un model d'elevació sintètic, perquè
l'entorn on l'he desenvolupat no té accés a internet. **Cal comprovar al navegador que les rajoles reals de l'ICGC es carreguen.** Si el
mapa de fons de l'ICGC fallés, el mapa ho avisa i es pot canviar a OpenTopoMap.

**Consideracions**

- **Rendiment.** Funciona amb WebGL2, present a qualsevol mòbil recent. Amb molta inclinació es baixen més rajoles; per això el 3D no
  s'activa per defecte.
- **Ús sense connexió (implementat).** A «Ús sense connexió» es poden descarregar paquets de la zona del massís (marge d'1,5 km):
  topogràfic z10–16 (683 rajoles, ≈ 20 MB), relleu 3D z8–14 (59 rajoles, ≈ 4 MB), topogràfic z17 (≈ 53 MB) i ortofoto z10–16 (≈ 53 MB).
  El *service worker* respon les rajoles de l'ICGC des de la memòria cau (`tiles-v1`) i, quan hi ha connexió, també hi desa les que es
  veuen dins la zona (fins a z17), de manera que la memòria cau té un límit conegut. OpenTopoMap i Mapterhorn no es desen mai: les seves
  condicions no permeten descàrregues massives. Els punts de les agulles surten de les dades de l'aplicació, sense cap petició de xarxa.
  Codi: `src/lib/pwa/tiles.ts`.
- **Altitud de les agulles.** Amb el model de 5 m es podria calcular l'altitud aproximada de cada agulla localitzada
  (`queryTerrainElevation`) i mostrar-la a la fitxa, marcada com a «derivada del MDT».
- **Models 3D fotorealístics de l'ICGC.** Hi ha l'estil `ORTO3D` i malles 3D Tiles. Es veuen millor, però requereixen Cesium o deck.gl, molt
  més pesants, i no funcionen sense connexió. No els recomano per ara.
- **Vistes del llibre.** Amb el relleu 3D es poden definir càmeres (posició, rumb, inclinació) que reprodueixin la vista d'un
  dibuix o d'una panoràmica del llibre.

## 4. Fitxers

`src/lib/components/Map/Map.svelte` és el mapa: capes, selecció, mapes de fons, 3D i alternativa automàtica del model d'elevació.
`Map/config.ts` conté les fonts. `Map/MiniMap.svelte` és el mapa petit amb càrrega diferida. `Explorer/Explorer.svelte` és el panell
lateral o fulla inferior. `src/lib/ui/` conté les icones i els colors de regió, i `src/app.css` els tokens de disseny i el tema fosc.
