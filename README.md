# Lumio

Separate home-learning application. Lumio owns child profiles, login, UI and the server-side Harness client. WESA Harness owns model execution, Vertex RAG, collection policy, grounding and audit.

## Local setup

1. Copy `.env.example` to `.env`. Lumio generates its session secret in `.data/` automatically.
2. Generate one PIN hash: `pnpm hash-pin 1234`.
3. Put the result in `LUMIO_CHILD_PROFILES_JSON` and add one profile per child. In `.env`, escape each hash separator as `\$` because the hash contains dollar signs.
4. Set `HARNESS_BASE_URL` and the dedicated `HARNESS_LUMIO_TOKEN`.
5. Install dependencies with `pnpm install`.
6. Run `pnpm dev` or `docker compose up --build`.

The UI is reached from family devices at `http://<server-lan-ip>:3000`. Children never receive Harness or Vertex credentials.

## Current boundary

The upload/chat routes are wired to the planned Harness client API. Until the Harness upload and chat endpoints are implemented, those calls return a controlled gateway error. The profile/session boundary and UI are already separate from Harness.

## Production requirements

- Keep the generated `.data/session-secret` volume persistent; `LUMIO_SESSION_SECRET` is only an optional override.
- Use HTTPS/reverse proxy on the home network.
- Store profile hashes in a protected secret/config volume.
- Keep `HARNESS_LUMIO_TOKEN` server-side only.
- Configure the dedicated Vertex project/corpus and Harness ADC before enabling real uploads.
