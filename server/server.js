import express from "express";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, response) =>
  response.json({ info: "Express app with Supabase" })
);

app.listen(PORT, () =>
  console.log(
    new Date().toLocaleTimeString() + `: Server is running on port ${3000}...`
  )
);
