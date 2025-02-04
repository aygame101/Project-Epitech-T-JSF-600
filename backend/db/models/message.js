const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // les messages généraux
  userId: { type: String },
  username: { type: String },
  channel: { type: String },

  // les PM
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPrivate: { type: Boolean, default: false },

  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
