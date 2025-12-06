import React from 'react';
import styles from './GameBoard.module.css';
import socket from '../socket';

const GameBoard = ({ grid, calledNumbers, size, onSelect, myTurn, winLines, playerMap, currentTurn }) => {
    const letters = ['B', 'I', 'N', 'G', 'O'].slice(0, size === 5 ? 5 : 5); // Just BINGO for now even for large

    // Calculate completed lines to light up letters
    // Logic: 1 line = B, 2 = BI, etc.

    return (
        <div className={styles.boardContainer}>
            <div className={styles.gameLayout}>
                {/* Players List Sidebar */}
                <div className={styles.playersList}>
                    <h3>Players</h3>
                    {Object.values(playerMap).map(p => (
                        <div
                            key={p.id}
                            className={`${styles.playerItem} ${p.id === currentTurn ? styles.activePlayer : ''} ${p.id === socket.id ? styles.selfPlayer : ''}`}
                        >
                            <div className={styles.avatar}>{p.name[0].toUpperCase()}</div>
                            <div className={styles.playerName}>{p.name} {p.id === socket.id ? '(You)' : ''}</div>
                        </div>
                    ))}
                </div>

                <div className={styles.boardArea}>
                    <div className={styles.header}>
                        {letters.map((l, i) => (
                            <div key={i} className={`${styles.letter} ${i < winLines ? styles.active : ''}`}>
                                {l}
                            </div>
                        ))}
                    </div>

                    <div
                        className={styles.grid}
                        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
                    >
                        {grid.map((num, i) => {
                            const isCalled = calledNumbers.includes(num);
                            return (
                                <button
                                    key={i}
                                    className={`${styles.cell} ${isCalled ? styles.called : ''}`}
                                    onClick={() => onSelect(num)}
                                    disabled={isCalled || !myTurn}
                                >
                                    {num}
                                </button>
                            )
                        })}
                    </div>

                    <div className={styles.status}>
                        {myTurn ? "Check your board! Your Turn to Pick!" : `Waiting for ${playerMap[currentTurn]?.name || 'opponent'}...`}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameBoard;
