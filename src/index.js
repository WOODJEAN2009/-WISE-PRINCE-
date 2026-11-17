import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    name: "WISE PRINCE ✝️",
    status: "online"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WISE PRINCE running on port ${PORT}`);
});
