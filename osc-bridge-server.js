/**
 * WebSocket → OSC Bridge Server
 * Receives weight/MIDI data from the browser via WebSocket,
 * forwards as OSC UDP packets to Ableton Live.
 *
 * Requirements:
 *   npm install ws osc
 *
 * Usage:
 *   node osc-bridge-server.js
 *
 * Configure Ableton:
 *   - Install AbletonOSC (https://github.com/ideoforms/AbletonOSC)
 *     OR use a Max4Live OSC device listening on port 9000
 */

const { WebSocketServer } = require("ws");
const osc = require("osc");

// ── Configuration ─────────────────────────────────────────────
const WS_PORT = 8080;           // Browser connects here
const OSC_HOST = "127.0.0.1";  // Ableton host (change if remote)
const OSC_PORT = 9000;          // AbletonOSC default port
// ──────────────────────────────────────────────────────────────

// UDP OSC port (outbound to Ableton)
const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  remoteAddress: OSC_HOST,
  remotePort: OSC_PORT,
  metadata: true,
});

udpPort.open();
udpPort.on("ready", () => {
  console.log(`✅ OSC UDP ready → ${OSC_HOST}:${OSC_PORT}`);
});
udpPort.on("error", (err) => {
  console.error("OSC error:", err.message);
});

// WebSocket server (browser connects here)
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`🌐 WebSocket bridge listening on ws://localhost:${WS_PORT}`);

wss.on("connection", (ws, req) => {
  console.log(`🔗 Browser connected from ${req.socket.remoteAddress}`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);

      // Expected message shape:
      // { type: "osc", address: "/live/...", args: [...] }
      if (msg.type === "osc") {
        const oscMsg = {
          address: msg.address,
          args: msg.args.map((a) => {
            // Support typed args: { type: "f", value: 0.5 }
            // or plain numbers/strings
            if (typeof a === "object" && a.type) return a;
            if (typeof a === "number")
              return { type: Number.isInteger(a) ? "i" : "f", value: a };
            if (typeof a === "string") return { type: "s", value: a };
            return { type: "i", value: Number(a) };
          }),
        };

        udpPort.send(oscMsg, OSC_HOST, OSC_PORT);
        console.log(`→ OSC ${oscMsg.address}`, oscMsg.args.map((a) => a.value));
      }

      // Ping/pong keepalive
      if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
    } catch (e) {
      console.warn("Bad message:", e.message);
    }
  });

  ws.on("close", () => console.log("🔌 Browser disconnected"));
  ws.send(JSON.stringify({ type: "connected", oscTarget: `${OSC_HOST}:${OSC_PORT}` }));
});
