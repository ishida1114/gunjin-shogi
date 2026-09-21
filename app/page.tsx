'use client'

import { useState, useEffect, useRef } from 'react'
import LoginForm from '@/app/components/LoginForm'
import PieceSetup from '@/app/components/PieceSetup'
import GameBoard from '@/app/components/GameBoard'
import RankingModal from '@/app/components/RankingModal'
import ResultModal from '@/app/components/ResultModal'
import RuleGuide from '@/app/components/RuleGuide'
import { supabase } from '@/app/lib/supabaseClient'
import {
  Piece,
  PieceType,
  Position,
  canOccupyHQ,
  getValidAdjacentPositions,
  judgeBattle,
  getBehindPiece,
  normalizeKey,
  normalizePos,
} from '@/app/types/game'
import { generateAiBoard, processAiTurn } from '@/app/lib/ai'

interface RoomRecord {
  id: string
  room_id: string
  host_name?: string
  guest_name?: string
  user_name?: string
  status?: string
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  
  const [mode, setMode] = useState<'lobby' | 'setup' | 'playing' | 'finished'>('lobby')
  const [isOnlineMatch, setIsOnlineMatch] = useState(false)
  const [isWaitingOpponent, setIsWaitingOpponent] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [myRole, setMyRole] = useState<'player1' | 'player2'>('player1')
  const [showRanking, setShowRanking] = useState(false)

  const [showResultModal, setShowResultModal] = useState(false)
  const [isWinResult, setIsWinResult] = useState(false)
  const [gainedPoints, setGainedPoints] = useState(0)

  const [roomErrorMsg, setRoomErrorMsg] = useState('')
  const [openRooms, setOpenRooms] = useState<RoomRecord[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)

