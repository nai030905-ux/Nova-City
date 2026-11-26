# NOVA CITY — Serveur multijoueur

Architecture réelle (pas de simulation locale) : WebSocket + Node.js.
Le serveur est un relais autoritaire minimal : authentification par token,
validation des positions (bornes + anti-spam 25 msg/s), assainissement du chat,
diffusion des états à 10 Hz côté client.

## Lancer le serveur

```bash
cd server
npm install
PORT=7777 NOVA_SECRET=change-moi node server.mjs
```

## Sécurité

- **Tokens** : créez `server/tokens.json` :
  `{ "Alice": "token-secret-alice", "Bob": "..." }`
  Dès que ce fichier existe, seuls les noms+tokens listés peuvent rejoindre.
- **Anti-spam** : max 25 messages d'état/s par client (les excès sont ignorés).
- **Validation** : positions bornées au monde (±400), types vérifiés, chat
  tronqué à 120 caractères et `<`/`>` retirés (anti-injection HTML).
- **Noms uniques** : deux clients ne peuvent pas utiliser le même nom.

## Côté jeu

Dans le jeu : téléphone (Tab) → Réglages → Multijoueur →
saisir `ws://<adresse-serveur>:7777` → Se connecter.
Les autres joueurs apparaissent comme avatars bleus ; le chat s'affiche en toast.

## Test automatique (2 clients simulés côté protocole)

```bash
PORT=7877 node server.mjs &
node mp_test.mjs   # welcome + liste + relay d'état + chat assaini → MP_EXIT=0
```

## Limites honnêtes

- Économie/missions restent locales par joueur (pas d'état partagé persistant).
- Pas d'interpolation réseau avancée (téléportation douce à 10 Hz, suffisant en LAN).
- Pas de TLS : placez un reverse-proxy wss:// devant pour l'internet public.
