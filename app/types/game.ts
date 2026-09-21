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

export function getBehindPiece(
  defenderKey: string,
  defenderOwner: string,
  boardState: Record<string, { type: PieceType; owner: string }>
): PieceType | undefined {
  const normKey = normalizeKey(defenderKey)
  const [x, y] = normKey.split('-').map(Number)
  const behindY = defenderOwner === 'player1' ? y + 1 : y - 1
  const behindKey = normalizeKey(`${x}-${behindY}`)
  return boardState[behindKey]?.type
}

// 添付の星取り表（hoshitorihyou.jpg）に100%完全準拠した勝敗判定マトリックス
const BATTLE_MATRIX: Record<PieceType, Record<PieceType, 'attacker' | 'defender' | 'draw'>> = {
  大将: { 大将: 'draw', 中将: 'attacker', 少将: 'attacker', 飛行機: 'attacker', タンク: 'attacker', 大佐: 'attacker', 中佐: 'attacker', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'defender', 地雷: 'draw', 軍旗: 'attacker' },
  中将: { 大将: 'defender', 中将: 'draw', 少将: 'attacker', 飛行機: 'attacker', タンク: 'attacker', 大佐: 'attacker', 中佐: 'attacker', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  少将: { 大将: 'defender', 中将: 'defender', 少将: 'draw', 飛行機: 'attacker', タンク: 'attacker', 大佐: 'attacker', 中佐: 'attacker', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  飛行機: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'draw', タンク: 'attacker', 大佐: 'attacker', 中佐: 'attacker', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'attacker', 軍旗: 'attacker' },
  タンク: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'draw', 大佐: 'attacker', 中佐: 'attacker', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  大佐: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'draw', 中佐: 'attacker', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  中佐: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'draw', 少佐: 'attacker', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  少佐: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'draw', 大尉: 'attacker', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  大尉: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'draw', 中尉: 'attacker', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  中尉: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'defender', 中尉: 'draw', 少尉: 'attacker', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  少尉: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'defender', 中尉: 'defender', 少尉: 'draw', 騎兵: 'attacker', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  騎兵: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'defender', 中尉: 'defender', 少尉: 'defender', 騎兵: 'draw', 工兵: 'attacker', スパイ: 'attacker', 地雷: 'draw', 軍旗: 'attacker' },
  工兵: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'defender', 中尉: 'defender', 少尉: 'defender', 騎兵: 'defender', 工兵: 'draw', スパイ: 'attacker', 地雷: 'attacker', 軍旗: 'attacker' },
  スパイ: { 大将: 'attacker', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'defender', 中尉: 'defender', 少尉: 'defender', 騎兵: 'defender', 工兵: 'defender', スパイ: 'draw', 地雷: 'draw', 軍旗: 'attacker' },
  地雷: { 大将: 'draw', 中将: 'draw', 少将: 'draw', 飛行機: 'defender', タンク: 'draw', 大佐: 'draw', 中佐: 'draw', 少佐: 'draw', 大尉: 'draw', 中尉: 'draw', 少尉: 'draw', 騎兵: 'draw', 工兵: 'defender', スパイ: 'draw', 地雷: 'draw', 軍旗: 'draw' },
  軍旗: { 大将: 'defender', 中将: 'defender', 少将: 'defender', 飛行機: 'defender', タンク: 'defender', 大佐: 'defender', 中佐: 'defender', 少佐: 'defender', 大尉: 'defender', 中尉: 'defender', 少尉: 'defender', 騎兵: 'defender', 工兵: 'defender', スパイ: 'defender', 地雷: 'defender', 軍旗: 'draw' }
}

