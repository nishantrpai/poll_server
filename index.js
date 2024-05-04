// poll server will create a random room id and send it to the client and the client will join that room
// people will vote their timezone and there will be a room with the timezone and the votes and average timezone

const { Server } = require("socket.io");
const http = require("http");

const httpServer = http.createServer();

let rooms = {

};

const io = new Server(httpServer, {
  // your options here
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  // console.log("a user connected");

  socket.on("createRoom", (data) => {
    const roomId = Math.random().toString(36).substring(2, 15);
    rooms[roomId] = {
      creatorTz: data.tz,
      creatorComfortStart: data.bestStartTime,
      creatorComfortEnd: data.bestEndTime,
      roomGoal: data.goal,
      creatorFingerprint: data.fingerprint,
      votes: {},
      voters: [],
    };
    socket.emit("roomCreated", roomId);
  });

  socket.on("checkRoom", (roomId) => {
    if(rooms[roomId]) {
      // console.log("room exists", roomId);
      socket.emit("roomExists", rooms[roomId]);
    } else {
      socket.emit("roomNotFound");
    }
  });

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    if(!rooms[roomId]) {
      socket.emit("roomNotFound");
      return;
    }
    io.to(roomId).emit("roomJoined", rooms[roomId]);
  });

  socket.on("vote", (data) => {
    let { roomId, vote, fingerprint } = data;
    vote = parseInt(vote);
    if(!rooms[roomId]) {
      socket.emit("roomNotFound");
      return;
    }
    if(rooms[roomId].voters.includes(fingerprint)) {
      socket.emit("alreadyVoted");
      return;
    }
    if(!rooms[roomId].votes[vote]) {
      rooms[roomId].votes[vote] = 0;
    }
    rooms[roomId].votes[vote] += 1;
    rooms[roomId].voters.push(fingerprint);
    // console.log(rooms[roomId].votes, 'votes');
    io.to(roomId).emit("allVotes", rooms[roomId].votes);
  });

  socket.on("checkVoter", (data) => {
    const { roomId, fingerprint } = data;
    if(rooms[roomId].voters.includes(fingerprint)) {
      socket.emit("alreadyVoted");
    }
  });

  socket.on("getVotes", (roomId) => {
    if(!rooms[roomId]) {
      socket.emit("roomNotFound");
      return;
    }
    socket.emit("allVotes", rooms[roomId].votes);
  });

  socket.on("disconnect", () => {
    // console.log("user disconnected");
  });
});


const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () =>  console.log(`Socket.io server running on port ${PORT}`));
