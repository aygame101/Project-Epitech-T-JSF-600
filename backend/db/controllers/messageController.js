const Message = require('../models/message');

exports.createMessage = async (req, res) => {
  const { senderId, username, content, channel } = req.body;

  if (!senderId || !content || !channel) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  try {
    const newMessage = new Message({ senderId, username, content, channel });
    const savedMessage = await newMessage.save();

    req.io.emit("message", savedMessage);
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du message:", error);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du message." });
  }
};

exports.getMessagesByChannel = async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.channelId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des messages." });
  }
};

exports.sendPrivateMessage = async (req, res) => {
  const { senderId, receiverId, username, content } = req.body;

  if (!senderId || !receiverId || !content) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  try {
    const newMessage = new Message({
      senderId,
      receiverId,
      username,
      content,
      isPrivate: true,
    });

    const savedMessage = await newMessage.save();
    req.io.emit("privateMessage", savedMessage);
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'envoi du message privé." });
  }
};

exports.getPrivateMessages = async (req, res) => {
  try {
    const { userId } = req.query;
    const privateMsgs = await Message.find({
      isPrivate: true,
      channel: "PM",
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
      .populate('sender', 'username')
      .populate('receiver', 'username');

    res.status(200).json(privateMsgs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
