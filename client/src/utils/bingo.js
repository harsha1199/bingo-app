export const generateGrid = (size) => {
    // User requested 1-25 for 5x5 (size=5).
    // Ideally this means we just shuffle numbers 1 to size*size.
    const totalNumbers = size * size;
    const grid = [];

    // Create array 1..totalNumbers
    const pool = Array.from({ length: totalNumbers }, (_, i) => i + 1);

    // Shuffle pool (Fisher-Yates)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool;
};

export const checkWin = (grid, calledNumbers, size) => {
    // grid is flat array [0..24]
    // calledNumbers is array of numbers

    // Convert to boolean grid
    const marked = grid.map(n => calledNumbers.includes(n));

    let lines = 0;

    // Rows
    for (let r = 0; r < size; r++) {
        let rowFull = true;
        for (let c = 0; c < size; c++) {
            if (!marked[r * size + c]) rowFull = false;
        }
        if (rowFull) lines++;
    }

    // Cols
    for (let c = 0; c < size; c++) {
        let colFull = true;
        for (let r = 0; r < size; r++) {
            if (!marked[r * size + c]) colFull = false;
        }
        if (colFull) lines++;
    }

    // Diagonals (only 2 main ones usually count in Bingo? Or all?)
    // Standard Bingo: 5 lines typically wins or specific patterns.
    // The previous app had "BINGO" letters light up. 5 lines = B-I-N-G-O.
    // So we need to count total completed lines (rows + cols + diags).

    // Diag 1 (Top-left to bottom-right)
    let d1Full = true;
    for (let i = 0; i < size; i++) {
        if (!marked[i * size + i]) d1Full = false;
    }
    if (d1Full) lines++;

    // Diag 2 (Top-right to bottom-left)
    let d2Full = true;
    for (let i = 0; i < size; i++) {
        if (!marked[i * size + (size - 1 - i)]) d2Full = false;
    }
    if (d2Full) lines++;

    return lines;
};
