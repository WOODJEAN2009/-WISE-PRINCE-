import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import {
  randomUUID,
  randomBytes
} from "crypto";

import path from "path";
import fs from "fs/promises";

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
    pairingCode: null
  };

  sessions.set(id, session);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      session.status = "connected";
      session.pairingCode = null;

      console.log(
        `WhatsApp connected: ${session.id}`
      );
    }

    if (connection === "close") {
      session.status = "disconnected";

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(
          `WhatsApp disconnected. Session: ${session.id}`
        );
      } else {
        console.log(
          `WhatsApp logged out. Session: ${session.id}`
        );
      }
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

  if (!session.phoneNumber) {
    throw new Error("Phone number missing");
  }

  const phoneNumber =
    String(session.phoneNumber).replace(/\D/g, "");

  if (!phoneNumber) {
    throw new Error("Invalid phone number");
  }

  try {
    const code =
      await session.sock.requestPairingCode(
        phoneNumber
      );

    session.pairingCode = code;
    session.status = "pairing";

    return code;
  } catch (error) {
    console.error(
      "Pairing code request error:",
      error
    );

    throw new Error(
      error?.message ||
      "Pairing code unavailable"
    );
  }
}

export function getSession(id, token) {
  const session = sessions.get(id);

  if (
    !session ||
    session.accessToken !== token
  ) {
    return null;
  }

  return session;
}

export async function disconnectSession(id, token) {
  const session =
    getSession(id, token);

  if (!session) {
    return false;
  }

  try {
    session.sock.end(undefined);
  } catch (error) {
    console.error(
      "Disconnect error:",
      error
    );
  }

  sessions.delete(id);

  return true;
}
