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

// 座標を内部標準(左側のx=3)に完全正規化し、消失バグを防ぐ
export function normalizePos(x: number, y: number): Position {
  if (y === 0 && x === 4) return { x: 3, y: 0 }
  if (y === 6 && x === 4) return { x: 3, y: 6 }
  return { x, y }
}

export function normalizeKey(key: string): string {
  if (key === '4-0') return '3-0'
  if (key === '4-6') return '3-6'
  return key
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
  const addValidPos = (vx: number, vy: number) => {
    const norm = normalizePos(vx, vy)
    if (!valid.some(p => p.x === norm.x && p.y === norm.y)) {
      valid.push(norm)
    }
  }

  const forwardDir = (myOwner === 'player1') ? { x: 0, y: -1 } : { x: 0, y: 1 }
  const directions = piece === '騎兵' 
    ? [forwardDir] 
    : [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]

  const isTargetEnemyHQ = (tx: number, ty: number) => {
    const norm = normalizePos(tx, ty)
    if (myOwner === 'player1') return norm.y === 0 && norm.x === 3
    return norm.y === 6 && norm.x === 3
  }

  if (piece === '飛行機') {
    for (const dir of directions) {
      let nx = x + dir.x
      let ny = y + dir.y
      while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        const norm = normalizePos(nx, ny)
        const targetKey = `${norm.x}-${norm.y}`
        const occupant = boardState[targetKey]
        
        if (!isRiverCell(nx, ny) && !isTargetEnemyHQ(nx, ny)) {
          if (!occupant) {
            addValidPos(nx, ny)
          } else if (occupant.owner !== myOwner) {
            addValidPos(nx, ny)
            break
          }
        }
        nx += dir.x
        ny += dir.y
      }
    }
  } else if (piece === '工兵' || piece === 'タンク' || piece === '騎兵') {
    for (const dir of directions) {
      let nx = x + dir.x
      let ny = y + dir.y
      while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        if (isRiverCell(nx, ny)) break
        if (isTargetEnemyHQ(nx, ny) && !canOccupyHQ(piece)) break

        const norm = normalizePos(nx, ny)
        const targetKey = `${norm.x}-${norm.y}`
        const occupant = boardState[targetKey]

        if (!occupant) {
          addValidPos(nx, ny)
        } else {
          if (occupant.owner !== myOwner) {
            addValidPos(nx, ny)
          }
          break
        }
        nx += dir.x
        ny += dir.y
      }
    }
  } else {
    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      if (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        if (isRiverCell(nx, ny)) continue

        const norm = normalizePos(nx, ny)
        const targetKey = `${norm.x}-${norm.y}`
        const occupant = boardState[targetKey]
        if (!occupant || occupant.owner !== myOwner) {
          addValidPos(nx, ny)
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