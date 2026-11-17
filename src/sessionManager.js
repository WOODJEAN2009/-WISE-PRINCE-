import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import QRCode from "qrcode";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const sessions = new Map();

export async function createSession(phoneNumber) {
  const sessionId = crypto.randomUUID();
  const accessToken = crypto.randomBytes(32).toString("hex");

  const folder = path.join("sessions", sessionId);

  fs.mkdirSync(folder, { recursive: true });

  const { state, saveCreds } =
    await useMultiFileAuthState(folder);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["WISE PRINCE", "Chrome", "1.0.0"]
  });

  const session = {
    sock,
    phoneNumber,
    status: "connecting",
    qr: null,
    pairingCode: null,
    accessToken
  };

  sessions.set(sessionId, session);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    if (update.qr) {
      session.qr = await QRCode.toDataURL(update.qr);
    }

    if (update.connection === "open") {
      session.status = "online";
      session.qr = null;
      session.pairingCode = null;
    }

    if (update.connection === "close") {
      session.status = "offline";
    }
  });

  return {
    sessionId,
    accessToken,
    status: session.status
  };
}

export async function requestPairingCode(sessionId, accessToken) {
  const session = getSession(sessionId, accessToken);

  if (!session) {
    throw new Error("Unauthorized session");
  }

  if (session.sock.authState.creds.registered) {
    throw new Error("WhatsApp already connected");
  }

  const code = await session.sock.requestPairingCode(
    session.phoneNumber
  );

  session.pairingCode = code;

  return code;
}

export function getSession(sessionId, accessToken) {
  const session = sessions.get(sessionId);

  if (!session || session.accessToken !== accessToken) {
    return null;
  }

  return session;
}

export async function disconnectSession(sessionId, accessToken) {
  const session = getSession(sessionId, accessToken);

  if (!session) return false;

  session.sock.end(undefined);
  sessions.delete(sessionId);

  return true;
}
