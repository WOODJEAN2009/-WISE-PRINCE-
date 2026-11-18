import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  createSession,
  getSession,
  requestPairingCode,
  disconnectSession
} from "./sessionManager.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "../public")));

// STATUS
app.get("/api/status", (req, res) => {
  res.json({
    name: "WISE PRINCE ✝️",
    status: "online"
  });
});

// CREATE SESSION
app.post("/api/session/create", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (
      typeof phoneNumber !== "string" ||
      !/^\d{8,15}$/.test(phoneNumber)
    ) {
      return res.status(400).json({
        error: "Invalid phone number"
      });
    }

    const session = await createSession(phoneNumber);

    return res.status(201).json(session);
  } catch (error) {
    console.error("Create session error:", error);

    return res.status(500).json({
      error: "Session creation failed"
    });
  }
});

// PAIRING CODE
app.post("/api/session/:id/pairing", async (req, res) => {
  try {
    const token = req.get("X-Session-Token");

    if (!token) {
      return res.status(401).json({
        error: "Missing session token"
      });
    }

    const code = await requestPairingCode(
      req.params.id,
      token
    );

    return res.json({
      pairingCode: code
    });
  } catch (error) {
    console.error("Pairing code error:", error);

    return res.status(500).json({
      error: error.message || "Pairing code unavailable"
    });
  }
});

// GET SESSION
app.get("/api/session/:id", (req, res) => {
  try {
    const token = req.get("X-Session-Token");

    const session = getSession(
      req.params.id,
      token
    );

    if (!session) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    return res.json({
      status: session.status,
      qr: session.qr,
      pairingCode: session.pairingCode
    });
  } catch (error) {
    console.error("Session status error:", error);

    return res.status(500).json({
      error: "Could not get session"
    });
  }
});

// DISCONNECT
app.post("/api/session/:id/disconnect", async (req, res) => {
  try {
    const token = req.get("X-Session-Token");

    const result = await disconnectSession(
      req.params.id,
      token
    );

    if (!result) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    return res.json({
      status: "disconnected"
    });
  } catch (error) {
    console.error("Disconnect error:", error);

    return res.status(500).json({
      error: "Disconnect failed"
    });
  }
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `WISE PRINCE running on port ${PORT}`
  );
});
