import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

import {
  randomUUID,
  randomBytes
} from "crypto";

import path from "path";
import QRCode from "qrcode";

const sessions = new Map();

export async function createSession(phoneNumber) {
  const id = randomUUID();
  const accessToken = randomBytes(32).toString("hex");

  const authFolder = path.join(
    process.cwd(),
    "sessions",
    id
  );

  await fs.mkdir(authFolder, { recursive: true });

  const { state, saveCreds } =
    await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  const session = {
    id,
    sock,
    state,
    phoneNumber,
    accessToken,
    status: "connecting",
    qr: null,
    pairingCode: null
  };

  sessions.set(id, session);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    if (update.qr) {
      session.qr = await QRCode.toDataURL(update.qr);
      session.status = "qr";
    }

    if (update.connection === "open") {
      session.status = "connected";
      session.qr = null;
      session.pairingCode = null;
    }

    if (update.connection === "close") {
      session.status = "disconnected";
    }
  });

  return {
    id,
    accessToken,
    status: session.status
  };
}

export async function requestPairingCode(id, token) {
  const session = sessions.get(id);

  if (!session || session.accessToken !== token) {
    throw new Error("Unauthorized");
  }

  if (session.state.creds.registered) {
    throw new Error("WhatsApp already registered");
  }

  const code = await session.sock.requestPairingCode(
    session.phoneNumber
  );

  session.pairingCode = code;

  return code;
}

export function getSession(id, token) {
  const session = sessions.get(id);

  if (!session || session.accessToken !== token) {
    return null;
  }

  return session;
}

export async function disconnectSession(id, token) {
  const session = getSession(id, token);

  if (!session) {
    return false;
  }

  session.sock.end(undefined);
  sessions.delete(id);

  return true;
}
