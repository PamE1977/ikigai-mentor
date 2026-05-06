const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const sessions = {};

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/session/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado:', socket.id);

  socket.on('join_session', (data) => {
    const { sessionId, participantName } = data;
    
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        participants: {},
        responses: {
          pasion: [],
          habilidad: [],
          valor: [],
          sustento: []
        }
      };
    }

    socket.join(sessionId);
    sessions[sessionId].participants[socket.id] = {
      name: participantName,
      socketId: socket.id
    };

    socket.emit('load_data', {
      responses: sessions[sessionId].responses,
      participantCount: Object.keys(sessions[sessionId].participants).length
    });

    io.to(sessionId).emit('update_participants', {
      count: Object.keys(sessions[sessionId].participants).length,
      participants: sessions[sessionId].participants
    });

    console.log(`${participantName} se unió a la sesión ${sessionId}`);
  });

  socket.on('add_response', (data) => {
    const { sessionId, quadrant, text, author } = data;

    if (sessions[sessionId]) {
      const response = {
        text: text,
        author: author,
        timestamp: Date.now()
      };

      sessions[sessionId].responses[quadrant].push(response);

      io.to(sessionId).emit('response_added', {
        quadrant: quadrant,
        response: response,
        allResponses: sessions[sessionId].responses
      });

      console.log(`Nueva respuesta en ${quadrant}: ${text}`);
    }
  });

  socket.on('disconnect', () => {
    Object.keys(sessions).forEach(sessionId => {
      if (sessions[sessionId].participants[socket.id]) {
        delete sessions[sessionId].participants[socket.id];

        io.to(sessionId).emit('update_participants', {
          count: Object.keys(sessions[sessionId].participants).length,
          participants: sessions[sessionId].participants
        });

        if (Object.keys(sessions[sessionId].participants).length === 0) {
          delete sessions[sessionId];
        }
      }
    });

    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor Ikigai Mentor corriendo en puerto ${PORT}`);
});
