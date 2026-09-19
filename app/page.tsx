'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import Header from '@/app/components/Header'
import LoginForm from '@/app/components/LoginForm'
import MatchLobby from '@/app/components/MatchLobby'
import PieceSetup from '@/app/components/PieceSetup'
import GameBoard from '@/app/components/GameBoard'
import { PieceType } from '@/app/types/game'

export default function Home() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  // 画面モード: 'login' | 'lobby' | 'setup' | 'game'
  const [mode, setMode] = useState<'login' | 'lobby' | 'setup' | 'game'>('login')
  
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2'>('player1')
  const [myBoard, setMyBoard] = useState<Record<string, PieceType> | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('gunjin_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      setMode('lobby')
    }
  }, [])

  const handleLogout = () => {
    setUser(null)
    setMode('login')
    localStorage.removeItem('gunjin_user')
    supabase.auth.signOut()
  }

  // ルーム作成または参加
  const handleJoinRoom = (roomId: string, role: 'player1' | 'player2') => {
    setCurrentRoomId(roomId)
    setPlayerRole(role)
    setMode('setup') // コマ配置画面へ進む
  }

  // 配置完了後、対戦盤面へ進む
  const handleSetupComplete = (board: Record<string, PieceType>) => {
    setMyBoard(board)
    setMode('game')
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-black font-sans p-4 md:p-8">
      <Header />

      <div className="max-w-3xl mx-auto">
        {mode === 'login' && (
          <div className="bg-white border-4 border-[#c9a063] rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <h2 className="text-2xl font-extrabold text-[#b71c1c]">アカウント認証</h2>
              <span className="text-xs bg-[#f5f1e8] text-[#8e0000] font-bold px-3 py-1 rounded-full border border-[#c9a063]">
                13-LINE 共有DB接続中
              </span>
            </div>
            <LoginForm
              onLoginSuccess={(loggedUser) => {
                setUser(loggedUser)
                setMode('lobby')
              }}
            />
          </div>
        )}

        {mode === 'lobby' && user && (
          <MatchLobby
            user={user}
            onJoinRoom={handleJoinRoom}
            onLogout={handleLogout}
          />
        )}

        {mode === 'setup' && (
          <PieceSetup
            onSetupComplete={handleSetupComplete}
            onCancel={() => setMode('lobby')}
          />
        )}

        {mode === 'game' && user && currentRoomId && myBoard && (
          <GameBoard
            roomId={currentRoomId}
            user={user}
            role={playerRole}
            myBoard={myBoard}
            onLeaveGame={() => setMode('lobby')}
          />
        )}
      </div>
    </main>
  )
}