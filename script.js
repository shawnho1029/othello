const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1; // User (先手)
const WHITE = 2; // Computer (後手)

let board = [];
let currentPlayer = BLACK;
let gameActive = true;
let legalMoves = [];

// 棋盤權重表 (用於進階 AI)：角落分數最高，角落旁的點分數最低
const WEIGHTS = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, -1, -1, -1, -1, -2, 10],
    [5, -2, -1, -1, -1, -1, -2, 5],
    [5, -2, -1, -1, -1, -1, -2, 5],
    [10, -2, -1, -1, -1, -1, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
];

// 初始化遊戲
function initGame() {
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
    // 初始四子
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    
    currentPlayer = BLACK;
    gameActive = true;
    
    renderBoard();
    updateScore();
    findLegalMoves();
    updateStatus("輪到玩家 (黑棋)");
}

// 渲染棋盤
function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = ''; // 清空

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // 點擊事件
            cell.onclick = () => handleUserMove(r, c);

            // 繪製棋子
            if (board[r][c] !== EMPTY) {
                const piece = document.createElement('div');
                piece.className = `piece ${board[r][c] === WHITE ? 'is-white' : 'is-black'}`;
                
                // 3D 結構：正面與背面
                const front = document.createElement('div');
                front.className = 'front';
                const back = document.createElement('div');
                back.className = 'back';
                
                piece.appendChild(front);
                piece.appendChild(back);
                cell.appendChild(piece);
            }
            
            // 顯示合法移動提示
            if (currentPlayer === BLACK && isLegalMove(r, c)) {
                cell.classList.add('legal-move');
            }

            boardEl.appendChild(cell);
        }
    }
}

// 檢查某個位置是否為合法移動
function isLegalMove(r, c) {
    return legalMoves.some(m => m.r === r && m.c === c);
}

// 尋找所有合法移動
function findLegalMoves() {
    legalMoves = [];
    if (!gameActive) return;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== EMPTY) continue;
            
            let captured = getCapturedPieces(r, c, currentPlayer);
            if (captured.length > 0) {
                legalMoves.push({ r, c, captured });
            }
        }
    }
}

// 取得某一步會吃掉的所有棋子 (8個方向檢查)
function getCapturedPieces(r, c, player) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    let totalCaptured = [];
    const opponent = player === BLACK ? WHITE : BLACK;

    for (let [dr, dc] of directions) {
        let tempCaptured = [];
        let nr = r + dr;
        let nc = c + dc;
        
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === opponent) {
            tempCaptured.push({r: nr, c: nc});
            nr += dr;
            nc += dc;
        }
        
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player && tempCaptured.length > 0) {
            totalCaptured = totalCaptured.concat(tempCaptured);
        }
    }
    return totalCaptured;
}

// 玩家點擊處理
function handleUserMove(r, c) {
    // 安全檢查：遊戲結束 或 不是黑棋回合 或 不合法移動 則不動作
    if (!gameActive || currentPlayer !== BLACK || !isLegalMove(r, c)) return;
    
    const move = legalMoves.find(m => m.r === r && m.c === c);
    if (move) {
        // [修正] 這裡只執行移動，不要手動呼叫 computerTurn
        // 流程控制全部交給 executeMove -> switchTurn 處理
        executeMove(move);
    }
}

