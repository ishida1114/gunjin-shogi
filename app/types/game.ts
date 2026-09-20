export type PieceType =
  | '大将'
  | '中将'
  | '少将'
  | '大佐'
  | '中佐'
  | '少佐'
  | '大尉'
  | '中尉'
  | '少尉'
  | '飛行機'
  | 'タンク'
  | '騎兵'
  | '工兵'
  | 'スパイ'
  | '地雷'
  | '軍旗'

export interface Position {
  x: number
  y: number
}

export interface Piece {
  id: string
  type: PieceType
  player: 'player' | 'cpu'
  isRevealed?: boolean
  position: Position
}

export const ENTRY_COLUMNS = [2, 5]

export const PIECE_LABELS: Record<PieceType, string> = {
  大将: '大将', 中将: '中将', 少将: '少将', 大佐: '大佐', 中佐: '中佐', 少佐: '少佐',
  大尉: '大尉', 中尉: '中尉', 少尉: '少尉', 飛行機: '飛行機', タンク: 'タンク', 騎兵: '騎兵',
  工兵: '工兵', スパイ: 'スパイ', 地雷: '地雷', 軍旗: '軍旗',
}

export function isRiverCell(x: number, y: number): boolean {
  return y === 3 && x !== 2 && x !== 5
}

export function isEntryCell(x: number, y: number): boolean {
  return y === 3 && (x === 2 || x === 5)
}

export function isEnemyHQCell(x: number, y: number): boolean {
  return y === 0 && (x === 3 || x === 4)
}

export function isMyHQCell(x: number, y: number): boolean {
  return y === 6 && (x === 3 || x === 4)
}

export function isHQCell(x: number, y: number): boolean {
  return isEnemyHQCell(x, y) || isMyHQCell(x, y)
}

export function canOccupyHQ(piece: PieceType): boolean {
  const cannot = ['地雷', '軍旗', '飛行機', 'タンク']
  return !cannot.includes(piece)
}

export function getValidAdjacentPositions(
  x: number,
  y: number,
  piece: PieceType,
  boardState: Record<string, { type: PieceType; owner: string }>,
  myOwner: string
): Position[] {
  if (piece === '地雷' || piece === '軍旗') return []

  const valid: Position[] = []
  
  const directions = piece === '騎兵' 
    ? [{ x: 0, y: -1 }] 
    : [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ]

  if (piece === '飛行機') {
    // 修正２：飛行機は味方や敵を飛び越えられる
    for (const dir of directions) {
      let nx = x + dir.x
      let ny = y + dir.y
      while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        const targetKey = `${nx}-${ny}`
        const occupant = boardState[targetKey]
        
        // 修正３：川には止まれないが飛び越え可能
        if (!isRiverCell(nx, ny)) {
          if (!occupant) {
            valid.push({ x: nx, y: ny })
          } else {
            if (occupant.owner !== myOwner) {
              valid.push({ x: nx, y: ny }) // 敵なら攻撃（着地）可能
            }
            // ぶつかっても飛び越えるためループは継続
          }
        }
        nx += dir.x
        ny += dir.y
      }
    }
  } else if (piece === '工兵' || piece === 'タンク' || piece === '騎兵') {
    // 他の特殊コマ
    for (const dir of directions) {
      let nx = x + dir.x
      let ny = y + dir.y
      while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        // 修正３：川への進入不可（壁になる）
        if (isRiverCell(nx, ny)) break

        const targetKey = `${nx}-${ny}`
        const occupant = boardState[targetKey]

        if (!occupant) {
          valid.push({ x: nx, y: ny })
        } else {
          if (occupant.owner !== myOwner) {
            valid.push({ x: nx, y: ny })
          }
          break // 駒にぶつかったらストップ（飛び越え不可）
        }
        nx += dir.x
        ny += dir.y
      }
    }
  } else {
    // 通常駒
    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      if (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        // 修正３：川へは進入不可
        if (isRiverCell(nx, ny)) continue

        const targetKey = `${nx}-${ny}`
        const occupant = boardState[targetKey]
        if (!occupant || occupant.owner !== myOwner) {
          valid.push({ x: nx, y: ny })
        }
      }
    }
  }

  return valid
}

export function isValidMove(
  from: Position,
  to: Position,
  piece: PieceType,
  boardState: Record<string, { type: PieceType; owner: string }>,
  myOwner: string
): boolean {
  const validMoves = getValidAdjacentPositions(from.x, from.y, piece, boardState, myOwner)
  return validMoves.some((m) => m.x === to.x && m.y === to.y)
}

export function judgeBattle(
  attacker: PieceType,
  defender: PieceType
): 'attacker' | 'defender' | 'draw' {
  if (attacker === defender) return 'draw'
  if (defender === '地雷') {
    if (attacker === '工兵' || attacker === '飛行機') return 'attacker'
    return 'defender'
  }
  if (attacker === 'スパイ') {
    if (defender === '大将') return 'attacker'
    return 'defender'
  }
  if (defender === 'スパイ') {
    if (attacker === '大将') return 'defender'
    return 'attacker'
  }
  const rankOrder: PieceType[] = [
    '大将', '中将', '少将', '大佐', '中佐', '少佐',
    '大尉', '中尉', '少尉', '飛行機', 'タンク', '騎兵', '工兵'
  ]
  const aIndex = rankOrder.indexOf(attacker)
  const dIndex = rankOrder.indexOf(defender)

  if (aIndex !== -1 && dIndex !== -1) {
    if (aIndex < dIndex) return 'attacker'
    if (aIndex > dIndex) return 'defender'
    return 'draw'
  }
  if (defender === '軍旗') return 'attacker'
  return 'attacker'
}