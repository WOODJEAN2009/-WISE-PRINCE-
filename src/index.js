import express from "express";
import path from "path";
import { fileURLToPath } from "url";

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WISE PRINCE running on port ${PORT}`);
});