// 電腦邏輯
function computerTurn() {
    // 安全檢查：如果現在不是白棋回合，電腦不應該動
    if (!gameActive || currentPlayer !== WHITE) return;
    
    updateStatus("電腦思考中...");
    
    // 如果電腦無步可走，switchTurn 會處理 Pass，所以這裡理論上 legalMoves 不會為空
    // 但為了保險起見：
    if (legalMoves.length === 0) {
        switchTurn();
        return;
    }

    const difficulty = document.getElementById('difficulty').value;
    let chosenMove;

    if (difficulty === 'basic') {
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        chosenMove = legalMoves[randomIndex];
    } else {
        // 進階：選擇權重分數最高的步
        let bestScore = -Infinity;
        let bestMoves = [];

        legalMoves.forEach(move => {
            let score = WEIGHTS[move.r][move.c];
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        });
        chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // 模擬思考時間，讓玩家看清楚一點
    setTimeout(() => {
        executeMove(chosenMove);
    }, 500);
}

// 執行下棋動作 (包含動畫)
function executeMove(move) {
    const { r, c, captured } = move;
    
    board[r][c] = currentPlayer;
    
    // 立即渲染棋盤以顯示新落下的子
    renderBoard(); 
    
    // 依序翻轉動畫
    captured.forEach((pos, index) => {
        board[pos.r][pos.c] = currentPlayer; // 更新邏輯
        
        setTimeout(() => {
            // 只針對 DOM 操作做視覺翻轉
            const cell = document.querySelector(`.cell[data-row='${pos.r}'][data-col='${pos.c}']`);
            if (cell && cell.firstChild) {
                const piece = cell.firstChild;
                if (currentPlayer === WHITE) {
                    piece.classList.add('is-white');
                    piece.classList.remove('is-black');
                } else {
                    piece.classList.add('is-black');
                    piece.classList.remove('is-white');
                }
            }
        }, (index + 1) * 150); // 稍微放慢翻轉速度讓 user 看清楚
    });

    // 動畫全部結束後，才交換回合
    const totalAnimTime = (captured.length + 1) * 150 + 500;
    setTimeout(() => {
        updateScore();
        switchTurn(); 
    }, totalAnimTime);
}

// [核心修正] 切換回合邏輯
function switchTurn() {
    // 1. 切換角色
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    
    // 2. 找新角色的合法步
    findLegalMoves();

    // 3. 處理 Pass 狀況 (如果當前選手無路可走)
    if (legalMoves.length === 0) {
        // 暫存目前的無步選手
        const noMovePlayer = currentPlayer === BLACK ? "玩家" : "電腦";
        
        // 切換回對手
        currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
        findLegalMoves();

        // 如果對手也無路可走 -> 雙方都沒步 -> 遊戲結束
        if (legalMoves.length === 0) {
            endGame();
            return;
        }
        
        // 只有一方沒步 -> 顯示 Pass 並繼續
        alert(`${noMovePlayer} 無步可走，Pass!`);
        updateStatus(`${noMovePlayer} Pass! 輪到 ${currentPlayer === BLACK ? "玩家" : "電腦"}`);
        
        // 如果 Pass 後輪到電腦，觸發電腦
        if (currentPlayer === WHITE) {
            setTimeout(computerTurn, 1000);
        } else {
            // Pass 後輪到玩家，重繪棋盤顯示提示
            renderBoard(); 
        }
        return;
    }

    // 4. 正常狀況 (有步可走)
    updateStatus(currentPlayer === BLACK ? "輪到玩家 (黑棋)" : "輪到電腦 (白棋)");
    
    if (currentPlayer === BLACK) {
        renderBoard(); // 顯示玩家提示點
    } else {
        renderBoard(); // 清除提示點
        // 觸發電腦下棋
        setTimeout(computerTurn, 800);
    }
}

function updateScore() {
    let blackCount = 0;
    let whiteCount = 0;
    for(let r=0; r<BOARD_SIZE; r++) {
        for(let c=0; c<BOARD_SIZE; c++) {
            if (board[r][c] === BLACK) blackCount++;
            else if (board[r][c] === WHITE) whiteCount++;
        }
    }
    document.getElementById('score-black').innerText = blackCount;
    document.getElementById('score-white').innerText = whiteCount;
}

function updateStatus(msg) {
    document.getElementById('status-msg').innerText = msg;
}

function endGame() {
    gameActive = false;
    updateScore();
    let blackScore = parseInt(document.getElementById('score-black').innerText);
    let whiteScore = parseInt(document.getElementById('score-white').innerText);
    
    let msg = "遊戲結束! ";
    if (blackScore > whiteScore) msg += "玩家獲勝!";
    else if (whiteScore > blackScore) msg += "電腦獲勝!";
    else msg += "平手!";
    
    updateStatus(msg);
    // 稍微延遲彈出視窗，以免擋住最後一步棋
    setTimeout(() => alert(msg), 100);
}

// 啟動遊戲
window.onload = initGame;