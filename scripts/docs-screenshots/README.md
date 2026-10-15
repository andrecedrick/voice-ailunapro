# Docs screenshots — real Voice AiLunaPro app, synthetic data

Regenerates the app screenshots in `docs/images/` after an upstream upgrade. OURS — see BRAND.md §7.
Never point these scripts at production: they run against a local stack with a throw-away database.

1. Local stack (all on 127.0.0.1): Postgres + pgvector on :5433 (`pip install pgserver`, run its binaries as a non-root user),
   Redis on :6380, API on :8100 (`BACKEND_API_ENDPOINT=https://voice-api.ailunapro.com`, `UI_APP_URL=https://voice.ailunapro.com`,
   `DEPLOYMENT_MODE=oss`, `AUTH_PROVIDER=local`), `alembic -c api/alembic.ini upgrade head`.
2. UI: `next build && next start -p 3400` with `BACKEND_URL=NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8100`.
3. Work dir `$S` (any scratch folder) with `demo-account.txt` (email=… / password=… — generate a random test password)
   and `signup.json` (response of `POST /api/v1/auth/signup`). Fonts: `npm i @fontsource-variable/{inter,sora,geist,geist-mono}` in `$S/fonts`.
4. `python seed.py $S && python seed2.py $S && python relayout.py $S` — demo agents, tools, API keys, integrations.
   Provider connections, telephony configs and the completed run are inserted with SQL (validation calls the vendors).
5. `S=$S node login.cjs`, then `S=$S node shoot-all.cjs [file.png …]` and `S=$S node shoot-widget.cjs`
   (serve `demo-site/` on :3500 with the embed token in place of EMBED_TOKEN).
6. `python sheet.py out.png shots/*.png` builds a contact sheet to review everything at once; copy the results to `docs/images/`.
