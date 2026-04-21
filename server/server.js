import express from "express";

//CONTROLLER IMPORTS
import { signIn, signUp } from "./controllers/authController.js";
import { aiFlashcardUploadLimit, createAiFlashcards } from './controllers/aiController.js';

import {
  createDeck,
  createCardset,
  deleteCardset,
  getCardsetsByUserEmail,
  updateCardset,
} from './controllers/cardsetController.js';

import {
  bulkCreateFlashcards,
  createFlashcard,
  deleteFlashcard,
  getFlashcard,
  listFlashcards,
  updateFlashcardStatus,
  updateFlashcard,
} from './controllers/flashcardController.js';


const app = express();
const PORT = 3000;

app.use(express.json());

const authRouter = express.Router();
const aiRouter = express.Router();
const cardsetRouter = express.Router();
const flashcardRouter = express.Router({ mergeParams: true });
//sets up routes for each controller

authRouter.post('/sign-up', signUp);
authRouter.post('/sign-in', signIn);
//auth functions

aiRouter.post(
  '/flashcards',
  express.raw({ type: 'application/octet-stream', limit: aiFlashcardUploadLimit }),
  createAiFlashcards,
);

cardsetRouter.get('/user/:userId', getCardsetsByUserEmail);
cardsetRouter.post('/decks', createDeck);
cardsetRouter.post('/', createCardset);
cardsetRouter.patch('/:id', updateCardset);
cardsetRouter.delete('/:id', deleteCardset);
cardsetRouter.use('/:cardsetId/flashcards', flashcardRouter);
//cardset functions

flashcardRouter.get('/', listFlashcards);
flashcardRouter.post('/', createFlashcard);
flashcardRouter.post('/bulk', bulkCreateFlashcards);
flashcardRouter.get('/:flashcardId', getFlashcard);
flashcardRouter.patch('/:flashcardId', updateFlashcard);
flashcardRouter.patch('/:flashcardId/status', updateFlashcardStatus);
flashcardRouter.delete('/:flashcardId', deleteFlashcard);
//flashcard functions

app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/cardsets', cardsetRouter);



app.get("/cardsets", (_, response) =>
  response.json({ info: "This endpoint will return all cardsets" })
);

app.get("/", (_, response) =>
  response.json({ info: "Express app with Supabase" })
);

app.listen(PORT, () =>
  console.log(
    new Date().toLocaleTimeString() + `: Server is running on port ${3000}...`
  )
);
