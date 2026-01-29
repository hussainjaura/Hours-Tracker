// src/index.js
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
