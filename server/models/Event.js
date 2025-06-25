import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  year: Number,
  month: Number,
  day: Number,
  events: [String]
});

export default mongoose.model('Event', eventSchema); 