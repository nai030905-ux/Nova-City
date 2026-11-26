# NOVA CITY — Open World 3D

Jeu 3D en monde ouvert jouable dans le navigateur (Three.js). Univers, ville, personnages
et éléments artistiques originaux.

## Lancer le jeu

Le jeu est séparé en 3 fichiers : `index.html` (structure), `style.css` (interface),
`script.js` (moteur du jeu, module ES). Three.js est chargé via CDN (internet requis
au premier lancement).

Comme `script.js` est un module ES, il faut servir les fichiers via HTTP local
(un double-clic sur index.html ne suffit plus) :

```bash
cd nova-city
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

(ou l'extension « Live Server » de VS Code, ou `npx serve`)

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD / Flèches | Déplacement |
| Souris (clic sur le jeu) | Caméra 3e personne |
| Maj | Courir |
| Espace | Sauter (frein à main en véhicule) |
| E | Interagir / entrer-sortir d'un véhicule |
| Tab | Téléphone NovaPhone |
| Échap | Pause |
| H | Klaxon |

## État du projet (build actuel : Phases 1 à 12 terminées)

### Fonctionne réellement (testé automatiquement, 15/15)
- Ville 3D 5×5 pâtés de maisons : centre-ville (gratte-ciels), résidentiel, parc avec arbres,
  bâtiments spéciaux (Hôpital, Université, Hôtel) avec enseignes
- Personnage 3D articulé (marche/course/saut animés), caméra 3e personne orbitale
- Véhicules : Berline, Sportive, Fourgon, Taxi — conduite différenciée (accélération,
  vitesse max, rayon de virage), entrée/sortie, collisions avec bâtiments, caméra de poursuite
- Circulation IA : 6 voitures autonomes qui parcourent les rues (carjackables)
- 22 PNJ animés : promenade, pauses, fuite devant un véhicule roulant vite
- Bâtiment accessible : Nova Burger (intérieur complet : sol, murs, porte, comptoir,
  caissier, enseigne) — achat de burger 10 $ à la caisse
- Économie : argent, transactions horodatées, pickups à 25 $, loyer/récompenses de missions
- Missions de livraison en boucle (marqueur 3D, récompense croissante)
- Cycle jour/nuit 4 min : soleil dynamique, ciel/aube/crépuscule, lampadaires et
  fenêtres qui s'allument la nuit
- HUD + minimap temps réel, téléphone NovaPhone (Banque/historique, Missions, Stats,
  Réglages graphiques fonctionnels, Sauvegarde)
- Menu principal, pause, sauvegarde/chargement localStorage, auto-save 30 s
- Klaxon + audio (Web Audio API)
- **PHASE 3 — Intérieurs & immobilier :**
  - Système de portes/intérieurs : 5 bâtiments accessibles et meublés
    (Hôpital, Université, Hôtel Nova, Appartement, Villa) avec entrée/sortie E
  - Hôpital : se soigner (25 $) ; Université : cours (50 $, 5 niveaux, +10 % de
    récompense de mission par niveau) ; Hôtel : chambre (50 $/nuit)
  - Immobilier : Appartement Nova (2 000 $) et Villa Horizon (8 000 $) achetables
    via le téléphone (onglet Immo) ; une fois possédées, on entre chez soi et on y dort
    (passe à 08:00, santé restaurée)
  - Meubles achetables (canapé, TV, plante, lampadaire, table basse) qui apparaissent
    réellement dans l'intérieur et persistent dans la sauvegarde
  - Santé ❤️ : percuté par le trafic = -15 PV ; 0 PV = WASTED (-20 % d'argent,
    réveil à l'hôpital) ; soins à l'hôpital ou sommeil
- **PHASE 4 — Véhicules avancés :**
  - 8 véhicules aux conduites différenciées : Berline, Sportive, Fourgon, Taxi,
    Moto (rapide, agile), Bus (lourd, lent), Bateau (uniquement sur l'eau), Avion
  - Moto, bus, bateau et avion avec modèles 3D dédiés (roues, hélice animée, coque…)
  - Transport public : ligne de bus circulaire avec 4 arrêts matérialisés ; le bus
    s'arrête 4 s à chaque arrêt ; montée (2 $), trajet en passager, demande d'arrêt (E)
  - Lac à l'est de la ville : plage de sable, ponton en bois, 2 bateaux amarrés,
    navigation bornée au plan d'eau
  - Aéroport au sud : piste 320 m avec marquage, tour de contrôle ; l'avion décolle
    au-delà de 32 m/s (altitude jusqu'à 85 m, hélice animée) et atterrit en ralentissant
  - Carburant ⛽ : chaque véhicule a son réservoir, la consommation dépend de la vitesse,
    panne sèche si vide ; station-service avec 2 pompes (plein à 2 $/L) + réparation (100 $)
  - Dommages : les chocs abîment le véhicule, la carrosserie fonce visiblement avec les
    dégâts (avertissement 🔧 au HUD sous 40 PV)
  - Concessionnaire : showroom intérieur avec 3 véhicules en exposition (moto, sportive,
    bateau) achetables ; reprise de TES véhicules à 50 % devant le magasin ; garage
    persistant sauvegardé (position, état, carburant)
- **PHASE 5 — PNJ avancés :**
  - 22 habitants nommés (Léa, Karim, Fatou…) avec 5 statuts : employé, étudiant,
    commerçant, retraité, sans emploi — vêtements selon le statut
  - Planning quotidien réel lié à l'horloge du jeu : travail (7h-18h) à leur lieu
    d'emploi (hôpital, concessionnaire, station, boutique, université), loisirs
    (18h-22h) au parc ou à l'hôtel, nuit (22h-7h) à domicile
  - Les PNJ « usagers » montent dans le bus de leur own initiative quand il s'arrête
    près d'eux, et en descendent à un arrêt
  - Dialogues contextuels (E près d'un habitant) : présentation, heure de la journée,
    réaction à ton véhicule, ton niveau d'études, tes livraisons, ta santé, tes
    propriétés, tes retrouvailles — avec système de relations ♥ (cadeaux d'amitié
    tous les 3 échanges avec la même personne)
  - Relations et historique de conversations sauvegardés
- **PHASE 6 — Économie & entreprises :**
  - 4 commerces achetables et gérables : Nova Burger (4 000 $), Hôtel Nova (12 000 $),
    Station Nova (15 000 $), Concessionnaire (20 000 $) — achat sur place (zone E à
    l'entrée) puis gestion complète via le téléphone (onglet Biz)
  - Gestion : stock (réassort payant au coût unitaire), prix de vente libre (le prix
    influe sur la demande : trop cher = plus personne), employés (2 max, embauche
    500 $ + salaire 100 $/jour prélevé à minuit — impayés = démission), amélioration
    du local (niveaux 1-3, plus de clients)
  - Simulation économique réelle : chaque heure de jeu, les clients achètent selon le
    personnel et le niveau ; ventes, salaires et bénéfice cumulé tracés dans la banque
    et dans l'onglet Biz
  - État des commerces (stock, prix, employés, bénéfice, niveau) sauvegardé
- **PHASE 7 — Activités & mini-jeux :**
  - Natation : dans le lac, tu nages (vitesse réduite) au lieu de marcher sur l'eau
  - Pêche au ponton : lancer (E), attente, « ça mord ! », ferrage rapide (E) sinon
    le poisson s'échappe ; vente 15–40 $
  - Salle Nova (nouveau bâtiment avec intérieur) : muscu 20 $/séance, forme 0–5
    qui augmente réellement la vitesse de course
  - Course de rue au parc : 3 anneaux de contrôle, récompense selon le temps
  - Basket au parc : panier cerceau + planche, réussite selon la forme, 10 $/panier
- **PHASE 8 — Histoire & missions :**
  - Histoire principale en 5 chapitres (démarrable depuis le téléphone → Missions) :
    livraison, rencontres, premier chez-soi meublé, course de rue, choix final
  - Choix final à deux issues (argent sale vs honnête) avec conséquences réelles
  - Messages reçus de Marc à chaque chapitre (onglet Social)
- **PHASE 9 — Téléphone complet :**
  - GPS : bouton « Activer le GPS » — distance à l'objectif sur le HUD + ligne verte
    sur la minimap
  - Onglet Social : messages de l'histoire + contacts (habitants avec relation ♥)
    appelables (réponses contextuelles)
  - Compteur de jours en ville + stats d'activités (poissons, paniers, courses)
  - Réglages : volume (klaxon et pluie sonores), qualité auto affichée
- **PHASE 10 — Météo, audio & optimisation :**
  - Météo dynamique : clair / pluie / orage / brouillard — pluie en particules 3D,
    éclairs en orage, brouillard qui réduit la visibilité, changement automatique
  - La pluie/orage réduit l'adhérence (accélération et virage) — vraie effet de jeu
  - Bruit de pluie généré (Web Audio) + volume réglable
  - Optimisation : culling des PNJ à plus de 130 m, qualité auto (réduction de la
    résolution si FPS < 35, remontée si FPS > 58)
- **PHASE 11 — Sauvegarde v2 & succès :**
  - Sauvegarde versionnée (v2) avec migration automatique des anciennes sauvegardes
  - 8 succès réels (véhicule, patrimoine, patron, diplômé, athlète, histoire,
    10 livraisons, populaire) avec toast de déblocage, listés dans Stats
  - Sauvegardés : histoire, forme, météo, jour, volume, succès, stats d'activités
- **PHASE 12 — Multijoueur (architecture réelle) :**
  - Serveur Node.js + WebSocket dans `server/` : authentification par token
    (tokens.json), noms uniques, validation/anti-spam serveur, chat assaini
  - Client : connexion depuis le téléphone (Réglages), avatars des autres joueurs,
    état envoyé à 10 Hz, chat — le jeu refuse poliment sans serveur (rien n'est
    simulé localement)
  - Testé : 2 clients connectés, relay de positions et chat vérifiés

### Reste à développer (feuille de route)
- PHASE 3+ : décoration libre (position des meubles), plus de types d'intérieurs
- PHASE 4+ : personnalisation esthétique des véhicules (couleurs), caméra intérieure, dommages par pièce
- PNJ : achats réels dans les commerces, réactions événementielles poussées, foules denses (InstancedMesh)
- Activités/mini-jeux : parachute, plongée, tennis, golf
- Histoire : cinématiques, plus de chapitres et de personnages
- Téléphone : réseaux sociaux dynamiques, galerie photo
- Audio : musiques/radio dans le jeu 3D, audio spatialisé
- Multijoueur : état persistant partagé, sync véhicules/missions, TLS (wss://)
- Optimisation : LOD, streaming de la carte, InstancedMesh pour bâtiments/PNJ

## Tests

Le fichier contient un mode d'auto-test (`__NOVA_TEST__`) qui simule le jeu en Node.js
avec Three.js — 89 vérifications couvrant toutes les phases : déplacements et
natation, véhicules (dont décollage/atterrissage d'avion, bateau, bus, carburant,
dommages visuels), intérieurs et immobilier, PNJ (emplois, planning, bus, dialogues,
relations), entreprises (achat, employés, stock, prix, amélioration, ventes
horaires, salaires), activités (pêche, muscu, course, basket), histoire complète
avec choix final, GPS/contacts/volume, météo (pluie/brouillard/adhérence), culling
des PNJ, qualité auto, succès, sauvegarde v2 avec migration v1, protocole réseau
client et assainissement du chat. Le serveur multijoueur est en plus testé
réellement avec deux clients WebSocket (voir server/README.md).

```bash
npm install three@0.160.0
# extraire le <script type="module"> dans nova.mjs puis :
__NOVA_TEST__=1 node runner.mjs
```
