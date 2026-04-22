import express from "express";
import multer from 'multer';

//CONTROLLER IMPORTS
import { signIn, signUp } from "./controllers/authController.js";
import { aiFlashcardUploadLimit, createAiFlashcards, createAiFlashcardsStream } from './controllers/aiController.js';

import {
  createDeck,
  createCardset,
  deleteCardset,
  getPublicCardsets,
  getCardsetsByUserEmail,
  updateCardset,
  forkCardset,
} from './controllers/cardsetController.js';

import {
  createCourse,
  deleteCourse,
  getPublicCourses,
  getCoursesByUserId,
  updateCourse,
} from './controllers/courseController.js';

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
const PORT = Number.parseInt(process.env.PORT || '3001', 10);

app.use(express.json());

console.log(`[server] Starting Express app on port ${PORT}...`);

const authRouter = express.Router();
const aiRouter = express.Router();
const cardsetRouter = express.Router();
const courseRouter = express.Router();
const flashcardRouter = express.Router({ mergeParams: true });

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: aiFlashcardUploadLimit,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`))
    }
  },
});

//sets up routes for each controller

authRouter.post('/sign-up', signUp);
authRouter.post('/sign-in', signIn);
//auth functions

// For AI flashcard endpoint, support both JSON and multipart file uploads
aiRouter.post(
  '/flashcards',
  upload.single('file'),
  createAiFlashcards,
);

// For streaming progress updates during AI flashcard generation
aiRouter.post(
  '/flashcards-stream',
  upload.single('file'),
  createAiFlashcardsStream,
);

cardsetRouter.get('/user/:userId', getCardsetsByUserEmail);
cardsetRouter.get('/public', getPublicCardsets);
cardsetRouter.post('/decks', createDeck);
cardsetRouter.post('/', createCardset);
cardsetRouter.post('/:id/fork', forkCardset);
cardsetRouter.patch('/:id', updateCardset);
cardsetRouter.delete('/:id', deleteCardset);
cardsetRouter.use('/:cardsetId/flashcards', flashcardRouter);
//cardset functions

courseRouter.get('/user/:userId', getCoursesByUserId);
courseRouter.get('/public', getPublicCourses);
courseRouter.post('/', createCourse);
courseRouter.patch('/:id', updateCourse);
courseRouter.delete('/:id', deleteCourse);
//course functions

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
app.use('/api/courses', courseRouter);



app.get("/cardsets", (_, response) =>
  response.json({ info: "This endpoint will return all cardsets" })
);

app.get("/", (_, response) =>
  response.json({ info: "Express app with Supabase" })
);

const server = app.listen(PORT, () =>
  console.log(
    new Date().toLocaleTimeString() + `: Server is running on port ${PORT}...`
  )
);

server.on('error', (error) => {
  console.error('[server] Failed to start Express server:', error);
  process.exitCode = 1;
});
