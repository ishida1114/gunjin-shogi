'use client'

import {
  Piece,
  Position,
  isRiverCell,
  isEntryCell,
} from '@/app/types/game'

export interface GameBoardProps {
  pieces: Piece[]
  selectedPiece: Piece | null
  validMoves: Position[]
  lastMove: { from: Position; to: Position } | null
  onCellClick: (x: number, y: number) => void
}

export default function GameBoard({
  pieces,
  selectedPiece,
  validMoves,
  lastMove,
  onCellClick,
}: GameBoardProps) {
  const getPieceAt = (x: number, y: number): Piece | undefined => {
    if ((y === 0 || y === 6) && x === 4) {
      return pieces.find((p) => p.position.x === 3 && p.position.y === y)
    }
    return pieces.find((p) => p.position.x === x && p.position.y === y)
  }

  const isValidMoveCell = (x: number, y: number): boolean => {
    return validMoves.some((m) => m.x === x && m.y === y)
  }

  const isLastMoveCell = (x: number, y: number): boolean => {
    if (!lastMove) return false
    return (
      (lastMove.from.x === x && lastMove.from.y === y) ||
      (lastMove.to.x === x && lastMove.to.y === y)
    )
  }

  return (
    <div className="max-w-xl mx-auto bg-[#b8860b] p-3 md:p-4 rounded-xl border-4 border-[#5c3713] shadow-2xl">
      <div className="grid grid-cols-8 gap-1 bg-[#d2b48c] p-2 rounded-lg border-2 border-[#8b5a2b] shadow-inner">
        {[0, 1, 2, 3, 4, 5, 6].map((y) =>
          [7, 6, 5, 4, 3, 2, 1, 0].map((x) => {
            if ((y === 0 || y === 6) && x === 4) return null

            const piece = getPieceAt(x, y)
            const isSelected = selectedPiece?.position.x === x && selectedPiece?.position.y === y
            const isValidMove = isValidMoveCell(x, y) || (isValidMoveCell(4, y) && (y===0 || y===6) && x===3)
            const isLastMove = isLastMoveCell(x, y) || (isLastMoveCell(4, y) && (y===0 || y===6) && x===3)

            const isRiver = isRiverCell(x, y)
            const isEntry = isEntryCell(x, y)
            const isEnemyHQ = y === 0 && x === 3
            const isMyHQ = y === 6 && x === 3

            return (
              <button
                key={`${x}-${y}`}
                // 修正５：本部への移動クリック時、有効な座標(3または4)を動的に判別して通信する
                onClick={() => {
                  let targetX = x
                  if (isEnemyHQ || isMyHQ) {
                    if (isValidMoveCell(3, y)) targetX = 3
                    else if (isValidMoveCell(4, y)) targetX = 4
                    else targetX = 3 // 移動時以外
                  }
                  onCellClick(targetX, y)
                }}
                className={`relative h-12 md:h-14 rounded flex flex-col items-center justify-center font-black text-xs md:text-sm transition-all border shadow-sm ${
                  isEnemyHQ || isMyHQ ? 'col-span-2' : '' 
                } ${
                  isSelected
                    ? 'bg-amber-300 border-amber-600 scale-105 z-20 ring-2 ring-amber-500'
                    : isValidMove
                    ? 'bg-emerald-200 border-emerald-500 ring-2 ring-emerald-400 animate-pulse z-10'
                    : isLastMove
                    ? 'bg-amber-100 border-amber-400'
                    : piece
                    ? 'bg-[#fcf8f2] border-[#a87c4f]'
                    : isRiver
                    ? 'bg-sky-900/40 text-sky-200 border-sky-700/50'
                    : isEntry
                    ? 'bg-amber-600/30 text-amber-950 border-amber-600/60'
                    : isEnemyHQ || isMyHQ
                    ? 'bg-amber-950/20 text-amber-950 border-amber-800/40'
                    : 'bg-[#f4e8d1] border-[#c9a063] hover:bg-[#e8d6b5]'
                }`}
              >
                {piece ? (
                  <div
                    className={`w-full h-full rounded flex items-center justify-center font-black text-xs md:text-sm shadow-md border ${
                      !piece.isRevealed
                        ? 'bg-gray-900 text-gray-200 border-gray-700'
                        : piece.player === 'player'
                        ? 'bg-[#b71c1c] text-white border-black'
                        : 'bg-blue-800 text-white border-black'
                    }`}
                  >
                    {piece.isRevealed ? piece.type : '敵駒'}
                  </div>
                ) : (
                  <>
                    {isRiver && <span className="text-[10px] opacity-60">川</span>}
                    {isEntry && <span className="text-[10px] font-bold text-amber-900">突入口</span>}
                    {isEnemyHQ && <span className="text-[10px] opacity-60">敵軍総司令部</span>}
                    {isMyHQ && <span className="text-[10px] opacity-60">自軍総司令部</span>}
                  </>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}