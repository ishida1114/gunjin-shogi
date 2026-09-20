'use client'

import { useState } from 'react'
import { PieceType } from '@/app/types/game'

interface PieceSetupProps {
  onComplete: (board: Record<string, PieceType>) => void
  onCancel: () => void
}

// 弐拾参枚型の正しい構成（飛行機は2つ）
const PIECE_LIST: PieceType[] = [
  '大将', '中将', '少将',
  '大佐', '中佐', '少佐',
  '大尉', '中尉', '少尉', '少尉',
  '飛行機', '飛行機', 'タンク', 'タンク', '騎兵', '騎兵',
  '工兵', '工兵',
  'スパイ',
  '地雷', '地雷',
  '軍旗', '少尉' 
] // 合計23枚

export default function PieceSetup({ onComplete, onCancel }: PieceSetupProps) {
  const createInitialBoard = (): Record<string, PieceType> => {
    const shuffled = [...PIECE_LIST].sort(() => Math.random() - 0.5)
    const board: Record<string, PieceType> = {}
    let idx = 0
    for (let y = 4; y <= 6; y++) {
      for (let x = 0; x <= 7; x++) {
        // 総司令部の片側(4,6)は配置スキップ（実質3,6との結合として扱うため）
        if (y === 6 && x === 4) continue
        if (idx < shuffled.length) {
          board[`${x}-${y}`] = shuffled[idx++]
        }
      }
    }
    return board
  }

  const [board, setBoard] = useState<Record<string, PieceType>>(createInitialBoard)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const handleRandomize = () => {
    setBoard(createInitialBoard())
    setSelectedKey(null)
  }

  const handleCellClick = (x: number, y: number) => {
    // 司令部結合部（4,6）のクリックは（3,6）へ転送
    if (y === 6 && x === 4) {
      x = 3
    }
    
    const key = `${x}-${y}`
    if (!selectedKey) {
      if (board[key]) {
        setSelectedKey(key)
      }
    } else {
      if (selectedKey === key) {
        setSelectedKey(null)
      } else {
        const newBoard = { ...board }
        const p1 = newBoard[selectedKey]
        const p2 = newBoard[key]

        if (p1) newBoard[key] = p1
        else delete newBoard[key]

        if (p2) newBoard[selectedKey] = p2
        else delete newBoard[selectedKey]

        setBoard(newBoard)
        setSelectedKey(null)
      }
    }
  }

  const isComplete = Object.keys(board).length === PIECE_LIST.length

  return (
    <div className="max-w-xl mx-auto bg-[#fcf8f2] border-4 border-[#c9a063] rounded-xl p-4 shadow-xl">
      <h2 className="text-lg font-black text-[#b71c1c] text-center mb-2 border-b border-[#c9a063] pb-2">
        🚩 陣形配置
      </h2>
      <p className="text-xs font-bold text-gray-700 text-center mb-4">
        コマを選択し、別のマスをタップすると配置を入れ替えられます。
      </p>

      <div className="bg-[#d2b48c] p-3 rounded-lg border-2 border-[#a87c4f] shadow-inner mb-4">
        <div className="grid grid-cols-8 gap-1">
          {[4, 5, 6].map((y) =>
            [7, 6, 5, 4, 3, 2, 1, 0].map((x) => {
              // 4列目は描画スキップ（3列目でcol-span-2を使って描画する）
              if (y === 6 && x === 4) return null
              
              const key = `${x}-${y}`
              const piece = board[key]
              const isSelected = selectedKey === key
              const isHQ = y === 6 && x === 3

              return (
                <button
                  key={key}
                  onClick={() => handleCellClick(x, y)}
                  className={`h-12 rounded flex flex-col items-center justify-center font-black text-xs transition-all shadow-sm border ${
                    isHQ ? 'col-span-2' : '' // 総司令部は2マス分の幅
                  } ${
                    isSelected
                      ? 'bg-amber-300 border-amber-600 scale-105 z-10 ring-2 ring-amber-500'
                      : piece
                      ? 'bg-[#b71c1c] text-white border-black hover:bg-[#8e0000]'
                      : isHQ
                      ? 'bg-amber-900/20 text-amber-900 border-amber-700/50'
                      : 'bg-[#f4e8d1] border-[#c9a063] hover:bg-[#e8d6b5]'
                  }`}
                >
                  {piece ? (
                    <span>{piece}</span>
                  ) : isHQ ? (
                    <span className="text-[9px] opacity-60">総司令部</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">空</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded text-xs border border-gray-400"
        >
          ← 撤退
        </button>
        <button
          onClick={handleRandomize}
          className="bg-amber-700 hover:bg-amber-800 text-white font-black px-4 py-2 rounded text-xs border border-black shadow"
        >
          🎲 ランダム配置
        </button>
        <button
          onClick={() => isComplete && onComplete(board)}
          disabled={!isComplete}
          className={`font-black px-5 py-2 rounded text-xs border border-black shadow transition-transform ${
            isComplete
              ? 'bg-[#b71c1c] hover:bg-[#8e0000] text-white hover:scale-105'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          ⚔️ 出陣
        </button>
      </div>
    </div>
  )
}