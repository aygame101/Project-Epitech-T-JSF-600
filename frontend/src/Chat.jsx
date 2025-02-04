import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import './Chat.css';

const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
});

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState(["Général"]);
  const [currentChannel, setCurrentChannel] = useState("Général");
  const [username, setUsername] = useState(localStorage.getItem("username") || "Invité");
  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    socket.connect();

    socket.emit("userConnected", { userId, username });

    socket.on("newMessage", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    socket.on("systemMessage", (msg) => {
      setMessages((prev) => [...prev, { username: "Système", content: msg.text }]);
    });

    // notifs
    socket.on("userJoined", ({ user, channel }) => {
      setMessages((prev) => [
        ...prev,
        {
          username: "Système",
          content: `${user} a rejoint le canal #${channel}`,
        },
      ]);
    });

    socket.on("userLeft", ({ user, channel }) => {
      setMessages((prev) => [
        ...prev,
        {
          username: "Système",
          content: `${user} a quitté le canal #${channel}`,
        },
      ]);
    });

    // messages privés
    socket.on("privateMessage", ({ from, content }) => {
      setMessages((prev) => [
        ...prev,
        {
          username: from,
          content: `[Privé] ${content}`,
          isPrivate: true,
        },
      ]);
    });
    socket.on("privateMessageSent", ({ to, content }) => {
      setMessages((prev) => [
        ...prev,
        {
          username: "Système",
          content: `Message envoyé à ${to}: ${content}`,
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socket.off("newMessage");
      socket.off("systemMessage");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("privateMessage");
      socket.off("privateMessageSent");
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentChannel) return;

    socket.emit("joinChannel", { channel: currentChannel, user: username });

    return () => {
      socket.emit("leaveChannel", { channel: currentChannel, user: username });
    };
  }, [currentChannel, userId]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${userId}`);
        setUsername(res.data.username);
        setChannels(res.data.channels);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [userId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (currentChannel === "PM") {
        const res = await axios.get(`http://localhost:5000/api/messages/pm?userId=${userId}`);
        setMessages(res.data);
      } else {
        const res = await axios.get(`http://localhost:5000/api/messages/channel/${currentChannel}`);
        setMessages(res.data);
      }
    };
    loadMessages();
  }, [currentChannel, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (message.startsWith("/")) {
      handleCommand(message);
    } else {
      const messageData = {
        userId,
        channel: currentChannel,
        content: message,
        username,
      };
      socket.emit("sendMessage", messageData);
    }
    setMessage("");
  };

  const handleCommand = async (command) => {
    const args = command.split(" ");
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case "/cmd":
        setMessages((prev) => [
          ...prev,
          {
            username: "Système",
            content:
              "Commandes disponibles:\n"
          },
          {
            username: "",
            content:
              "/cmd - Affiche ce message\n"
          },
          {
            username: "",
            content:
              "/users - Liste les utilisateurs\n"
          },
          {
            username: "",
            content:
              "/nick [pseudo] - Change votre pseudo\n"
          },
          {
            username: "",
            content:
              "/msg [pseudo] [message] - Message privé\n"
          },
          {
            username: "",
            content:
              "/list [filtre] - Liste les canaux\n"
          },
          {
            username: "",
            content:
              "/create [canal] - Crée un canal\n"
          },
          {
            username: "",
            content:
              "/delete [canal] - Supprime un canal\n"
          },
          {
            username: "",
            content:
              "/join [canal1],[canal2]... - Rejoint des canaux\n"
          },
          {
            username: "",
            content:
              "/quit [canal1],[canal2]... - Quitter des canaux",
          },
        ]);
        break;

      case "/users":
        try {
          const response = await axios.get(
            `http://localhost:5000/api/channels/${currentChannel}/members`
          );
          const userList = response.data.join(", ");
          setMessages((prev) => [
            ...prev,
            {
              username: "Système",
              content: `Utilisateurs dans #${currentChannel} : ${userList}`,
            },
          ]);
        } catch (error) {
          console.error(error);
          setMessages((prev) => [
            ...prev,
            {
              username: "Système",
              content: "Erreur lors de la récupération des membres.",
            },
          ]);
        }
        break;

      case "/nick":
        if (args[1]) {
          const newUsername = args[1];
          try {
            await axios.put(`http://localhost:5000/api/users/${userId}`, {
              username: newUsername,
            });
            setUsername(newUsername);
            localStorage.setItem("username", newUsername);

            socket.emit("updateUsername", { userId, newUsername });
            setMessages((prev) => [
              ...prev,
              {
                username: "Système",
                content: `Pseudo changé en : ${newUsername}`,
              },
            ]);
          } catch (error) {
            setMessages((prev) => [
              ...prev,
              {
                username: "Système",
                content: "Erreur : Ce pseudo est déjà utilisé",
              },
            ]);
          }
        }
        break;

      case "/msg":
        if (args.length < 3) {
          setMessages(prev => [...prev, {
            username: "Système",
            content: "Format: /msg [pseudo] [message]"
          }]);
          return;
        }
        const receiver = args[1];
        const privateMsg = args.slice(2).join(" ");

        setCurrentChannel("PM");

        socket.emit("privateMessage", {
          senderId: userId,
          receiver,
          content: privateMsg
        });
        break;


      case "/list":
        try {
          const filter = args[1] || "";
          const response = await axios.get(
            `http://localhost:5000/api/channels?filter=${filter}`
          );
          const channelList =
            response.data.length > 0
              ? `Canaux disponibles:\n${response.data.join(", ")}`
              : "Aucun canal trouvé";
          setMessages((prev) => [
            ...prev,
            { username: "Système", content: channelList },
          ]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              username: "Système",
              content: error.response?.data.error || "Erreur de chargement",
            },
          ]);
        }
        break;

      case "/create":
        if (!args[1]) {
          setMessages(prev => [...prev, {
            username: "Système",
            content: "Format: /create [nom_du_canal]"
          }]);
          return;
        }
        try {
          await axios.post("http://localhost:5000/api/channels", {
            name: args[1],
            creator: userId
          });
          setChannels(prev => [...prev, args[1]]);

          setMessages(prev => [...prev, {
            username: "Système",
            content: `Vous avez créé le canal : ${args[1]}`
          }]);
        } catch (error) {
          console.error(error);
          setMessages(prev => [...prev, {
            username: "Système",
            content: `Erreur lors de la création du canal ${args[1]}`
          }]);
        }
        break;

      case "/delete":
        if (!args[1]) {
          setMessages(prev => [...prev, {
            username: "Système",
            content: "Format: /delete [nom_du_canal]"
          }]);
          return;
        }
        try {
          await axios.delete(
            `http://localhost:5000/api/channels/${args[1]}?userId=${userId}`
          );
          setChannels(prev => prev.filter(ch => ch !== args[1]));

          setMessages(prev => [...prev, {
            username: "Système",
            content: `Vous avez supprimé le canal : ${args[1]}`
          }]);
        } catch (error) {
          console.error(error);
          setMessages(prev => [...prev, {
            username: "Système",
            content: `Erreur lors de la suppression du canal ${args[1]}`
          }]);
        }
        break;


      case "/join":
        if (!args[1]) {
          setMessages(prev => [...prev, {
            username: "Système",
            content: "Format: /join [canal1],[canal2]..."
          }]);
          return;
        }
        const newChannels = args[1].split(",");
        try {
          const response = await axios.post(
            "http://localhost:5000/api/channels/join-multiple",
            { channelNames: newChannels, userId }
          );

          setChannels(prev => [...new Set([...prev, ...response.data.channels])]);

          setMessages(prev => [...prev, {
            username: "Système",
            content: `Vous avez rejoint le(s) canal(aux) suivant(s) : ${response.data.channels.join(", ")}`
          }]);
        } catch (error) {
          setMessages(prev => [...prev, {
            username: "Système",
            content: error.response?.data.error || "Erreur de connexion aux canaux"
          }]);
        }
        break;


      case "/quit":
        if (!args[1]) {
          setMessages((prev) => [
            ...prev,
            { username: "Système", content: "Format: /quit [canal1],[canal2],..." }
          ]);
          break;
        }

        const channelsToQuit = args[1].split(",");

        try {
          const response = await axios.post(`http://localhost:5000/api/channels/quit-multiple`, {
            userId,
            channelNames: channelsToQuit
          });


          setChannels((prev) => prev.filter((ch) => !channelsToQuit.includes(ch)));

          if (channelsToQuit.includes(currentChannel)) {
            setCurrentChannel("Général");
          }

          setMessages((prev) => [
            ...prev,
            {
              username: "Système",
              content: `Vous avez quitté le(s) canal(aux) : ${channelsToQuit.join(", ")}`
            },
          ]);

        } catch (error) {
          console.error(error);
          setMessages((prev) => [
            ...prev,
            {
              username: "Système",
              content: error.response?.data.error || "Erreur lors du quit",
            },
          ]);
        }
        break;



      default:
        setMessages((prev) => [
          ...prev,
          { username: "Système", content: "Commande inconnue." },
        ]);
        break;
    }
  };

  return (
    <div className="chat-container left-0 flex flex-col h-screen p-4">
      {/* menu */}
      <div class="header" className="header absolute top-0 left-0 p-2 bg-white shadow-md">

        <h1 className="font-bold text-blue-600 mb-0 mt-0">Chatuwu</h1>
        <p className="font-bold text-blue-600 mb-0 mt-0">Faites /cmd pour afficher les commandes</p>
        <p className="font-bold text-blue-600 mb-0 mt-0">Mes canaux :</p>
        <select
          onChange={(e) => setCurrentChannel(e.target.value)}
          value={currentChannel}
          className="les_salons p-2 border rounded"
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              #{ch}
            </option>
          ))}
        </select>
      </div>
      
      {/* messages */}
      <div className="les_messages flex-grow overflow-y-auto p-4 mt-16 mb-24">

        {messages.map((msg, index) => (
          <div class="un_message"
            key={index}
            className="un_message p-3 mb-3 bg-gray-100 rounded-lg shadow-sm"
          >

            <p class="name_user" className="name_user font-bold text-blue-600">{msg.username} &gt;&gt;</p>
            {msg.content.split("\n").map((line, i) => (
              <p key={i} className="ml-2 text-gray-700">{line}</p>
            ))}

          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>


      {/* barre de message */}
      <div class="footer" className="footer flex gap-2">
        <form

          onSubmit={handleSendMessage}
          className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg"
        >
          <input
            type="text"
            className="flex-grow p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Écrivez votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            Envoyer
          </button>
        </form>
      </div>

    </div>
  );
}
