# A prop meu (GPS, brúixola i realitat augmentada)

Pàgina `/a-prop/` (pestanya «A prop» al mòbil). Tot es calcula al dispositiu; no s'envia cap dada.

- **Llista**: agulles situades dins de l'abast (250 m – 5 km, 1 km per defecte, es recorda al navegador), ordenades per distància, amb
  rumb (punt cardinal), desnivell i una fletxa que apunta cap a l'agulla respecte a on mira el mòbil (o respecte al nord sense brúixola).
- **Càmera (RA)**: vídeo de la càmera posterior a pantalla completa i, a sobre, les 14 agulles més properes que cauen dins del camp de
  visió amb etiqueta (la resta, com a punts). Tocar una etiqueta obre la fitxa.

Càlculs (`src/lib/geo/nearby.ts`, amb proves a `tests/unit/nearby.test.ts`):
- distància i rumb per gran cercle; angle d'elevació amb curvatura terrestre i refracció (k = 0,13);
- orientació de la càmera a partir dels angles DeviceOrientation (alpha absolut, beta, gamma): rumb i inclinació de l'eix de la càmera
  posterior i gir de la pantalla (també en apaïsat);
- projecció a pantalla amb els camps de visió del vídeo tal com es veu (`object-fit: cover`), i desencavalcament de les etiquetes.

Altituds: la de l'agulla (dades: TOT MONTSERRAT, OSM) o, si no en té, la del model del terreny ICGC 5 m (les mateixes tessel·les del
mapa 3D, `src/lib/geo/dem.ts`; funcionen sense connexió si s'ha baixat el paquet «Relleu 3D»). La de l'usuari: terreny + 1,6 m o, si
no hi ha model, l'altitud del GPS − 50 m (ondulació del geoide). Sense altituds, les etiquetes van a l'horitzó.

Sensors (`src/lib/geo/sensors.svelte.ts`): `deviceorientationabsolute` (Android/Chrome) o `webkitCompassHeading` (iOS, cal tocar un botó
per donar permís). La brúixola dels mòbils pot desviar-se uns graus: a la càmera, ⚙ → «Correcció de la brúixola» i «Camp de visió».
Cal HTTPS (o localhost) per a la ubicació, l'orientació i la càmera.

Limitacions: no es calcula si una agulla queda amagada darrere d'una altra muntanya; les agulles sense coordenades no hi surten.

## Vista simulada (`/vista/?lat=…&lon=…[&b=rumb]`)

Des del mapa: botó «Vista» (ull) i tocar un punt. També des de la fitxa d'una agulla («Vista des del cim») i des d'«A prop meu».
Mostra el mapa 3D (relleu ICGC 5 m a escala real, ortofoto o topogràfic) amb la càmera a l'alçada dels ulls (2 m; també 10, 30 o
100 m), i les agulles que es veuen des d'allà etiquetades. Arrossegar = mirar al voltant; botons ⟲ ⟳ (30°), + − (zoom), fletxes del
teclat. Inicialment mira cap on hi ha més agulles a prop.

Quines agulles es veuen: per a cada agulla a menys de 8 km es comprova la línia de visió sobre el model del terreny
(`lineOfSight` a `src/lib/geo/nearby.ts`, mostreig cada 30–100 m, curvatura i refracció). Les tessel·les del model es baixen totes
alhora al principi (`prefetch`, `src/lib/geo/dem.ts`). Les amagades es poden mostrar (punts esvaïts).

Límits: el model de 5 m arrodoneix les agulles (es veu el massís, no cada pinacle); MapLibre no permet mirar per sobre de l'horitzó
amb el relleu activat (inclinació màxima 89°). Cal connexió, o els paquets «Relleu 3D» i mapa de fons baixats.
