import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  createSession,
  getSession,
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

app.post("/api/session/create", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (
      typeof phoneNumber !== "string" ||
      !/^\d{8,15}$/.test(phoneNumber)
    ) {
      return res.status(400).json({
        error: "Enter a valid number with country code, digits only."
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

app.get("/api/session/:id", (req, res) => {
  const token = req.get("X-Session-Token");
  const session = getSession(req.params.id, token);

  if (!session) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  res.json({
    status: session.status,
    qr: session.qr
  });
});

app.post("/api/session/:id/disconnect", async (req, res) => {
  const token = req.get("X-Session-Token");

  try {
    const disconnected = await disconnectSession(
      req.params.id,
      token
    );

    if (!disconnected) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    res.json({ status: "disconnected" });
  } catch (error) {
    res.status(500).json({
      error: "Disconnect failed"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WISE PRINCE running on port ${PORT}`);
});
