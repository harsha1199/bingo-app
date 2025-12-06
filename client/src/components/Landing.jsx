import React, { useState } from 'react';

const Landing = ({ onCreate, onJoin }) => {
    const [name, setName] = useState('');
    const [gameId, setGameId] = useState('');
    const [mode, setMode] = useState('menu'); // menu, join

    const handleCreate = () => {
        if (!name) return alert("Please enter name");
        onCreate(name);
    }

    const handleJoin = () => {
        if (!name || !gameId) return alert("Please enter name and game code");
        onJoin(name, gameId);
    }

    return (
        <div className="glass-panel container">
            <h1>Bingo Party</h1>
            <input
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
            />
            {mode === 'menu' && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button onClick={handleCreate}>Create Game</button>
                    <button onClick={() => setMode('join')}>Join Game</button>
                </div>
            )}
            {mode === 'join' && (
                <div>
                    <input
                        placeholder="Game Code"
                        value={gameId}
                        onChange={e => setGameId(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={handleJoin}>Enter Game</button>
                        <button onClick={() => setMode('menu')} style={{ background: 'transparent' }}>Back</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Landing;
