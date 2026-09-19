// 23枚型のコマ種別定義
export type PieceType =
  | 'taisho'   // 大将
  | 'chujo'    // 中将
  | 'shojo'    // 少将
  | 'taisa'    // 大佐
  | 'chusa'    // 中佐
  | 'shosa'    // 少佐
  | 'taii'     // 大尉
  | 'chui'     // 中尉
  | 'shoi'     // 少尉
  | 'kohei'    // 工兵
  | 'kikou'    // 騎兵
  | 'tanku'    // タンク
  | 'hikoki'   // ヒコーキ
  | 'spy'      // スパイ
  | 'jira'     // 地雷
  | 'gunki'    // 軍旗

export type Player = 'player1' | 'player2'

export interface Piece {
  id: string
  type: PieceType
  owner: Player
  isFaceUp: boolean
}

export const PIECE_LABELS: Record<PieceType, string> = {
  taisho: '大将',
  chujo: '中将',
  shojo: '少将',
  taisa: '大佐',
  chusa: '中佐',
  shosa: '少佐',
  taii: '大尉',
  chui: '中尉',
  shoi: '少尉',
  kohei: '工兵',
  kikou: '騎兵',
  tanku: 'タンク',
  hikoki: 'ヒコーキ',
  spy: 'スパイ',
  jira: '地雷',
  gunki: '軍旗',
}

// 突入口列 (x=2, x=5)
export const ENTRY_COLUMNS = [2, 5]

export function isRiverCell(x: number, y: number): boolean {
  return y === 3 && !ENTRY_COLUMNS.includes(x)
}

export function isEntryCell(x: number, y: number): boolean {
  return y === 3 && ENTRY_COLUMNS.includes(x)
}

export function isHQCell(x: number, y: number): boolean {
  return (y === 0 || y === 6) && (x === 3 || x === 4)
}

export function isEnemyHQCell(x: number, y: number, myRole: Player): boolean {
  return myRole === 'player1'
    ? y === 6 && (x === 3 || x === 4)
    : y === 0 && (x === 3 || x === 4)
}

/**
 * 本部（総司令部）を占領できるコマかどうかの判定
 * 将校（大将〜少尉）および工兵のみ占領可能
 */
export function canOccupyHQ(pieceType: PieceType): boolean {
  const allowedPieces: PieceType[] = [
    'taisho', 'chujo', 'shojo',
    'taisa', 'chusa', 'shosa',
    'taii', 'chui', 'shoi',
    'kohei'
  ]
  return allowedPieces.includes(pieceType)
}

export type BattleResult = 'attacker' | 'defender' | 'both_draw'

export function judgeBattle(attacker: PieceType, defender: PieceType): BattleResult {
  if (attacker === defender) return 'both_draw'

  if (attacker === 'kohei') {
    if (defender === 'jira' || defender === 'spy' || defender === 'tanku') return 'attacker'
  }
  if (defender === 'kohei' && attacker === 'tanku') return 'defender'

  if (defender === 'jira') {
    if (attacker === 'kohei' || attacker === 'hikoki') return 'attacker'
    return 'defender'
  }

  if (attacker === 'spy') return defender === 'taisho' ? 'attacker' : 'defender'
  if (defender === 'spy') return attacker === 'taisho' ? 'defender' : 'attacker'

  const rank: Record<PieceType, number> = {
    taisho: 12,
    chujo: 11,
    shojo: 10,
    taisa: 9,
    chusa: 8,
    shosa: 7,
    taii: 6,
    chui: 5,
    shoi: 4,
    tanku: 8,
    kikou: 3,
    hikoki: 9,
    kohei: 2,
    spy: 1,
    jira: 0,
    gunki: 0,
  }

  const aRank = rank[attacker] ?? 0
  const dRank = rank[defender] ?? 0

  if (aRank > dRank) return 'attacker'
  if (aRank < dRank) return 'defender'
  return 'both_draw'
}

export function isValidMove(
  pieceType: PieceType,
  owner: Player,
  from: { x: number; y: number },
  to: { x: number; y: number },
  boardState: Record<string, { type: PieceType; owner: Player }>
): boolean {
  if (pieceType === 'jira' || pieceType === 'gunki') return false

  // 川マスへの移動不可
  if (isRiverCell(to.x, to.y)) return false

  // 敵の本部へは、占領権限のあるコマ（将校・工兵）しか進入不可
  if (isEnemyHQCell(to.x, to.y, owner) && !canOccupyHQ(pieceType)) {
    return false
  }

  const dx = to.x - from.x
  const dy = to.y - from.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (dx === 0 && dy === 0) return false

  const forwardY = owner === 'player1' ? 1 : -1
  const forwardDy = dy * forwardY

  if (pieceType === 'hikoki') {
    if (absDx === 0 && absDy > 0) return true
    if (absDx === 1 && absDy === 0) return true
    return false
  }

  if (pieceType === 'kohei') {
    if (absDx > 0 && absDy > 0) return false
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1
    let curX = from.x + stepX
    let curY = from.y + stepY

    while (curX !== to.x || curY !== to.y) {
      if (isRiverCell(curX, curY) || boardState[`${curX}-${curY}`]) return false
      curX += stepX
      curY += stepY
    }
    return true
  }

  if (pieceType === 'tanku' || pieceType === 'kikou') {
    if (absDx === 0 && forwardDy >= 1 && forwardDy <= 2) return true
    if (absDx === 0 && forwardDy === -1) return true
    if (absDx === 1 && absDy === 0) return true
    return false
  }

  if (absDx + absDy === 1) return true

  return false
}