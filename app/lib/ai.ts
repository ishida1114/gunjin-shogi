import {
  PieceType,
  Position,
  judgeBattle,
  getValidAdjacentPositions,
  canOccupyHQ,
  getBehindPiece,
} from '@/app/types/game'

// CPU用の初期23枚配置（敵陣 y=0~2 / 突入口前 2-2, 5-2 に地雷禁止）
export function generateAiBoard(): Record<string, PieceType> {
  const pieces: PieceType[] = [
    '大将', '中将', '少将',
    '大佐', '中佐', '少佐',
    '大尉', '中尉', '少尉', '少尉',
    '飛行機', '飛行機', 'タンク', 'タンク', '騎兵', '騎兵',
    '工兵', '工兵',
    'スパイ',
    '地雷', '地雷',
    '軍旗', '少尉'
  ]

  let board: Record<string, PieceType> = {}
  let isValidLayout = false

  while (!isValidLayout) {
    const shuffled = [...pieces].sort(() => Math.random() - 0.5)
    board = {}
    let idx = 0

    // y=0 領域 (3-0配置)
    for (let x = 0; x <= 7; x++) {
      if (x === 4) continue
      if (idx < shuffled.length) {
        board[`${x}-0`] = shuffled[idx++]
      }
    }
    // y=1 領域
    for (let x = 0; x <= 7; x++) {
      if (idx < shuffled.length) {
        board[`${x}-1`] = shuffled[idx++]
      }
    }
    // y=2 領域
    for (let x = 0; x <= 7; x++) {
      if (idx < shuffled.length) {
        board[`${x}-2`] = shuffled[idx++]
      }
    }

    if (board['2-2'] !== '地雷' && board['5-2'] !== '地雷') {
      isValidLayout = true
    }
  }

  return board
}

export function processAiTurn(
  p1Board: Record<string, PieceType>,
  p2Board: Record<string, PieceType>
): {
  newP1Board: Record<string, PieceType>
  newP2Board: Record<string, PieceType>
  lastLog: string
  winner?: 'player1' | 'player2'
} {
  const boardState: Record<string, { type: PieceType; owner: string }> = {}
  Object.entries(p1Board).forEach(([k, v]) => (boardState[k] = { type: v, owner: 'player1' }))
  Object.entries(p2Board).forEach(([k, v]) => (boardState[k] = { type: v, owner: 'player2' }))

  const p2Keys = Object.keys(p2Board)
  if (p2Keys.length === 0) {
    return {
      newP1Board: p1Board,
      newP2Board: p2Board,
      lastLog: '敵軍の駒が全滅しました！自軍の勝利です！',
      winner: 'player1',
    }
  }

  const possibleMoves: { from: string; to: Position; piece: PieceType }[] = []

  for (const key of p2Keys) {
    const [x, y] = key.split('-').map(Number)
    const piece = p2Board[key]
    const moves = getValidAdjacentPositions(x, y, piece, boardState, 'player2')
    for (const move of moves) {
      possibleMoves.push({ from: key, to: move, piece })
    }
  }

  if (possibleMoves.length === 0) {
    return {
      newP1Board: p1Board,
      newP2Board: p2Board,
      lastLog: '敵軍は移動できる駒がありません。',
    }
  }

  const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
  const targetKey = `${chosenMove.to.x}-${chosenMove.to.y}`
  const targetP1Piece = p1Board[targetKey]

  const newP1 = { ...p1Board }
  const newP2 = { ...p2Board }
  delete newP2[chosenMove.from]

  let logMsg = ''
  let winner: 'player1' | 'player2' | undefined = undefined

  const isTargetHQ = chosenMove.to.y === 6 && (chosenMove.to.x === 3 || chosenMove.to.x === 4)

  if (isTargetHQ && canOccupyHQ(chosenMove.piece) && !targetP1Piece) {
    newP2[targetKey] = chosenMove.piece
    logMsg = '💥 敵軍に自軍の総司令部が占領されました… 敗北です。'
    winner = 'player2'
  } else if (!targetP1Piece) {
    newP2[targetKey] = chosenMove.piece
    logMsg = '敵軍が駒を進めました。'
  } else {
    // 軍旗背後駒の判定
    const defenderBehind = getBehindPiece(targetKey, 'player1', boardState)
    const battleRes = judgeBattle(chosenMove.piece, targetP1Piece, defenderBehind)

    if (battleRes === 'attacker') {
      newP2[targetKey] = chosenMove.piece
      delete newP1[targetKey]
      logMsg = '⚔️ 敵軍の攻撃を受け、自軍の駒が撃破されました！'

      if (targetP1Piece === '軍旗') {
        logMsg = '💥 自軍の軍旗が突破されました… 敗北です。'
        winner = 'player2'
      }
    } else if (battleRes === 'defender') {
      logMsg = '⚔️ 敵軍の攻撃を返り討ちにしました！'
    } else {
      delete newP1[targetKey]
      logMsg = '⚔️ 敵軍の攻撃に対し相討ちとなりました。'
    }
  }

  return {
    newP1Board: newP1,
    newP2Board: newP2,
    lastLog: logMsg,
    winner,
  }
}