  const [p1Board, setP1Board] = useState<Record<string, PieceType>>({})
  const [p2Board, setP2Board] = useState<Record<string, PieceType>>({})

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null)
  const [turn, setTurn] = useState<'player1' | 'player2'>('player1')
  const [logs, setLogs] = useState<string[]>([])

  const [logoError, setLogoError] = useState(false)

  const channelRef = useRef<any>(null)

  const p1BoardRef = useRef(p1Board)
  const p2BoardRef = useRef(p2Board)

  useEffect(() => {
    p1BoardRef.current = p1Board
  }, [p1Board])

  useEffect(() => {
    p2BoardRef.current = p2Board
  }, [p2Board])

  const flipKey = (key: string): string => {
    const [x, y] = key.split('-').map(Number)
    return `${7 - x}-${6 - y}`
  }

  const flipPosition = (pos: Position): Position => {
    return { x: 7 - pos.x, y: 6 - pos.y }
  }

  const fetchRooms = async () => {
    if (mode !== 'lobby') return
    try {
      const { data } = await supabase
        .from('gunjin_rooms')
        .select('*')
        .order('id', { ascending: false })

      if (data) {
        const waiting = data.filter((r) => !r.status || r.status === 'waiting')
        setOpenRooms(waiting)
      }
    } catch (e) {}
  }

  useEffect(() => {
    if (mode === 'lobby') {
      fetchRooms()
      const interval = setInterval(fetchRooms, 3000)
      return () => clearInterval(interval)
    }
  }, [mode])

  useEffect(() => {
    if (!activeRoomId || !isOnlineMatch) return

    const channel = supabase.channel(`game-room-${activeRoomId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'GUEST_READY' }, ({ payload }) => {
        if (myRole === 'player1') {
          try {
            const newP2 = payload.board
            setP2Board(newP2)
            setIsWaitingOpponent(false)
            addLog('⚔️ 対戦相手が参戦し陣形を布きました！対局開始です！')

            channel.send({
              type: 'broadcast',
              event: 'SYNC_FULL_STATE',
              payload: {
                p1Board: p1BoardRef.current,
                p2Board: newP2,
                turn: 'player1',
                logs: ['⚔️ 対戦相手が参戦しました！対局開始です！'],
                isWaitingOpponent: false,
              },
            })
          } catch (e) {}
        }
      })
      .on('broadcast', { event: 'SYNC_FULL_STATE' }, ({ payload }) => {
        try {
          if (payload.p1Board) setP1Board(payload.p1Board)
          if (payload.p2Board) setP2Board(payload.p2Board)
          if (payload.turn) setTurn(payload.turn)
          if (payload.logs) setLogs(payload.logs)
          if (payload.lastMove) setLastMove(payload.lastMove)
          setIsWaitingOpponent(payload.isWaitingOpponent ?? false)

          if (payload.isFinished) {
            setMode('finished')
            const isWin = payload.winner === myRole
            saveScore(isWin)
          }
        } catch (e) {}
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeRoomId, isOnlineMatch, myRole])

  const saveScore = async (isWin: boolean) => {
    if (!user) return
    const points = isWin ? 10 : 2
    setGainedPoints(points)
    setIsWinResult(isWin)
    setShowResultModal(true)

    try {
      const localData = localStorage.getItem('gunjin_local_scores')
      const scores = localData ? JSON.parse(localData) : []
      scores.push({ user_name: user.name, points, created_at: new Date().toISOString() })
      localStorage.setItem('gunjin_local_scores', JSON.stringify(scores))
    } catch (e) {}

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      const payload: any = {
        user_name: user.name,
        points,
      }
      if (isUuid) {
        payload.user_id = user.id
      }
      await supabase.from('gunjin_scores').insert([payload])
    } catch (e) {}
  }

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 19)])
  }

  const handleStartAiSetup = () => {
    setIsOnlineMatch(false)
    setIsWaitingOpponent(false)
    setShowResultModal(false)
    setMyRole('player1')
    setTurn('player1')
    setRoomErrorMsg('')
    setMode('setup')
  }

  const handleCreateOnlineRoom = async () => {
    if (!user) return
    setRoomErrorMsg('')

    try {
      await supabase
        .from('gunjin_rooms')
        .update({ status: 'closed' })
        .eq('host_name', user.name)
        .eq('status', 'waiting')
    } catch (e) {}

    const newRoomId = Math.floor(1000 + Math.random() * 9000).toString()

    try {
      await supabase.from('gunjin_rooms').insert([
        {
          room_id: newRoomId,
          host_name: user.name,
          user_name: user.name,
          status: 'waiting',
        },
      ])
    } catch (e) {}

    setActiveRoomId(newRoomId)
    setIsHost(true)
    setMyRole('player1')
    setTurn('player1')
    setIsOnlineMatch(true)
    setIsWaitingOpponent(true)
    setShowResultModal(false)
    setMode('setup')
  }

  const handleJoinRoom = async (room: RoomRecord) => {
    if (!user) return
    setActiveRoomId(room.room_id)
    setIsHost(false)
    setMyRole('player2')
    setTurn('player1')
    setIsOnlineMatch(true)
    setIsWaitingOpponent(true)
    setShowResultModal(false)
    setRoomErrorMsg('')

    try {
      await supabase
        .from('gunjin_rooms')
        .update({ guest_name: user.name, status: 'playing' })
        .eq('room_id', room.room_id)
    } catch (e) {}

    setMode('setup')
  }

  const handleSetupComplete = (setupBoard: Record<string, PieceType>) => {
    if (isOnlineMatch) {
      if (myRole === 'player1') {
        setP1Board(setupBoard)
        setIsWaitingOpponent(true)
        setMode('playing')
        setLogs(['陣形配置が完了しました。対戦相手の参戦・配置完了を待っています…'])
      } else {
        const canonicalP2Board: Record<string, PieceType> = {}
        Object.entries(setupBoard).forEach(([k, v]) => {
          canonicalP2Board[normalizeKey(flipKey(k))] = v
        })
        setP2Board(canonicalP2Board)
        setIsWaitingOpponent(true)
        setMode('playing')
        setLogs(['陣形配置が完了しました。ホストと陣形を同期しています…'])

        if (channelRef.current) {
          try {
            channelRef.current.send({
              type: 'broadcast',
              event: 'GUEST_READY',
              payload: { board: canonicalP2Board },
            })
          } catch (e) {}
        }
      }
    } else {
      setP1Board(setupBoard)
      const aiBoard = generateAiBoard()
      setP2Board(aiBoard)
      setSelectedKey(null)
      setValidMoves([])
      setLastMove(null)
      setTurn('player1')
      setIsWaitingOpponent(false)
      setMode('playing')
      setLogs(['陣形配置が完了しました。戦端が開かれます！'])
    }
  }

  const getPiecesForBoard = (): Piece[] => {
    const list: Piece[] = []
    
    Object.entries(p1Board).forEach(([key, type]) => {
      const renderKey = myRole === 'player2' ? flipKey(key) : key
      const [x, y] = normalizeKey(renderKey).split('-').map(Number)
      list.push({
        id: `p1-${key}`,
        type,
        player: myRole === 'player1' ? 'player' : 'cpu',
        isRevealed: myRole === 'player1' || mode === 'finished',
        position: { x, y }
      })
    })
    
    Object.entries(p2Board).forEach(([key, type]) => {
      const renderKey = myRole === 'player2' ? flipKey(key) : key
      const [x, y] = normalizeKey(renderKey).split('-').map(Number)
      list.push({
        id: `p2-${key}`,
        type,
        player: myRole === 'player2' ? 'player' : 'cpu',
        isRevealed: myRole === 'player2' || mode === 'finished',
        position: { x, y }
      })
    })
    
    return list
  }

  const handleCellClick = (renderedX: number, renderedY: number) => {
    if (mode !== 'playing') return
    if (isOnlineMatch && isWaitingOpponent) return

    const isMyTurn = (myRole === 'player1' && turn === 'player1') || (myRole === 'player2' && turn === 'player2')
    if (!isMyTurn) return

    const renderKey = `${renderedX}-${renderedY}`
    const rawInternalKey = myRole === 'player2' ? flipKey(renderKey) : renderKey
    const internalKey = normalizeKey(rawInternalKey)
    const [x, y] = internalKey.split('-').map(Number)

    const myBoard = myRole === 'player1' ? p1Board : p2Board
    const enemyBoard = myRole === 'player1' ? p2Board : p1Board
    const myPiece = myBoard[internalKey]

    const boardState: Record<string, { type: PieceType; owner: string }> = {}
    Object.entries(p1Board).forEach(([k, v]) => (boardState[k] = { type: v, owner: 'player1' }))
    Object.entries(p2Board).forEach(([k, v]) => (boardState[k] = { type: v, owner: 'player2' }))

    if (myPiece) {
      if (selectedKey === internalKey) {
        setSelectedKey(null)
        setValidMoves([])
        return
      }

      setSelectedKey(internalKey)
      const moves = getValidAdjacentPositions(
        x,
        y,
        myPiece,
        boardState,
        myRole === 'player1' ? 'player1' : 'player2'
      )
      setValidMoves(moves)
      return
    }

    if (selectedKey) {
      const isValid = validMoves.some((m) => m.x === x && m.y === y)
      if (!isValid) return

      const [fx, fy] = selectedKey.split('-').map(Number)
      const movingPiece = myBoard[selectedKey]
      const targetEnemyPiece = enemyBoard[internalKey]

      const newMyBoard = { ...myBoard }
      const newEnemyBoard = { ...enemyBoard }
      delete newMyBoard[selectedKey]

      const currentLastMove = { from: { x: fx, y: fy }, to: { x, y } }
      setLastMove(currentLastMove)

      let battleRes: 'none' | 'attacker' | 'defender' | 'draw' = 'none'
      let newLogMsg = ''
      let isGameFinished = false
      let winnerRole = ''

      const isTargetHQ = myRole === 'player1'
        ? (y === 0 && x === 3)
        : (y === 6 && x === 3)

      if (isTargetHQ && canOccupyHQ(movingPiece) && !targetEnemyPiece) {
        newMyBoard[internalKey] = movingPiece
        newLogMsg = `🎉 【${movingPiece}】が敵の総司令部を占領しました！完全勝利です！`
        isGameFinished = true
        winnerRole = myRole
      } else if (!targetEnemyPiece) {
        newMyBoard[internalKey] = movingPiece
        newLogMsg = `自軍の【${movingPiece}】が移動しました。`
      } else {
        const defenderOwner = myRole === 'player1' ? 'player2' : 'player1'
        const defenderBehind = getBehindPiece(internalKey, defenderOwner, boardState)
        battleRes = judgeBattle(movingPiece, targetEnemyPiece, defenderBehind)

        if (battleRes === 'attacker') {
          newMyBoard[internalKey] = movingPiece
          delete newEnemyBoard[internalKey]
          newLogMsg = `⚔️ 勝利！自軍【${movingPiece}】が敵コマを撃破しました！`

          if (targetEnemyPiece === '軍旗' || isTargetHQ) {
            newLogMsg = '🎉 敵の軍旗を撃破しました！完全勝利です！'
            isGameFinished = true
            winnerRole = myRole
          }
        } else if (battleRes === 'defender') {
          newLogMsg = `⚔️ 無念… 自軍【${movingPiece}】は返り討ちに遭いました。`
          if (movingPiece === '軍旗') {
            newLogMsg = '💥 自軍の軍旗が失われました。敗北です…'
            isGameFinished = true
            winnerRole = myRole === 'player1' ? 'player2' : 'player1'
          }
        } else {
          delete newEnemyBoard[internalKey]
          newLogMsg = `⚔️ 相討ち！【${movingPiece}】と敵コマの両方が消滅しました。`
        }
      }

      const finalP1 = myRole === 'player1' ? newMyBoard : newEnemyBoard
      const finalP2 = myRole === 'player1' ? newEnemyBoard : newMyBoard
      setP1Board(finalP1)
      setP2Board(finalP2)

      const nextTurn = turn === 'player1' ? 'player2' : 'player1'
      setTurn(nextTurn)

      const updatedLogs = [newLogMsg, ...logs.slice(0, 19)]
      setLogs(updatedLogs)

      if (isGameFinished) {
        setMode('finished')
        saveScore(winnerRole === myRole)
      }

      if (isOnlineMatch && channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'SYNC_FULL_STATE',
            payload: {
              p1Board: finalP1,
              p2Board: finalP2,
              turn: nextTurn,
              logs: updatedLogs,
              lastMove: currentLastMove,
              isFinished: isGameFinished,
              winner: winnerRole,
            },
          })
        } catch (e) {}
      }

      setSelectedKey(null)
      setValidMoves([])

      if (!isOnlineMatch) {
        setTurn('player2')
      }
    }
  }

  useEffect(() => {
    if (turn === 'player2' && mode === 'playing' && !isWaitingOpponent && !isOnlineMatch) {
      const timer = setTimeout(() => {
        const result = processAiTurn(p1Board, p2Board)
        setP1Board(result.newP1Board)
        setP2Board(result.newP2Board)

        if (result.lastLog) addLog(result.lastLog)

        if (result.winner) {
          const isWin = result.winner === 'player1'
          setMode('finished')
          saveScore(isWin)
        } else {
          setTurn('player1')
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [turn, mode, p1Board, p2Board, isWaitingOpponent, isOnlineMatch])

  if (!user) {
    return <LoginForm onLoginSuccess={(loggedUser) => setUser(loggedUser)} />
  }

  const renderSelectedKey = selectedKey 
    ? (myRole === 'player2' ? normalizeKey(flipKey(selectedKey)) : selectedKey)
    : null

  const selectedPieceObject = renderSelectedKey && (myRole === 'player1' ? p1Board[selectedKey!] : p2Board[selectedKey!])
    ? {
        id: `p-${renderSelectedKey}`,
        type: myRole === 'player1' ? p1Board[selectedKey!] : p2Board[selectedKey!],
        player: 'player' as const,
        isRevealed: true,
        position: { x: Number(renderSelectedKey.split('-')[0]), y: Number(renderSelectedKey.split('-')[1]) }
      }
    : null

  const renderValidMoves = validMoves.map(pos => {
    const raw = myRole === 'player2' ? flipPosition(pos) : pos
    return normalizePos(raw.x, raw.y)
  })
  
  const renderLastMove = lastMove ? {
    from: normalizePos((myRole === 'player2' ? flipPosition(lastMove.from) : lastMove.from).x, (myRole === 'player2' ? flipPosition(lastMove.from) : lastMove.from).y),
    to: normalizePos((myRole === 'player2' ? flipPosition(lastMove.to) : lastMove.to).x, (myRole === 'player2' ? flipPosition(lastMove.to) : lastMove.to).y)
  } : null
  
  const isMyTurn = (myRole === 'player1' && turn === 'player1') || (myRole === 'player2' && turn === 'player2')

  return (
    <main className="min-h-screen bg-[#f7f1e3] p-3 md:p-6 font-sans select-none">
      
      {/* ===== 画面上部ヘッダー ===== */}
      <div className="max-w-3xl mx-auto text-center mb-4">
        <div className="flex justify-center mb-2">
          {!logoError ? (
            <img
              src="/images/gunjin_shogi_logo.webp"
              alt="軍人将棋"
              className="h-24 md:h-36 object-contain drop-shadow mx-auto transition-all"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="text-3xl font-black text-[#b71c1c] tracking-widest border-b-2 border-[#b71c1c] pb-0.5">
              軍人将棋
            </div>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-black text-[#b71c1c]">
          軍人将棋（弐拾参枚型 電脳対局場）
        </h1>
        <p className="font-bold text-gray-800 text-xs md:text-sm mt-0.5 mb-2">
          対局武将: <span className="text-[#b71c1c] font-black">{user.name}</span> 殿
        </p>

        {/* 勝利条件の復活 */}
        <div className="inline-block bg-[#fcf8f2] border border-[#c9a063] px-4 py-2 rounded-lg shadow-sm text-left">
          <p className="text-xs md:text-sm font-black text-[#b71c1c] mb-1 border-b border-[#c9a063] pb-0.5">
            🎌 勝利条件
          </p>
          <p className="text-[11px] md:text-xs font-bold text-gray-800 leading-relaxed">
            ① 敵軍の<span className="text-[#b71c1c]">「総司令部」</span>に自軍の駒で突入・占領する<br />
            ② 敵軍の<span className="text-[#b71c1c]">「軍旗」</span>を攻撃して撃破する
          </p>
        </div>
      </div>

      {mode === 'lobby' && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-[#fcf8f2] border-4 border-[#c9a063] rounded-xl p-6 shadow-xl text-center">
            <h2 className="text-lg font-black text-[#b71c1c] mb-4 border-b border-[#c9a063] pb-2">
              【対局本陣・ロビー】
            </h2>

            {roomErrorMsg && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs font-bold text-left">
                ⚠️ {roomErrorMsg}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleStartAiSetup}
                className="w-full bg-[#b71c1c] hover:bg-[#8e0000] text-white font-black py-3.5 px-4 rounded-lg shadow-lg border-2 border-black transition-transform hover:scale-105 flex items-center justify-center gap-2 text-base"
              >
                🤖 AI（電脳思考）と対戦する
              </button>

              <button
                onClick={handleCreateOnlineRoom}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-black py-3 px-4 rounded-lg shadow-lg border-2 border-black transition-transform hover:scale-105 text-sm flex items-center justify-center gap-2"
              >
                🏰 新しい対局部屋を作る（対人待機）
              </button>

              <div className="bg-[#e8d2b8] p-3.5 rounded-lg border-2 border-[#a87c4f] text-left">
                <div className="flex items-center justify-between border-b border-[#a87c4f] pb-1.5 mb-2">
                  <h3 className="text-xs font-black text-[#5c3713] flex items-center gap-1">
                    ⚔️ 募集中の対局部屋（タップで参戦）
                  </h3>
                  <button
                    onClick={fetchRooms}
                    className="text-[10px] bg-amber-800 hover:bg-black text-white font-bold px-2 py-0.5 rounded shadow"
                  >
                    🔄 更新
                  </button>
                </div>

                {openRooms.length === 0 ? (
                  <p className="text-xs font-bold text-gray-600 text-center py-3">
                    現在募集中の部屋はありません。「部屋を作る」から新設してください。
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {openRooms.map((room) => {
                      const hostDisplay = room.host_name || room.user_name || '武将'
                      const isMyOwnRoom = hostDisplay === user.name

                      return (
                        <div
                          key={room.id || room.room_id}
                          className="bg-white p-2.5 rounded border border-[#a87c4f] shadow-sm flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-black text-gray-900">
                              {hostDisplay} 殿の陣屋
                            </p>
                            <p className="text-[10px] font-bold text-amber-800">
                              部屋ID: {room.room_id}
                            </p>
                          </div>

                          {isMyOwnRoom ? (
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-1 rounded border border-amber-400">
                                🏰 あなたの陣屋
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    await supabase.from('gunjin_rooms').update({ status: 'closed' }).eq('room_id', room.room_id)
                                    fetchRooms()
                                  } catch (e) {}
                                }}
                                className="bg-gray-600 hover:bg-black text-white font-bold text-xs px-2 py-1.5 rounded shadow border border-gray-800"
                              >
                                ✕ 閉鎖
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleJoinRoom(room)}
                              className="bg-[#b71c1c] hover:bg-[#8e0000] text-white font-black text-xs px-3 py-1.5 rounded border border-black shadow transition-transform hover:scale-105"
                            >
                              ⚔️ 参戦する
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowRanking(true)}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2.5 px-4 rounded-lg shadow border border-black text-xs transition-colors"
              >
                🏆 全国武将番付（ランキング）を見る
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'setup' && (
        <PieceSetup
          onComplete={handleSetupComplete}
          onCancel={() => setMode('lobby')}
        />
      )}

      {(mode === 'playing' || mode === 'finished') && (
        <div className="space-y-4">
          {isOnlineMatch && isWaitingOpponent && (
            <div className="max-w-3xl mx-auto bg-amber-100 border-2 border-amber-500 rounded-lg p-3 text-center shadow animate-pulse">
              <p className="text-sm font-black text-amber-900">
                ⏳ 陣形配置完了！通信同期・相手の準備完了を待っています…
              </p>
            </div>
          )}

          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => {
                setMode('lobby')
                setIsWaitingOpponent(false)
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1.5 rounded text-xs border border-gray-400 whitespace-nowrap"
            >
              ← 撤退
            </button>

            <span className={`flex-1 text-center px-2 py-1.5 rounded-full font-black text-xs md:text-sm shadow-md border ${
              isOnlineMatch && isWaitingOpponent
                ? 'bg-amber-600 text-white border-black'
                : mode === 'finished'
                ? 'bg-gray-700 text-gray-200 border-black'
                : isMyTurn
                ? 'bg-[#b71c1c] text-white border-black animate-pulse'
                : 'bg-gray-700 text-gray-200 border-black'
            }`}>
              {isOnlineMatch && isWaitingOpponent
                ? '⏳ 同期待ち'
                : mode === 'finished'
                ? '対局終了'
                : isMyTurn
                ? '⚔️ あなたの手番（コマを選択して移動）'
                : '⌛ 相手の手番（着手を待っています）'}
            </span>

            <button
              onClick={() => {
                if (channelRef.current && isOnlineMatch) {
                  channelRef.current.send({
                    type: 'broadcast',
                    event: 'SYNC_FULL_STATE',
                    payload: {
                      p1Board,
                      p2Board,
                      turn,
                      logs,
                      lastMove,
                      isWaitingOpponent: false,
                    },
                  })
                  addLog('🔄 通信フリーズを解除し盤面を強制同期しました。')
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-xs border border-black shadow whitespace-nowrap"
            >
              🔄 再同期
            </button>
          </div>

          <GameBoard
            pieces={getPiecesForBoard()}
            selectedPiece={selectedPieceObject}
            validMoves={renderValidMoves}
            lastMove={renderLastMove}
            onCellClick={handleCellClick}
          />

          {mode === 'finished' && (
            <div className="text-center pt-2">
              <button
                onClick={() => setMode('setup')}
                className="bg-[#b71c1c] hover:bg-[#8e0000] text-white font-black text-base px-6 py-3 rounded-lg shadow-xl border-2 border-black transition-transform hover:scale-105"
              >
                🔄 再び陣形を組んで出陣する
              </button>
            </div>
          )}

          <div className="max-w-3xl mx-auto bg-[#fcf8f2] border-2 border-[#c9a063] rounded-lg p-3 md:p-4 h-36 overflow-y-auto shadow-inner">
            <h3 className="font-black text-[#b71c1c] text-xs md:text-sm mb-1.5 border-b border-[#c9a063] pb-0.5">
              【対局録】
            </h3>
            <ul className="space-y-1 text-xs md:text-sm font-bold text-gray-800">
              {logs.map((log, idx) => (
                <li key={idx} className="border-b border-gray-200/60 pb-0.5 last:border-0">
                  ・{log}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 新しく作成した完璧なルール＆勝敗表ガイドを表示 */}
      <RuleGuide />

      {showRanking && <RankingModal onClose={() => setShowRanking(false)} />}
      
      {showResultModal && (
        <ResultModal
          isWin={isWinResult}
          gainedPoints={gainedPoints}
          onRestart={() => {
            setShowResultModal(false)
            setMode('setup')
          }}
          onReturnLobby={() => {
            setShowResultModal(false)
            setMode('lobby')
            setIsWaitingOpponent(false)
          }}
        />
      )}
    </main>
  )
}