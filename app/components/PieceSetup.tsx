'use client'

import { useState } from 'react'
import { PieceType, ENTRY_COLUMNS } from '@/app/types/game'

const INITIAL_PIECES: { type: PieceType; label: string; count: number }[] = [
  { type: 'taisho', label: '大将', count: 1 },
  { type: 'chujo', label: '中将', count: 1 },
  { type: 'shojo', label: '少将', count: 1 },
  { type: 'taisa', label: '大佐', count: 1 },
  { type: 'chusa', label: '中佐', count: 1 },
  { type: 'shosa', label: '少佐', count: 1 },
  { type: 'taii', label: '大尉', count: 2 },
  { type: 'chui', label: '中尉', count: 2 },
  { type: 'shoi', label: '少尉', count: 2 },
  { type: 'kohei', label: '工兵', count: 2 },
  { type: 'kikou', label: '騎兵', count: 1 },
  { type: 'tanku', label: 'タンク', count: 2 },
  { type: 'hikoki', label: 'ヒコーキ', count: 2 },
  { type: 'spy', label: 'スパイ', count: 1 },
  { type: 'jira', label: '地雷', count: 2 },
  { type: 'gunki', label: '軍旗', count: 1 },
]

interface PieceSetupProps {
  onSetupComplete: (board: Record<string, PieceType>) => void
  onCancel: () => void
}

export default function PieceSetup({ onSetupComplete, onCancel }: PieceSetupProps) {
  const [board, setBoard] = useState<Record<string, PieceType>>({})
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null)

  const getPlacedCount = (type: PieceType) => {
    return Object.values(board).filter((p) => p === type).length
  }

  const handleCellClick = (x: number, y: number) => {
    const key = `${x}-${y}`
    const isEntryFront = y === 2 && ENTRY_COLUMNS.includes(x)

    if (selectedPieceType) {
      if (isEntryFront && (selectedPieceType === 'jira' || selectedPieceType === 'gunki')) {
        alert('突入口の直前に「地雷」や「軍旗」を配置することはできません！')
        return
      }

      const pieceConfig = INITIAL_PIECES.find((p) => p.type === selectedPieceType)
      if (pieceConfig && getPlacedCount(selectedPieceType) < pieceConfig.count) {
        setBoard((prev) => ({ ...prev, [key]: selectedPieceType }))
      }
    } else if (board[key]) {
      setBoard((prev) => {
        const newBoard = { ...prev }
        delete newBoard[key]
        return newBoard
      })
    }
  }

  const totalPiecesToPlace = INITIAL_PIECES.reduce((sum, p) => sum + p.count, 0)
  const currentPlacedTotal = Object.keys(board).length
  const isComplete = currentPlacedTotal === totalPiecesToPlace

  return (
    <div className="space-y-8">
      <div className="bg-[#fcf8f2] border-4 border-[#c9a063] rounded-lg p-4 md:p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b-2 border-[#c9a063] pb-2">
          <h3 className="text-xl font-extrabold text-[#b71c1c]">自陣 コマ配置 (23枚型)</h3>
          <p className="text-sm font-bold text-gray-700">
            配置済み: <span className="text-[#b71c1c] text-lg">{currentPlacedTotal}</span> / {totalPiecesToPlace}
          </p>
        </div>

        {/* 自陣盤面 (8列 × 3行) */}
        <div className="mb-6 flex justify-center overflow-x-auto">
          <div className="grid grid-cols-8 gap-1 bg-[#2a1a08] p-2 rounded-lg border-2 border-[#c9a063] shadow-inner">
            {[2, 1, 0].map((y) =>
              [0, 1, 2, 3, 4, 5, 6, 7].map((x) => {
                const key = `${x}-${y}`
                const pieceType = board[key]
                const pieceInfo = INITIAL_PIECES.find((p) => p.type === pieceType)
                const isEntryFront = y === 2 && ENTRY_COLUMNS.includes(x)
                const isHQ = y === 0 && (x === 3 || x === 4)

                return (
                  <button
                    key={key}
                    onClick={() => handleCellClick(x, y)}
                    className={`w-10 h-10 md:w-12 md:h-12 flex flex-col items-center justify-center rounded border transition-all ${
                      pieceType
                        ? 'bg-[#f5e6cb] border-[#8c6d3b] text-black shadow font-extrabold'
                        : isHQ
                        ? 'bg-[#5c1d1d] border-red-500 border-2 text-white font-bold'
                        : isEntryFront
                        ? 'bg-[#4a2e18] border-yellow-600 border-2 hover:bg-[#5c3a1e]'
                        : 'bg-[#3a2817] border-[#5c4228] hover:bg-[#4a341e]'
                    }`}
                  >
                    {pieceInfo ? (
                      <span className="text-[11px] md:text-xs tracking-tighter">{pieceInfo.label}</span>
                    ) : isHQ ? (
                      <span className="text-[8px] text-red-300 font-bold leading-tight">本部</span>
                    ) : isEntryFront ? (
                      <span className="text-[8px] text-yellow-500 font-bold">突入口前</span>
                    ) : (
                      <span className="text-[9px] text-[#7c5c3c]">{x},{y}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 手札 */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-600 mb-2">配置するコマを選択（タップして配置）:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {INITIAL_PIECES.map((piece) => {
              const placed = getPlacedCount(piece.type)
              const remaining = piece.count - placed
              const isSelected = selectedPieceType === piece.type

              return (
                <button
                  key={piece.type}
                  disabled={remaining === 0}
                  onClick={() => setSelectedPieceType(isSelected ? null : piece.type)}
                  className={`px-2.5 py-1.5 rounded border font-bold text-xs flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-[#b71c1c] text-white border-black scale-105 shadow-md'
                      : remaining === 0
                      ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-black border-[#c9a063] hover:bg-[#f5e6cb]'
                  }`}
                >
                  <span>{piece.label}</span>
                  <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-white text-[#b71c1c]' : 'bg-gray-100 text-gray-700'}`}>
                    {remaining}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-4 justify-center pt-2 border-t border-gray-300">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold border border-gray-400"
          >
            戻る
          </button>
          <button
            disabled={!isComplete}
            onClick={() => onSetupComplete(board)}
            className="px-8 py-2 rounded bg-[#b71c1c] hover:bg-[#8e0000] text-white font-bold border-2 border-black shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            配置完了・準備OK
          </button>
        </div>
      </div>

      <div className="bg-white border-4 border-[#c9a063] rounded-lg p-4 shadow-xl">
        <h4 className="text-lg font-bold text-[#b71c1c] mb-3 text-center border-b pb-2">
          📜 23枚型 駒の動き・強さ早見表
        </h4>
        <div className="flex justify-center">
          <img
            src="/images/rule.webp"
            alt="23枚型 駒の動き方"
            className="max-w-full h-auto rounded border border-gray-300 shadow-sm"
            onError={(e) => {
              e.currentTarget.src = "/images/rule.png"
            }}
          />
        </div>
      </div>
    </div>
  )
}