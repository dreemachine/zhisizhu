// Minimal fan-out relay for the yue-qin "live" feature: every message a
// connected client sends gets validated and forwarded to every OTHER
// connected client. The actual note logic (what a message means, how to
// replay it) lives entirely in core.js and the instrument modules on both
// ends; this server intentionally keeps no musical or session state.
//
// Meant to run only while actually playing (e.g. during a D&D session),
// not as an always-on service — start it, tunnel it out (ngrok or
// similar), share the resulting wss:// URL, stop it when done.
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8765;
const MAX_MESSAGE_BYTES = 64 * 1024;
const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_MESSAGE_BYTES });

wss.on('connection', (ws) => {
  // Protocol violations such as a frame larger than maxPayload are reported
  // as connection-level errors by ws. The peer is already closed; consuming
  // the event here prevents one malformed client from terminating the relay.
  ws.on('error', () => {});

  // ws always hands the callback a Buffer regardless of the original frame
  // type — forwarding it bare defaults to a binary frame, which browsers
  // deliver as a Blob instead of the JSON string the browser client expects.
  ws.on('message', (data, isBinary) => {
    // The browser protocol is JSON text. Dropping other traffic keeps an
    // accidentally exposed tunnel from becoming a general-purpose binary
    // fan-out endpoint; maxPayload above also bounds memory per message.
    if (isBinary) return;
    try {
      const message = JSON.parse(data.toString());
      if (!message || typeof message.senderId !== 'string' || (!message.meta && typeof message.instrument !== 'string')) return;
    } catch {
      return;
    }
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(data, { binary: false });
      }
    }
  });
});

console.log(`yue-qin relay listening on ws://localhost:${PORT}`);
