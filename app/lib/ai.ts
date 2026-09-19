import { PieceType, isValidMove, judgeBattle, ENTRY_COLUMNS, canOccupyHQ } from '@/app/types/game'

const AI_PIECE_LIST: PieceType[] = [
  'taisho', 'chujo', 'shojo', 'taisa', 'chusa', 'shosa',
  'taii', 'taii', 'chui', 'chui', 'shoi', 'shoi',
  'kohei', 'kohei', 'kikou', 'tanku', 'tanku',
  'hikoki', 'hikoki', 'spy', 'jira', 'jira', 'gunki'
]

export function generateAiBoard(): Record<string, PieceType> {
  const board: Record<string, PieceType> = {}
  const availablePositions: { x: number; y: number }[] = []
  for (let y = 4; y <= 6; y++) {
    for (let x = 0; x < 8; x++) {
      availablePositions.push({ x, y })
    }
  }

  const shuffledPieces = [...AI_PIECE_LIST].sort(() => Math.random() - 0.5)

  shuffledPieces.forEach((piece) => {
    let targetIndex = -1

    for (let i = 0; i < availablePositions.length; i++) {
      const pos = availablePositions[i]
      const isEntryFront = pos.y === 4 && ENTRY_COLUMNS.includes(pos.x)

      if (isEntryFront && (piece === 'jira' || piece === 'gunki')) {
        continue
      }
      targetIndex = i
      break
    }

    if (targetIndex !== -1) {
      const pos = availablePositions.splice(targetIndex, 1)[0]
      board[`${pos.x}-${pos.y}`] = piece
    }
  })

  return board
}

export function processAiTurn(
  p1Board: Record<string, PieceType>,
  p2Board: Record<string, PieceType>
): {
  newP1Board: Record<string, PieceType>
  newP2Board: Record<string, PieceType>
  winner: string | null
} {
  const newP1Board = { ...p1Board }
  const newP2Board = { ...p2Board }

  const boardState: Record<string, { type: PieceType; owner: 'player1' | 'player2' }> = {}
  Object.entries(newP1Board).forEach(([k, v]) => (boardState[k] = { type: v, owner: 'player1' }))
  Object.entries(newP2Board).forEach(([k, v]) => (boardState[k] = { type: v, owner: 'player2' }))

  const validMoves: { from: string; to: string; fromX: number; fromY: number; toX: number; toY: number; piece: PieceType; isAttack: boolean }[] = []

  Object.entries(newP2Board).forEach(([fromKey, pieceType]) => {
    const [fxStr, fyStr] = fromKey.split('-')
    const fx = parseInt(fxStr)
    const fy = parseInt(fyStr)

    for (let ty = 0; ty < 7; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const toKey = `${tx}-${ty}`
        const targetCell = boardState[toKey]

        if (targetCell && targetCell.owner === 'player2') continue

        // 相手本部への移動制限（将校・工兵のみ）
        const isTargetEnemyHQ = ty === 0 && (tx === 3 || tx === 4)
        if (isTargetEnemyHQ && !canOccupyHQ(pieceType)) continue

        if (isValidMove(pieceType, 'player2', { x: fx, y: fy }, { x: tx, y: ty }, boardState)) {
          validMoves.push({
            from: fromKey,
            to: toKey,
            fromX: fx,
            fromY: fy,
            toX: tx,
            toY: ty,
            piece: pieceType,
            isAttack: !!(targetCell && targetCell.owner === 'player1'),
          })
        }
      }
    }
  })

  if (validMoves.length === 0) {
    return { newP1Board, newP2Board, winner: 'player1' }
  }

  const attackMoves = validMoves.filter((m) => m.isAttack)
  const chosenMove = attackMoves.length > 0
    ? attackMoves[Math.floor(Math.random() * attackMoves.length)]
    : validMoves[Math.floor(Math.random() * validMoves.length)]

  delete newP2Board[chosenMove.from]
  let winner: string | null = null

  const isAttackingEnemyHQ = chosenMove.toY === 0 && (chosenMove.toX === 3 || chosenMove.toX === 4)

  const targetCell = boardState[chosenMove.to]
  if (targetCell) {
    let defenderTypeForBattle = targetCell.type

    if (targetCell.type === 'gunki') {
      const backKey = `${chosenMove.toX}-${chosenMove.toY - 1}`
      const backPiece = boardState[backKey]
      if (backPiece && backPiece.owner === 'player1') {
        defenderTypeForBattle = backPiece.type
      }
    }

    const battleRes = judgeBattle(chosenMove.piece, defenderTypeForBattle)

    if (battleRes === 'attacker') {
      newP2Board[chosenMove.to] = chosenMove.piece
      delete newP1Board[chosenMove.to]
      if (targetCell.type === 'gunki' || isAttackingEnemyHQ) winner = 'player2'
    } else if (battleRes === 'defender') {
      // 返り討ち
    } else {
      delete newP1Board[chosenMove.to]
    }
  } else {
    newP2Board[chosenMove.to] = chosenMove.piece
    if (isAttackingEnemyHQ) winner = 'player2'
  }

  return { newP1Board, newP2Board, winner }
}