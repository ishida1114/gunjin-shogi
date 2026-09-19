'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { PieceType, judgeBattle, isValidMove, PIECE_LABELS, isRiverCell, isEntryCell, isHQCell, isEnemyHQCell, canOccupyHQ } from '@/app/types/game'
import { generateAiBoard, processAiTurn } from '@/app/lib/ai'

interface GameBoardProps {
  roomId: string
  user: { id: string; name: string }
  role: 'player1' | 'player2'
  myBoard: Record<string, PieceType>
  onLeaveGame: () => void
}

export default function GameBoard({ roomId, user, role, myBoard, onLeaveGame }: GameBoardProps) {
  const [room, setRoom] = useState<any>(null)
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null)
  const [boardState, setBoardState] = useState<Record<string, { type: PieceType; owner: 'player1' | 'player2' }>>({})
  const [hasScoreUpdated, setHasScoreUpdated] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
  
  const isAiThinkingRef = useRef(false)

  useEffect(() => {
    initGame()

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new)
            syncBoardFromRoom(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  useEffect(() => {
    const isAiTurn =
      room?.status === 'playing' &&
      room?.player2_id === 'ai_player' &&
      room?.current_turn === 'player2'

    if (isAiTurn && !isAiThinkingRef.current) {
      isAiThinkingRef.current = true
      setIsAiThinking(true)

      const timer = setTimeout(async () => {
        try {
          const { newP1Board, newP2Board, winner } = processAiTurn(
            room.player1_board || {},
            room.player2_board || {}
          )

          await supabase
            .from('game_rooms')
            .update({
              player1_board: newP1Board,
              player2_board: newP2Board,
              current_turn: 'player1',
              winner: winner,
              status: winner ? 'finished' : 'playing',
            })
            .eq('id', roomId)
        } catch (e) {
          console.error('AI着手エラー:', e)
        } finally {
          isAiThinkingRef.current = false
          setIsAiThinking(false)
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [room?.current_turn, room?.status, room?.player2_id])

  const handleStartAiBattle = async () => {
    if (!confirm('対戦相手の代わりに「電脳参謀（AI）」と対戦を開始しますか？')) return

    const aiBoard = generateAiBoard()

    await supabase
      .from('game_rooms')
      .update({
        player2_id: 'ai_player',
        player2_name: '電脳参謀（AI）',
        player2_board: aiBoard,
        player2_ready: true,
        status: 'playing',
      })
      .eq('id', roomId)
  }

  useEffect(() => {
    if (room?.status === 'finished' && room?.winner === role && !hasScoreUpdated) {
      setHasScoreUpdated(true)
      addWinScore()
    }
  }, [room?.status, room?.winner, role, hasScoreUpdated])

  const addWinScore = async () => {
    try {
      const { data: currentRecord } = await supabase
        .from('gunjin_scores')
        .select('wins')
        .eq('user_id', user.id)
        .maybeSingle()

      const currentWins = currentRecord?.wins ?? 0

      await supabase
        .from('gunjin_scores')
        .upsert(
          {
            user_id: user.id,
            user_name: user.name,
            wins: currentWins + 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
    } catch (e) {
      console.error('勝ち点処理例外:', e)
    }
  }

  const initGame = async () => {
    const { data: currentRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    const formattedBoard: Record<string, PieceType> = {}
    Object.entries(myBoard).forEach(([key, type]) => {
      const [xStr, yStr] = key.split('-')
      const x = parseInt(xStr)
      const y = parseInt(yStr)
      const finalY = role === 'player1' ? y : 6 - y
      const finalX = role === 'player1' ? x : 7 - x
      formattedBoard[`${finalX}-${finalY}`] = type
    })

    const isOpponentReady = role === 'player1' ? currentRoom?.player2_ready : currentRoom?.player1_ready
    const nextStatus = isOpponentReady ? 'playing' : (currentRoom?.status === 'waiting' ? 'setup' : currentRoom?.status || 'setup')

    const updateData = role === 'player1'
      ? { player1_board: formattedBoard, player1_ready: true, status: nextStatus }
      : { player2_board: formattedBoard, player2_ready: true, status: nextStatus }

    const { data } = await supabase
      .from('game_rooms')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single()

    if (data) {
      setRoom(data)
      syncBoardFromRoom(data)
    }
  }

  const syncBoardFromRoom = (roomData: any) => {
    const newBoard: Record<string, { type: PieceType; owner: 'player1' | 'player2' }> = {}

    if (roomData.player1_board) {
      Object.entries(roomData.player1_board).forEach(([key, type]) => {
        newBoard[key] = { type: type as PieceType, owner: 'player1' }
      })
    }
    if (roomData.player2_board) {
      Object.entries(roomData.player2_board).forEach(([key, type]) => {
        newBoard[key] = { type: type as PieceType, owner: 'player2' }
      })
    }
    setBoardState(newBoard)
  }

  useEffect(() => {
    if (room && room.player1_ready && room.player2_ready && room.status !== 'playing' && room.status !== 'finished') {
      supabase
        .from('game_rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
    }
  }, [room?.player1_ready, room?.player2_ready, room?.status])

  const handleResign = async () => {
    if (!room || room.status !== 'playing') return
    if (!confirm('本当に投了しますか？（相手陣営の勝利となります）')) return

    const opponentRole = role === 'player1' ? 'player2' : 'player1'

    await supabase
      .from('game_rooms')
      .update({
        winner: opponentRole,
        status: 'finished',
      })
      .eq('id', roomId)
  }

  const handleCellClick = async (x: number, y: number) => {
    if (!room || room.status !== 'playing' || room.current_turn !== role) return

    if (isRiverCell(x, y)) return

    const key = `${x}-${y}`
    const targetCell = boardState[key]

    if (targetCell && targetCell.owner === role) {
      setSelectedCell({ x, y })
      return
    }

    if (selectedCell) {
      const fromKey = `${selectedCell.x}-${selectedCell.y}`
      const movingPiece = boardState[fromKey]
      if (!movingPiece) return

      // 敵本部への占領可否チェック
      const isTargetEnemyHQ = isEnemyHQCell(x, y, role)
      if (isTargetEnemyHQ && !canOccupyHQ(movingPiece.type)) {
        alert('「ヒコーキ」「タンク」「騎兵」「スパイ」は総司令部（本部）を占領できません！（将校・工兵のみ占領可能）')
        return
      }

      const canMove = isValidMove(
        movingPiece.type,
        role,
        { x: selectedCell.x, y: selectedCell.y },
        { x, y },
        boardState
      )

      if (!canMove) {
        alert('その場所へは駒の動き方ルールにより移動できません。')
        return
      }

      const p1Board = { ...(room.player1_board || {}) }
      const p2Board = { ...(room.player2_board || {}) }

      const myBoardObj = role === 'player1' ? p1Board : p2Board
      const enemyBoardObj = role === 'player1' ? p2Board : p1Board

      delete myBoardObj[fromKey]

      let winner: string | null = null

      if (targetCell) {
        let defenderTypeForBattle = targetCell.type

        if (targetCell.type === 'gunki') {
          const defenderOwner = targetCell.owner
          const backY = defenderOwner === 'player1' ? y - 1 : y + 1
          const backKey = `${x}-${backY}`
          const backPiece = boardState[backKey]

          if (backPiece && backPiece.owner === defenderOwner) {
            defenderTypeForBattle = backPiece.type
          }
        }

        const battleRes = judgeBattle(movingPiece.type, defenderTypeForBattle)

        if (battleRes === 'attacker') {
          myBoardObj[key] = movingPiece.type
          delete enemyBoardObj[key]
          if (targetCell.type === 'gunki' || isTargetEnemyHQ) winner = role
        } else if (battleRes === 'defender') {
          delete enemyBoardObj[fromKey]
        } else {
          delete enemyBoardObj[key]
          if (targetCell.type !== 'gunki') {
            delete myBoardObj[fromKey]
          }
        }
      } else {
        myBoardObj[key] = movingPiece.type
        if (isTargetEnemyHQ) winner = role
      }

      const nextTurn = role === 'player1' ? 'player2' : 'player1'

      await supabase
        .from('game_rooms')
        .update({
          player1_board: p1Board,
          player2_board: p2Board,
          current_turn: nextTurn,
          winner: winner,
          status: winner ? 'finished' : 'playing',
        })
        .eq('id', roomId)

      setSelectedCell(null)
    }
  }

  const isMyTurn = room?.current_turn === role

  return (
    <div className="space-y-8">
      <div className="bg-[#fcf8f2] border-4 border-[#c9a063] rounded-lg p-4 md:p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b-2 border-[#c9a063] pb-3">
          <div>
            <h3 className="text-xl font-extrabold text-[#b71c1c]">{room?.room_name || '対戦室'}</h3>
            <p className="text-xs text-gray-700 font-bold mt-0.5">
              陣営: <span className="text-[#b71c1c]">{role === 'player1' ? '先軍 (Player1)' : '後軍 (Player2)'}</span>
              {room?.player2_id === 'ai_player' && <span className="ml-2 font-bold text-blue-800">VS 電脳参謀（AI）</span>}
            </p>
          </div>

          {room?.status === 'playing' && (
            <div className={`px-4 py-1.5 rounded-full font-extrabold text-sm border shadow ${
              isMyTurn ? 'bg-[#b71c1c] text-white border-black animate-pulse' : 'bg-gray-200 text-gray-600 border-gray-400'
            }`}>
              {isMyTurn ? '⚔️ 手番：あなた' : room?.player2_id === 'ai_player' ? '🤖 AI参謀が思考中...' : '⏳ 相手の長考中...'}
            </div>
          )}

          <div className="flex gap-2">
            {room?.status === 'playing' && (
              <button
                onClick={handleResign}
                className="bg-[#b71c1c] hover:bg-[#8e0000] text-white font-bold text-xs px-3 py-1.5 rounded border border-black shadow"
              >
                投了
              </button>
            )}
            <button
              onClick={onLeaveGame}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs px-3 py-1.5 rounded border border-gray-400"
            >
              退室
            </button>
          </div>
        </div>

        {/* ⚔️ 勝敗条件案内 */}
        <div className="bg-[#fff9ef] border-2 border-[#c9a063] rounded-lg p-3 mb-4 shadow-sm text-xs">
          <h4 className="font-extrabold text-[#b71c1c] mb-1.5 flex items-center gap-1 text-sm">
            <span>📜</span> 【勝利条件】（いずれか1つ達成で勝利）
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-gray-800 font-bold list-disc list-inside">
            <li>敵の<span className="text-[#b71c1c]">「軍旗」</span>を攻撃・奪取する</li>
            <li>敵の<span className="text-[#b71c1c]">「総司令部（本部）」</span>を占領する<span className="text-[10px] text-gray-600 font-normal">（※将校・工兵のみ）</span></li>
            <li>敵プレイヤーが<span className="text-[#b71c1c]">「投了」</span>する</li>
            <li>敵の全コマを<span className="text-[#b71c1c]">全滅</span>（移動不可状態）にする</li>
          </ul>
        </div>

        {/* 相手待機中 ＆ AI切替案内 */}
        {(room?.status === 'setup' || room?.status === 'waiting') && (
          <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded text-center mb-4 space-y-3">
            <p className="font-bold text-yellow-900 animate-pulse">対戦相手の参戦・配置完了を待っています...</p>
            <div className="pt-2 border-t border-yellow-200">
              <p className="text-xs text-gray-600 mb-2">対戦相手が来ない場合はAIと即座に対戦を開始できます：</p>
              <button
                onClick={handleStartAiBattle}
                className="bg-[#b71c1c] hover:bg-[#8e0000] text-white font-extrabold text-sm px-6 py-2 rounded-lg border-2 border-black shadow-md transition-transform hover:scale-105"
              >
                🤖 「電脳参謀（AI）」と対戦を開始する (YES)
              </button>
            </div>
          </div>
        )}

        {/* 勝敗判定表示 */}
        {room?.status === 'finished' && (
          <div className="bg-[#b71c1c] text-white p-4 rounded text-center mb-4 border-2 border-black shadow-lg">
            <h4 className="text-2xl font-black mb-1">
              {room.winner === role ? '🎉 勝 刻（勝利！ 勝ち点+1）' : '💀 敗 北（投了/全滅）'}
            </h4>
            <p className="text-sm">
              {room.winner === role ? '見事、勝利を収めました！勝ち点1を獲得！' : '無念...相手陣営の勝利です。'}
            </p>
          </div>
        )}

        {/* 8×7 正方形将棋盤 */}
        <div className="flex justify-center mb-6 overflow-x-auto">
          <div className="grid grid-cols-8 gap-1 bg-[#2a1a08] p-2 rounded-lg border-2 border-[#c9a063] shadow-inner">
            {(role === 'player1' ? [6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6]).map((y) =>
              (role === 'player1' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]).map((x) => {
                const key = `${x}-${y}`
                const cellData = boardState[key]
                const isSelected = selectedCell?.x === x && selectedCell?.y === y
                const isMine = cellData?.owner === role
                const isRiver = isRiverCell(x, y)
                const isEntry = isEntryCell(x, y)
                const isHQ = isHQCell(x, y)

                return (
                  <button
                    key={key}
                    disabled={isRiver}
                    onClick={() => handleCellClick(x, y)}
                    className={`w-10 h-10 md:w-12 md:h-12 flex flex-col items-center justify-center rounded border transition-all ${
                      isSelected
                        ? 'bg-yellow-300 border-yellow-600 scale-105 shadow-lg z-10'
                        : cellData
                        ? isMine
                          ? 'bg-[#f0dfc0] border-2 border-[#8c6d3b] text-black shadow-md'
                          : 'bg-[#801818] border-2 border-black text-[#f0e0c0] shadow-md'
                        : isRiver
                        ? 'bg-[#1a3a5c] border-[#0f243a] cursor-not-allowed opacity-90'
                        : isHQ
                        ? 'bg-[#5c1d1d] border-red-500 border-2 text-white font-bold'
                        : isEntry
                        ? 'bg-[#4a2e18] border-yellow-600 border-2 hover:bg-[#5c3a1e]'
                        : 'bg-[#3a2817] border-[#5c4228] hover:bg-[#4a341e]'
                    }`}
                  >
                    {cellData ? (
                      isMine ? (
                        <span className="text-[11px] md:text-xs font-black tracking-tighter leading-tight text-center">
                          {PIECE_LABELS[cellData.type]}
                        </span>
                      ) : (
                        <span className="text-[10px] md:text-xs font-black tracking-widest text-red-200">
                          敵駒
                        </span>
                      )
                    ) : isRiver ? (
                      <span className="text-[10px] text-blue-300 font-extrabold tracking-widest">川</span>
                    ) : isHQ ? (
                      <span className="text-[8px] text-red-300 font-bold leading-tight">本部</span>
                    ) : isEntry ? (
                      <span className="text-[8px] text-yellow-500 font-bold">突入口</span>
                    ) : (
                      <span className="text-[8px] text-[#7c5c3c]">{x},{y}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
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