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

// 総司令部を占領可能か判定
export function canOccupyHQ(piece: PieceType): boolean {
  const cannot = ['地雷', '軍旗', '飛行機', 'タンク']
  return !cannot.includes(piece)
}

// 駒の移動可能範囲を計算する関数
export function getValidAdjacentPositions(
  x: number,
  y: number,
  piece: PieceType,
  boardState: Record<string, { type: PieceType; owner: string }>,
  myOwner: string
): Position[] {
  if (piece === '地雷' || piece === '軍旗') return []

  const valid: Position[] = []
  const directions = [
    { x: 0, y: -1 }, // 上
    { x: 0, y: 1 },  // 下
    { x: -1, y: 0 }, // 左
    { x: 1, y: 0 },  // 右
  ]

  // 直線移動駒（飛行機・工兵・タンク）
  if (piece === '飛行機' || piece === '工兵' || piece === 'タンク') {
    for (const dir of directions) {
      let nx = x + dir.x
      let ny = y + dir.y
      while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
        const targetKey = `${nx}-${ny}`
        const occupant = boardState[targetKey]

        if (!occupant) {
          valid.push({ x: nx, y: ny })
        } else {
          if (occupant.owner !== myOwner) {
            valid.push({ x: nx, y: ny })
          }
          break
        }

        if (piece !== '飛行機' && piece !== '工兵') break
        nx += dir.x
        ny += dir.y
      }
    }
  } else {
    // 通常駒（上下左右1マス）
    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      if (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 6) {
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

// 戦闘勝敗判定関数
export function judgeBattle(
  attacker: PieceType,
  defender: PieceType
): 'attacker' | 'defender' | 'draw' {
  if (attacker === defender) return 'draw'

  // 地雷判定
  if (defender === '地雷') {
    if (attacker === '工兵' || attacker === '飛行機') return 'attacker'
    return 'defender'
  }

  // スパイ判定（大将にのみ勝利）
  if (attacker === 'スパイ') {
    if (defender === '大将') return 'attacker'
    return 'defender'
  }
  if (defender === 'スパイ') {
    if (attacker === '大将') return 'defender'
    return 'attacker'
  }

  // 階級順位表
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