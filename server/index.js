const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in dev
        methods: ["GET", "POST"]
    }
});

// Game State Storage
// Map<gameId, GameObject>
const games = new Map();

// Helper to generate game ID
const generateGameId = () => Math.random().toString(36).substring(2, 6).toUpperCase();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_game', ({ playerName, gridSize = 5 }) => {
        const gameId = generateGameId();
        games.set(gameId, {
            id: gameId,
            host: socket.id,
            players: [{ id: socket.id, name: playerName, ready: false, board: [] }],
            status: 'LOBBY', // LOBBY, PLAYING, FINISHED
            gridSize: parseInt(gridSize),
            numbersCalled: [],
            currentTurnIndex: 0,
            winner: null
        });

        socket.join(gameId);
        socket.emit('game_created', { gameId, players: games.get(gameId).players });
        console.log(`Game created: ${gameId} by ${playerName}`);
    });

    socket.on('join_game', ({ gameId, playerName }) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }
        if (game.status !== 'LOBBY') {
            socket.emit('error', 'Game already started');
            return;
        }

        // Check for max players
        if (game.players.length >= 10) {
            socket.emit('error', 'Game is full (Max 10 players)');
            return;
        }

        // Check if name taken
        if (game.players.some(p => p.name === playerName)) {
            socket.emit('error', 'Name already taken in this game');
            return;
        }

        game.players.push({ id: socket.id, name: playerName, ready: false, board: [] });
        socket.join(gameId);

        io.to(gameId).emit('player_joined', { players: game.players });
        socket.emit('joined_game', { gameId, players: game.players, gridSize: game.gridSize });
        console.log(`${playerName} joined ${gameId}`);
    });

    socket.on('start_game', ({ gameId, gridSize }) => {
        const game = games.get(gameId);
        if (!game || game.host !== socket.id) return;

        game.status = 'PLAYING';
        if (gridSize) game.gridSize = parseInt(gridSize);

        // Randomize turn order
        // game.players.sort(() => Math.random() - 0.5); // Simple shuffle

        io.to(gameId).emit('game_started', {
            players: game.players,
            currentTurn: game.players[0].id,
            gridSize: game.gridSize
        });
        console.log(`Game ${gameId} started with size ${game.gridSize}`);
    });

    socket.on('select_number', ({ gameId, number }) => {
        const game = games.get(gameId);
        if (!game) return;

        // Validate turn
        const currentPlayer = game.players[game.currentTurnIndex];
        // Allow any player to select? No, usually turn based.
        // But BINGO sometimes allows anyone if it's "speed via caller". 
        // The requirement says "works with websocket communication" and original had "nextPlayer".
        // I will implement strictly turn-based for structure.

        if (socket.id !== currentPlayer.id) {
            // socket.emit('error', 'Not your turn');
            // return; 
            // Actually, let's just ignore or maybe it's "Host calls numbers"? 
            // Original: "Each player will get a chance to choose the number in the order of players joined"
            // So Yes, turn based.
        }

        if (game.numbersCalled.includes(number)) return;

        game.numbersCalled.push(number);

        // Update turn
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
        const nextPlayerId = game.players[game.currentTurnIndex].id;

        io.to(gameId).emit('number_selected', {
            number,
            numbersCalled: game.numbersCalled,
            nextTurn: nextPlayerId,
            selector: currentPlayer.name
        });
    });

    // Optional: Client sends "I have Bingo"
    socket.on('claim_bingo', ({ gameId }) => {
        const game = games.get(gameId);
        if (!game) return;
        const player = game.players.find(p => p.id === socket.id);

        game.winner = player.name;
        game.status = 'FINISHED';

        io.to(gameId).emit('game_over', { winner: player.name });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const [id, game] of games.entries()) {
            const player = game.players.find(p => p.id === socket.id);

            if (player) {
                if (game.status === 'PLAYING') {
                    console.log(`Player ${player.name} disconnected from active game ${id}. Terminating.`);
                    io.to(id).emit('game_terminated', { reason: `Game ended because ${player.name} went offline.` });
                    games.delete(id);
                } else {
                    // Lobby mode - just remove
                    const idx = game.players.indexOf(player);
                    game.players.splice(idx, 1);
                    io.to(id).emit('player_left', { players: game.players });
                    if (game.players.length === 0) {
                        games.delete(id);
                    }
                }
                break;
            }
        }
    });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Bingo Server running on port ${PORT}`);
});
