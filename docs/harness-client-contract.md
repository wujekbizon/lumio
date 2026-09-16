# Lumio → Harness client contract

Lumio calls Harness server-side with `X-Wesa-Capability-Token`. The browser never receives this token.

## Health

`GET /api/client/v1/lumio/health`

Returns `{ status, client, protocolVersion }`.

## Upload

`POST /api/client/v1/lumio/libraries/{libraryId}/sources`

Multipart field `file`, optional `displayName`. Harness resolves the child from `X-Lumio-Child-Id`, validates the library mapping and submits the source to Vertex RAG. Expected response is `202` with `{ jobId, status, sourceId }`.

## Chat

`POST /api/client/v1/lumio/chat`

JSON body `{ question, libraryId }`. Harness resolves the shared corpus plus the authorized child library, retrieves grounded context, calls the selected Ollama provider and returns `{ answer, grounding, citations, provider, model }`.

No generic `/api/tasks` endpoint is used by Lumio.
