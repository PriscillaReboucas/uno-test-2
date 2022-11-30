const { Server } = require('socket.io');
const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv').config()
const app = express();
const http = require('http');
const {firestore} = require('./firebase.js');
require('dotenv').config()

app.use(cors());
const server = http.createServer(app);

const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
});

const fetchCardsFb = async () => {
  const req = await firestore.collection('cards').get();
  const unoCards = req.docs.map(card => ({...card.data()}))
  const shuffled = shuffleDeck(unoCards[0].cards)
  return shuffled;
};

const fetchScoreboardsFb = async () => {
  const req = await firestore.collection('scoreboard').get();
  const scoreboard = req.docs.map(score => ({...score.data()}))
  return scoreboard
};

const shuffleDeck = (unoDeck) =>{
  const shuffle = unoDeck.sort(() => {
    return Math.random() - 0.5;
  }) 
  return shuffle;
}

let userData = [];
let userCount = 1;
let hand;
let turn = 1;
let displayUser = [];
const cardDeckCopy = [];

function dealCards (unoDeck) {
  const hands = unoDeck.splice(0, 7)
  return hands;
}

const deckCopy = async () =>{
  const unoCards = await fetchCardsFb();
  cardDeckCopy.push(unoCards);
};

deckCopy();

io.on("connection", (socket) => {
  socket.on('joinRoom', async (data) => {
    hand = dealCards(cardDeckCopy[0]);
    const playerData = {player: data.user, cards: hand, order: userCount, id: data.id, position: data.position}
    userCount++;
    userData.push(playerData);
    socket.join(data.room, data.user);
    socket.to(data.room).emit('currentUser', data.user)
    io.sockets.emit('allUserData', userData)
    io.sockets.emit('initialDeck', cardDeckCopy)
    io.sockets.emit('changeTurn', turn)
    console.log(`${data.user} with id ${socket.id} joined room ${data.room}`);
    socket.on('disconnect', () => {
      --userCount;
      userData.splice(0, userData.length)
      displayUser.splice(0, displayUser.length)
      turn = 1;
      console.log(`${data.username} with id ${socket.id} left room ${data.room}`);
    })
  })
  socket.on('pickUpDeck', (newDeck, updatedUser) => {
    cardDeckCopy.splice(0, cardDeckCopy.length, ...newDeck)
    const userIndex = userData.findIndex(user => user.id === updatedUser[0].id)
    userData.splice(userIndex, 1, updatedUser[0]);
    io.sockets.emit('allUserData', userData)
    io.sockets.emit('initialDeck', cardDeckCopy)
  })
  socket.on('turnBaseGame', (nextTurn, bgColor) => {
    turn = nextTurn;
    io.sockets.emit('changeTurn', turn);
    io.sockets.emit('newBackColor', bgColor)
  })
  socket.on('gameStart', (startingCard, startGameDeck, bgColor) => {
    cardDeckCopy.splice(0, cardDeckCopy.length, ...startGameDeck);
    io.sockets.emit('initialDeck', cardDeckCopy)
    io.sockets.emit('startingCard', startingCard)
    io.sockets.emit('changeTurn', turn)
    io.sockets.emit('initialColor', bgColor)
  })
  socket.on('playCard', (updatedUserList, playingDeck) => {
    
    userData.splice(0, userData.length, ...updatedUserList);
    io.sockets.emit('allUserData', userData)
    io.sockets.emit('playingDeck', playingDeck)
  })
  socket.on('currentPlayer', (currentPlayer) => {
    console.log(currentPlayer)
    io.sockets.emit('currentTurn', currentPlayer)
  })
  socket.on('updateUser', (updateUser)=>{
    if (displayUser.length > 0) {
      const userIndex = displayUser.findIndex(user => user.user === updateUser.user)
      if(userIndex !== -1) {
        displayUser.splice(userIndex, 1, updateUser);
        io.sockets.emit('displayUser', displayUser)
      } else {
        displayUser.push(updateUser);
        io.sockets.emit('displayUser', displayUser)
      }
    } else {
      displayUser.push(updateUser);
      io.sockets.emit('displayUser', displayUser)
    }
  })
  socket.on('powerCards', (copyDeck) => {
    cardDeckCopy.splice(0, cardDeckCopy.length, ...copyDeck)
    io.sockets.emit('initialDeck', cardDeckCopy)
  })
  socket.on('quitGame', () => {
    userData.splice(0, userData.length)
    io.sockets.emit('allUserData', userData)
    io.socketsLeave("room1");
  })
});

server.listen(PORT, ()=> {
  console.log('Server is running in', PORT)
})

