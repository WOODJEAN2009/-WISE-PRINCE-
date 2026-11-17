import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import QRCode from "qrcode";
import crypto from "crypto";
import fs from "fs";

const sessions = new Map();

export async function createSession(phoneNumber) {
  const sessionId = crypto.randomUUID();
  const folder = `sessions/${sessionId}`;

  fs.mkdirSync(folder, { recursive: true });

  const { state, saveCreds } =
    await useMultiFileAuthState(folder);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sessions.set(sessionId, {
    sock,
    status: "connecting",
    qr: null,
    pairingCode: null
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    if (update.qr) {
      session.qr = await QRCode.toDataURL(update.qr);
    }

    if (update.connection === "open") {
      session.status = "online";
    }

    if (update.connection === "close") {
      session.status = "offline";
    }
  });

  return {
    sessionId,
    status: "connecting"
  };
}

export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
    }
