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

    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Session creation failed"
    });
  }
});

// REQUEST PAIRING CODE
app.post("/api/session/:id/pairing", async (req, res) => {
  try {
    const token = req.get("X-Session-Token");

    const session = getSession(req.params.id, token);

    if (!session) {
      return res.status(401
