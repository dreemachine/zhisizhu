# Zhisizhu live relay

A small WebSocket fan-out service for live ensemble sessions. Browsers send compact JSON note events; the relay forwards each valid event to every other connected browser. Audio is synthesized or sampled locally by each client—no audio stream passes through the server.

The relay has no accounts, persistence, rooms, or musical logic. It is designed to run only during an active session.

## Run locally

```powershell
cd relay
npm install     # first run only
npm start
```

The default endpoint is `ws://localhost:8765`. Set the `PORT` environment variable to choose another port.

## Expose it for a session

The local endpoint is not internet-accessible. One option is an ngrok tunnel:

1. Install ngrok, create an account, and configure its authentication token.
2. Reserve a static domain if you want the same URL each session.
3. Start the relay.
4. Start the tunnel, for example:

   ```powershell
   ngrok http 8765 --domain=dree-yueqin.ngrok-free.app
   ```

5. Enter the resulting `wss://` URL in every player's relay field and press **connect**.
6. Open the relay log on both sides when diagnosing send/receive behavior.
7. Stop both ngrok and the relay when the session ends.

Treat the tunnel URL as session access: the relay does not authenticate users. Do not leave it running as a general public service.

## Accepted messages

The server accepts JSON text messages up to 64 KiB. A message must contain:

- A string `senderId`.
- Either a string `instrument` for musical events or `meta` for side-channel events such as presence.

Malformed JSON, binary frames, and invalid envelopes are dropped. Valid messages are still forwarded verbatim; interpretation remains entirely client-side.

See [`../docs/maintenance.md`](../docs/maintenance.md) for current fretted, pad, yueqin-articulation, presence, and loop-playback payloads.

## Shared loops

In local scope, loop playback never reaches the relay. In shared scope, the loop owner sends replay events with `loopPlayback: true`. Receiving clients play those events but do not capture them into another recording pass, preventing recursive feedback.

## Operational limits

- No authentication or authorization.
- No encrypted transport by itself; internet sessions rely on the tunnel's `wss://` endpoint.
- No server-side clock synchronization or jitter buffer.
- No persistent roster or musical state.
- One process is effectively one shared session; everyone connected receives every valid event.

These constraints are intentional for the current start-play-stop workflow.
