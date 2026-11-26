// NOVA CITY — Serveur multijoueur (architecture réelle, non simulée)
// Rôle : relais autoritaire minimal — authentification par token, validation
// des positions (bornes + anti-spam), diffusion des états et du chat.
//
// Lancement :
//   cd server && npm install && NOVA_SECRET=un-secret PORT=7777 node server.mjs
// Jetons : créer server/tokens.json = { "NomJoueur": "token-secret-du-joueur" }
//          (si le fichier est absent, l'authentification par token est désactivée)

import { WebSocketServer } from 'ws';
import { createHash, randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const PORT = Number(process.env.PORT) || 7777;
const SECRET = process.env.NOVA_SECRET || 'nova-city-dev-secret';
const MAX_XZ = 400;          // bornes cohérentes avec le monde client
const MIN_STATE_MS = 40;     // anti-spam : max 25 états/s par joueur

let allowedTokens = null;
const tokensPath = fileURLToPath(new URL('./tokens.json', import.meta.url));
if (existsSync(tokensPath)) {
  allowedTokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
}

const wss = new WebSocketServer({ port: PORT });
const players = new Map();
const lastState = new Map();

const hash = s => createHash('sha256').update(String(s)).digest('hex');

function broadcast(obj, exceptId) {
  const s = JSON.stringify(obj);
  for (const [pid, p] of players) {
    if (pid !== exceptId && p.ws.readyState === 1) p.ws.send(s);
  }
}

wss.on('connection', ws => {
  let id = null;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;

    if (msg.t === 'join') {
      if (typeof msg.name !== 'string' || !msg.name.trim() || msg.name.length > 16) {
        ws.send(JSON.stringify({ t: 'error', msg: 'nom invalide' }));
        return ws.close();
      }
      const name = msg.name.trim();
      if (allowedTokens && allowedTokens[name] !== String(msg.token || '')) {
        ws.send(JSON.stringify({ t: 'error', msg: 'token invalide' }));
        return ws.close();
      }
      if ([...players.values()].some(p => p.name === name)) {
        ws.send(JSON.stringify({ t: 'error', msg: 'nom déjà pris' }));
        return ws.close();
      }
      id = randomUUID();
      players.set(id, { ws, name, x: 0, z: 0, ry: 0, veh: '' });
      ws.send(JSON.stringify({ t: 'welcome', id, proof: hash(name + SECRET).slice(0, 8) }));
      broadcast({
        t: 'players',
        list: [...players.values()].map(p => ({ id: p.id, name: p.name, x: p.x, z: p.z, ry: p.ry, veh: p.veh })),
      });
      return;
    }

    const p = id && players.get(id);
    if (!p) return;

    if (msg.t === 'state') {
      const now = Date.now();
      if (now - (lastState.get(id) || 0) < MIN_STATE_MS) return;
      lastState.set(id, now);
      if (!Number.isFinite(msg.x) || !Number.isFinite(msg.z)) return;
      p.x = Math.max(-MAX_XZ, Math.min(MAX_XZ, Number(msg.x)));
      p.z = Math.max(-MAX_XZ, Math.min(MAX_XZ, Number(msg.z)));
      p.ry = Number.isFinite(msg.ry) ? Number(msg.ry) : 0;
      p.veh = typeof msg.veh === 'string' ? msg.veh.slice(0, 12) : '';
      broadcast({ t: 'state', id, x: p.x, z: p.z, ry: p.ry, veh: p.veh }, id);
    } else if (msg.t === 'chat') {
      if (typeof msg.text !== 'string' || !msg.text.trim()) return;
      const text = msg.text.slice(0, 120).replace(/[<>]/g, '');
      broadcast({ t: 'chat', id, name: p.name, text });
    }
  });

  ws.on('close', () => {
    if (id && players.delete(id)) broadcast({ t: 'leave', id });
  });
});

console.log('NOVA CITY — serveur multijoueur sur le port ' + PORT +
  (allowedTokens ? ' (authentification par token activée)' : ' (sans token : ajoute tokens.json)'));
