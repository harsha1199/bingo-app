import React, { useState, useEffect } from 'react';
import socket from './socket';
import Landing from './components/Landing';
import GameBoard from './components/GameBoard';
import { generateGrid, checkWin } from './utils/bingo';

function App() {
  const [view, setView] = useState('LANDING'); // LANDING, LOBBY, GAME, WIN
  const [player, setPlayer] = useState({ name: '', id: '' });
  const [game, setGame] = useState({ id: '', players: [], status: 'LOBBY', gridSize: 5 });
  const [myGrid, setMyGrid] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(''); // player ID
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    // Socket Listeners
    socket.on('connect', () => {
      setPlayer(prev => ({ ...prev, id: socket.id }));
    });

    socket.on('game_created', ({ gameId, players }) => {
      setGame(prev => ({ ...prev, id: gameId, players }));
      setView('LOBBY');
    });

    socket.on('joined_game', ({ gameId, players, gridSize }) => {
      setGame(prev => ({ ...prev, id: gameId, players, gridSize }));
      setView('LOBBY');
    });

    socket.on('error', (msg) => alert(msg));

    socket.on('player_joined', ({ players }) => {
      setGame(prev => ({ ...prev, players }));
    });

    socket.on('player_left', ({ players }) => {
      setGame(prev => ({ ...prev, players }));
    });

    socket.on('game_started', ({ players, currentTurn }) => {
      setGame(prev => ({ ...prev, players, status: 'PLAYING' }));
      setCurrentTurn(currentTurn);
      // Generate my grid
      const grid = generateGrid(game.gridSize || 5);
      setMyGrid(grid);
      setView('GAME');
    });

    socket.on('number_selected', ({ number, nextTurn, selector }) => {
      setCalledNumbers(prev => [...prev, number]);
      setCurrentTurn(nextTurn);
    });

    socket.on('game_over', ({ winner }) => {
      setWinner(winner);
      setView('WIN');
    });

    socket.on('game_terminated', ({ reason }) => {
      setGame(prev => ({ ...prev, status: 'TERMINATED', reason }));
      setView('TERMINATED');
    });

    return () => {
      socket.off('connect');
      socket.off('game_created');
      socket.off('joined_game');
      socket.off('error');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('game_started');
      socket.off('number_selected');
      socket.off('game_over');
      socket.off('game_terminated');
    }
  }, [game.gridSize]);

  // Turn Reminder Logic
  useEffect(() => {
    let timer;
    if (view === 'GAME' && currentTurn === socket.id) {
      timer = setTimeout(() => {
        // 30 seconds elapsed, remind user
        if ('speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance(`Hey ${player.name}, please pick a number!`);
          window.speechSynthesis.speak(msg);
        }
      }, 30000); // 30s
    }
    return () => clearTimeout(timer);
  }, [currentTurn, view, player.name]);

  // Check for Bingo lines locally
  useEffect(() => {
    if (view === 'GAME') {
      const lines = checkWin(myGrid, calledNumbers, game.gridSize);
      if (lines >= 5) {
        socket.emit('claim_bingo', { gameId: game.id });
      }
    }
  }, [calledNumbers, myGrid, view, game.gridSize, game.id]);

  // State for Lobby settings
  const [localGridSize, setLocalGridSize] = useState(5);

  const createGame = (name) => {
    setPlayer({ name, id: '' }); // ID updated on connect
    socket.connect();
    socket.emit('create_game', { playerName: name, gridSize: 5 });
  };

  const joinGame = (name, gameId) => {
    setPlayer({ name, id: '' });
    socket.connect();
    socket.emit('join_game', { gameId, playerName: name });
  }

  const startGame = () => {
    socket.emit('start_game', { gameId: game.id, gridSize: localGridSize });
  }

  const handleSelect = (num) => {
    // Logic: Only can select if my turn
    if (currentTurn === socket.id) {
      socket.emit('select_number', { gameId: game.id, number: num });
    }
  }

  return (
    <div>
      {view === 'LANDING' && <Landing onCreate={createGame} onJoin={joinGame} />}

      {view === 'LOBBY' && (
        <div className="glass-panel container">
          <h1>Lobby</h1>
          <div style={{ margin: '2rem 0' }}>
            <h3>Code: <span style={{ color: 'var(--primary)', userSelect: 'all' }}>{game.id}</span></h3>
            <p>Share this code with friends!</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {game.players.map(p => (
              <div key={p.id} style={{
                padding: '1rem',
                background: p.id === socket.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}>
                {p.name} {p.id === socket.id && '(You)'}
              </div>
            ))}
          </div>

          {game.players.length > 1 && game.players[0].id === socket.id && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label>Grid Size:</label>
                <select
                  value={localGridSize}
                  onChange={e => setLocalGridSize(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}
                >
                  <option value={5}>5x5 (Standard)</option>
                  <option value={10}>10x10 (Large)</option>
                </select>
              </div>
              <button style={{ background: 'var(--success)', color: 'white' }} onClick={startGame}>
                Start Game
              </button>
            </div>
          )}
          {game.players.length <= 1 && <p style={{ marginTop: '2rem' }}>Waiting for at least 1 more player...</p>}
        </div>
      )}

      {view === 'GAME' && (
        <GameBoard
          grid={myGrid}
          calledNumbers={calledNumbers}
          size={game.gridSize || 5}
          onSelect={handleSelect}
          myTurn={currentTurn === socket.id}
          winLines={checkWin(myGrid, calledNumbers, game.gridSize || 5)}
          currentTurn={currentTurn}
          playerMap={game.players.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})}
        />
      )}

      {view === 'WIN' && (
        <div className="glass-panel container">
          <h1>BIN-GO!</h1>
          <h2>Winner: {winner}</h2>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}

      {view === 'TERMINATED' && (
        <div className="glass-panel container">
          <h1 style={{ color: '#ef4444' }}>Game Ended</h1>
          <h3>{game.reason}</h3>
          <p style={{ marginBottom: '2rem' }}>Please restart to play again.</p>
          <button onClick={() => window.location.reload()}>Return to Menu</button>
        </div>
      )}
    </div>
  );
}

export default App;