export function judgeBattle(
  attacker: PieceType,
  defender: PieceType,
  defenderBehind?: PieceType
): 'attacker' | 'defender' | 'draw' {
  if (defender === '軍旗') {
    if (defenderBehind && defenderBehind !== '軍旗' && defenderBehind !== '地雷') {
      return judgeBattle(attacker, defenderBehind)
    }
    return 'attacker'
  }
  return BATTLE_MATRIX[attacker]?.[defender] ?? 'attacker'
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
    if (!valid.some((p) => p.x === norm.x && p.y === norm.y)) {
      valid.push(norm)
    }
  }

  // 1. 総司令部（2マス結合ブロック）からの前進・左右展開補填
  const isHQ = (x === 3 && (y === 0 || y === 6))
  if (isHQ) {
    const forwardY = (myOwner === 'player1') ? y - 1 : y + 1
    const hqCandidates: Position[] = [
      { x: 3, y: forwardY }, // 前方右マス
      { x: 4, y: forwardY }, // 前方左マス
      { x: 2, y },           // 左外側マス
      { x: 5, y },           // 右外側マス
    ]

    for (const cand of hqCandidates) {
      if (cand.x >= 0 && cand.x <= 7 && cand.y >= 0 && cand.y <= 6) {
        if (!isRiverCell(cand.x, cand.y)) {
          const norm = normalizePos(cand.x, cand.y)
          const occ = boardState[`${norm.x}-${norm.y}`]
          if (!occ || occ.owner !== myOwner) {
            addValidPos(cand.x, cand.y)
          }
        }
      }
    }
    if (piece !== '飛行機' && piece !== '工兵' && piece !== 'タンク' && piece !== '騎兵') {
      return valid
    }
  }

  const forwardY = myOwner === 'player1' ? -1 : 1
  const backwardY = myOwner === 'player1' ? 1 : -1

  const isTargetEnemyHQ = (tx: number, ty: number) => {
    const norm = normalizePos(tx, ty)
    if (myOwner === 'player1') return norm.y === 0 && norm.x === 3
    return norm.y === 6 && norm.x === 3
  }

  // 騎兵・タンク：前に2マス、後ろ・左右に1マス
  if (piece === '騎兵' || piece === 'タンク') {
    const f1x = x
    const f1y = y + forwardY
    if (f1x >= 0 && f1x <= 7 && f1y >= 0 && f1y <= 6 && !isRiverCell(f1x, f1y)) {
      if (!isTargetEnemyHQ(f1x, f1y) || canOccupyHQ(piece)) {
        const norm1 = normalizePos(f1x, f1y)
        const occ1 = boardState[`${norm1.x}-${norm1.y}`]
        if (!occ1) {
          addValidPos(f1x, f1y)
          const f2x = x
          const f2y = y + forwardY * 2
          if (f2x >= 0 && f2x <= 7 && f2y >= 0 && f2y <= 6 && !isRiverCell(f2x, f2y)) {
            if (!isTargetEnemyHQ(f2x, f2y) || canOccupyHQ(piece)) {
              const norm2 = normalizePos(f2x, f2y)
              const occ2 = boardState[`${norm2.x}-${norm2.y}`]
              if (!occ2 || occ2.owner !== myOwner) {
                addValidPos(f2x, f2y)
              }
            }
          }
        } else if (occ1.owner !== myOwner) {
          addValidPos(f1x, f1y)
        }
      }
    }

    const otherDirs = [
      { x: 0, y: backwardY },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]
    for (const dir of otherDirs) {
      const nx = x + dir.x
      const ny = y + dir.y
      if (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6 && !isRiverCell(nx, ny)) {
        if (!isTargetEnemyHQ(nx, ny) || canOccupyHQ(piece)) {
          const norm = normalizePos(nx, ny)
          const occ = boardState[`${norm.x}-${norm.y}`]
          if (!occ || occ.owner !== myOwner) {
            addValidPos(nx, ny)
          }
        }
      }
    }
  } else if (piece === '飛行機') {
    const longDirs = [
      { x: 0, y: forwardY },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]
    for (const dir of longDirs) {
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

    const bx = x
    const by = y + backwardY
    if (bx >= 0 && bx <= 7 && by >= 0 && by <= 6 && !isRiverCell(bx, by) && !isTargetEnemyHQ(bx, by)) {
      const norm = normalizePos(bx, by)
      const occupant = boardState[`${norm.x}-${norm.y}`]
      if (!occupant || occupant.owner !== myOwner) {
        addValidPos(bx, by)
      }
    }
  } else if (piece === '工兵') {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]
    for (const dir of dirs) {
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
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]
    for (const dir of dirs) {
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