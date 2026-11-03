import dgram from "node:dgram";
import type { Express } from "express";

const DEFAULT_NTP_SERVER = "time.cloudflare.com";
const NTP_PORT = 123;
const NTP_PACKET_SIZE = 48;
const NTP_EPOCH_OFFSET = 2208988800;

function validHostname(value: string) {
  return /^(?=.{1,253}$)(?!localhost$)(?!.*\.local$)(?!127(?:\.\d{1,3}){3}$)(?!10(?:\.\d{1,3}){3}$)(?!192\.168(?:\.\d{1,3}){2}$)(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(value);
}

export function queryNtpTime(serverName = DEFAULT_NTP_SERVER, timeoutMs = 1800): Promise<{ server: string; now: number; offset: number }> {
  const server = String(serverName || DEFAULT_NTP_SERVER).trim().toLowerCase();
  if (!validHostname(server)) return Promise.reject(new Error("Invalid NTP server hostname"));
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const startedAt = Date.now();
    const packet = Buffer.alloc(NTP_PACKET_SIZE);
    packet[0] = 0x1b;
    const finish = (error?: Error, result?: { server: string; now: number; offset: number }) => {
      clearTimeout(timer);
      socket.close();
      error ? reject(error) : resolve(result!);
    };
    const timer = setTimeout(() => finish(new Error("NTP request timed out")), timeoutMs);
    socket.once("error", (error) => finish(error));
    socket.once("message", (message) => {
      if (message.length < NTP_PACKET_SIZE) return finish(new Error("Invalid NTP response"));
      const seconds = message.readUInt32BE(40);
      const fraction = message.readUInt32BE(44);
      const remoteMs = (seconds - NTP_EPOCH_OFFSET) * 1000 + Math.round((fraction / 0x100000000) * 1000);
      const receivedAt = Date.now();
      const estimatedNow = remoteMs + Math.round((receivedAt - startedAt) / 2);
      finish(undefined, { server, now: estimatedNow, offset: estimatedNow - receivedAt });
    });
    socket.send(packet, 0, packet.length, NTP_PORT, server);
  });
}

export function registerTimeSyncRoutes(app: Express) {
  app.get("/api/time/now", async (req, res) => {
    const requested = typeof req.query.server === "string" ? req.query.server : DEFAULT_NTP_SERVER;
    try {
      const result = await queryNtpTime(requested);
      res.setHeader("Cache-Control", "no-store");
      res.json({ ok: true, ...result, source: "ntp" });
    } catch (error) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ ok: false, server: requested, now: Date.now(), offset: 0, source: "local", error: error instanceof Error ? error.message : "NTP unavailable" });
    }
  });
}
