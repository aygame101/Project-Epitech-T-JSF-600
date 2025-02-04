const User = require('./db/models/user');
const Message = require('./db/models/message');

module.exports = (io, socket) => {
  socket.on("userConnected", async (data) => {
    const { userId, username } = data;

    if (!userId) return console.error("userId manquant lors de la connexion");

    try {
      let user = await User.findById(userId);
      if (user) {
        user.socketId = socket.id;
        await user.save();
        console.log(`Utilisateur ${user.username} connecté avec socket ${socket.id}`);
      } else {
        console.error("Utilisateur non trouvé lors de la connexion.");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du socketId:", error);
    }
  });

  // message enregistre
  socket.on("sendMessage", async (messageData) => {
    try {
      const newMessage = new Message({
        userId: messageData.userId,
        username: messageData.username,
        channel: messageData.channel,
        content: messageData.content
      });

      const savedMessage = await newMessage.save();

      io.to(messageData.channel).emit("newMessage", {
        _id: savedMessage._id,
        username: savedMessage.username,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt
      });

    } catch (error) {
      console.error("Erreur:", error);
    }
  });

  // Notif
  socket.on("joinChannel", ({ channel, user }) => {
    socket.join(channel);
    console.log(`Utilisateur ${user} rejoint le canal ${channel}`);

    if (channel !== 'PM') {
      socket.to(channel).emit("userJoined", { user, channel });
    }
  });

  socket.on("leaveChannel", ({ channel, user }) => {
    socket.leave(channel);
    console.log(`Utilisateur ${user} quitte le canal ${channel}`);

    if (channel !== 'PM') {
      socket.to(channel).emit("userLeft", { user, channel });
    }
  });


  // messages privés
  socket.on("privateMessage", async ({ senderId, receiver, content }) => {
    try {
      const [sender, receiverUser] = await Promise.all([
        User.findById(senderId),
        User.findOne({ username: receiver })
      ]);

      if (!sender || !receiverUser) {
        return socket.emit("systemMessage", { text: "Expéditeur ou destinataire introuvable" });
      }

      const msg = new Message({
        sender: sender._id,
        receiver: receiverUser._id,
        content,
        isPrivate: true,

        channel: "PM",
      });

      await msg.save();

      if (receiverUser.socketId) {
        io.to(receiverUser.socketId).emit("privateMessage", {
          from: sender.username,
          content
        });
      }

      if (sender.socketId) {
        io.to(sender.socketId).emit("privateMessageSent", {
          to: receiver,
          content
        });
      }
    } catch (err) {
      console.error("Erreur de message privé:", err);
    }
  });


  //déconnexion
  socket.on("disconnect", async () => {
    try {
      const user = await User.findOne({ socketId: socket.id });
      if (user) {
        user.socketId = null;
        await user.save();
        console.log(`Utilisateur ${user.username} déconnecté.`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du socketId:", error);
    }
  });
};
