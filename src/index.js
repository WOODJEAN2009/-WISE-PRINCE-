import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createSession, getSession } from "./sessionManager.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/status", (req, res) => {
  res.json({
    name: "WISE PRINCE",
    status: "online"
  });
});

app.post("/api/session/create", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: "Phone number required"
      });
    }

    const session = await createSession(phoneNumber);

    res.json(session);
  } catch (error) {
    res.status(500).json({
      error: "Session creation failed"
    });
  }
});

app.get("/api/session/:id", (req, res) => {
  const session = getSession(req.params.id);

  if (!session) {
    return res.status(404).json({
      error: "Session not found"
    });
  }

  res.json({
    status: session.status,
    qr: session.qr
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WISE PRINCE running on port ${PORT}`);
});
