require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./db/connection');
const cors = require('cors');
const bodyParser = require('body-parser');

//les routes
const userRoutes = require('./db/routes/userRoutes');
const channelRoutes = require('./db/routes/channelRoutes');
const messageRoutes = require('./db/routes/messageRoutes');

// web socket
const socketHandlers = require('./socketHandlers');

const Channel = require('./db/models/channel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());


app.use((req, res, next) => {
  req.io = io;
  next();
});

// routes API
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);

// connexions WebSocket
io.on('connection', (socket) => {
  console.log(`Utilisateur connecté avec socket ID: ${socket.id}`);
  socketHandlers(io, socket);
});



const port = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    // verifie si général existe
    try {
      let generalChannel = await Channel.findOne({ name: 'Général' });
      if (!generalChannel) {

        // le créé si non
        generalChannel = await Channel.create({
          name: 'Général',
          description: 'Canal principal',
        });
        console.log('Le canal "Général" a été créé.');
      } else {
        console.log('Le canal "Général" existe déjà.');
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du canal "Général" :', err);
    }

    // verifie et Crée PM
    let pmChannel = await Channel.findOne({ name: 'PM' });
    if (!pmChannel) {
      pmChannel = await Channel.create({ name: 'PM' });
      console.log('Canal "PM" créé');
    }
    else {
      console.log('Le canal "PM" existe déjà.');
    }

    server.listen(port, () => {
      console.log(`Serveur WebSocket en ligne sur http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Impossible de se connecter à MongoDB :', err);
    process.exit(1);
  });

module.exports = app;