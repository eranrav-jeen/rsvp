# Jeen.ai Case Assistant (demo)

Clickable, front-end-only mockup of an AI-assisted caseworker workstation for a
spousal residency application. Vite + React 18 + TypeScript, hash routing, no
backend. All names, numbers and documents are fictional.

Screens: `#/intake` → `#/file` → `#/interview` → `#/decision`. State is in memory
(`src/store.tsx`); "Reset demo" in the sidebar footer restores it.

## Develop

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Deploy (Ubuntu + nginx)

First time, from this folder on the server:

```bash
./deploy/setup-server.sh demo.example.com          # or no argument for any host ("_")
```

Flags: `--no-auth` to skip basic auth (default: on, user `demo`, you're prompted
for the password), `--https` to run certbot (needs DNS pointing at the server).

Redeploy after changes: `./deploy.sh`. Files are served from
`/var/www/case-assistant`; nginx site is `/etc/nginx/sites-available/case-assistant`.

**Shared server note:** if this server already hosts another site on port 80
(e.g. the jeen-event app), give the demo its own (sub)domain rather than `_`,
so the two `server` blocks don't compete.
