import express from "express";
import dotenv from 'dotenv';
import { signUp } from "./controllers/authController.js";


// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const authRouter = express.Router();
authRouter.post('/sign-up', signUp);

app.use('/api/auth', authRouter);

app.get("/", (_, response) =>
  response.json({ info: "Express app with Supabase" })
);

app.listen(PORT, () =>
  console.log(
    new Date().toLocaleTimeString() + `: Server is running on port ${3000}...`
  )
);
