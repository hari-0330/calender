import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Event from './models/Event.js';
import admin from './firebase.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Middleware to verify Firebase ID token
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const idToken = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get events for a user for a month/year
app.get('/api/events', authenticate, async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user.uid;
  const events = await Event.find({ userId, year, month });
  res.json(events);
});

// Add event for a user for a day
app.post('/api/events', authenticate, async (req, res) => {
  const { year, month, day, event } = req.body;
  const userId = req.user.uid;
  let doc = await Event.findOne({ userId, year, month, day });
  if (!doc) {
    doc = new Event({ userId, year, month, day, events: [event] });
  } else {
    doc.events.push(event);
  }
  await doc.save();
  res.json(doc);
});

// Replace all events for a user for a day (for edit/delete)
app.put('/api/events', authenticate, async (req, res) => {
  const { year, month, day, events: newEvents } = req.body;
  const userId = req.user.uid;
  let doc = await Event.findOne({ userId, year, month, day });
  if (!doc) {
    doc = new Event({ userId, year, month, day, events: newEvents });
  } else {
    doc.events = newEvents;
  }
  await doc.save();
  res.json(doc);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 