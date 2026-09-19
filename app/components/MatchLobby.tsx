'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import RankingBoard from '@/app/components/RankingBoard'

interface Room {
  id: string
  room_name: string
  status: string
  player1_id: string
  player1_name: string
  player2_id: string | null
  player2_name: string | null
}

interface MatchLobbyProps {
  user: { id: string; name: string }
  onJoinRoom: (roomId: string, playerRole: 'player1' | 'player2') => void
  onLogout: () => void
}

export default function MatchLobby({ user, onJoinRoom, onLogout }: MatchLobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchRooms = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('game_rooms')
      .select('*')
      .is('player2_id', null)
      .neq('status', 'finished')
      .order('created_at', { ascending: false })

    setLoading(false)
    if (data) setRooms(data)
  }

  useEffect(() => {
    fetchRooms()

    const channel = supabase
      .channel('public:game_rooms_lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => {
        fetchRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('game_rooms')
      .insert([
        {
          room_name: newRoomName,
          player1_id: user.id,
          player1_name: user.name,
          status: 'waiting',
        },
      ])
      .select()
      .single()

    setLoading(false)

    if (error) {
      alert(`ルームの作成に失敗しました: ${error.message}`)
      return
    }

    if (data) {
      onJoinRoom(data.id, 'player1')
    }
  }

  const handleJoinRoom = async (room: Room) => {
    if (room.player1_id === user.id) {
      onJoinRoom(room.id, 'player1')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('game_rooms')
      .update({
        player2_id: user.id,
        player2_name: user.name,
        status: 'setup',
      })
      .eq('id', room.id)

    setLoading(false)

    if (error) {
      alert('ルームへの参加に失敗しました。')
      return
    }

    onJoinRoom(room.id, 'player2')
  }

  return (
    <div className="bg-[#fcf8f2] border-4 border-[#c9a063] rounded-lg p-6 shadow-2xl">
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#b71c1c]">対戦ロビー</h2>
          <p className="text-sm font-bold text-gray-700">対戦者: {user.name} 殿</p>
        </div>
        <button
          onClick={onLogout}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded text-sm border border-gray-400"
        >
          ログアウト
        </button>
      </div>

      {/* ランキングボード表示 */}
      <RankingBoard />

      {/* ルーム新規作成フォーム */}
      <form onSubmit={handleCreateRoom} className="mb-8 bg-white p-4 rounded border-2 border-[#c9a063] shadow-sm">
        <h3 className="text-lg font-bold text-[#b71c1c] mb-2">新規対戦部屋の開設</h3>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="部屋名を入力（例：本陣対局）"
            className="flex-1 p-2.5 border-2 border-gray-300 rounded outline-none focus:border-[#b71c1c]"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#b71c1c] hover:bg-[#8e0000] text-white font-bold px-6 py-2.5 rounded border-2 border-black shadow disabled:opacity-50"
          >
            部屋を作る
          </button>
        </div>
      </form>

      {/* 待機中ルーム一覧 */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-gray-800">現在対戦募集中の部屋</h3>
          <button
            onClick={fetchRooms}
            disabled={loading}
            className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded border border-gray-400 shadow-sm"
          >
            🔄 部屋一覧を再読み込み
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-8 bg-white rounded border border-dashed border-gray-300">
            <p className="text-gray-500 mb-2">現在募集中の部屋はありません。</p>
            <p className="text-xs text-gray-400">（部屋を作った後、上の「🔄 部屋一覧を再読み込み」を押してみてください）</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white p-4 rounded border-2 border-[#c9a063] flex justify-between items-center shadow-sm"
              >
                <div>
                  <h4 className="font-extrabold text-lg text-black">{room.room_name}</h4>
                  <p className="text-xs text-gray-600">親 (Player1): {room.player1_name}</p>
                </div>
                <button
                  onClick={() => handleJoinRoom(room)}
                  className="bg-[#c9a063] hover:bg-[#a88248] text-black font-extrabold px-5 py-2 rounded border border-black shadow"
                >
                  {room.player1_id === user.id ? '部屋に戻る' : '対戦に入る'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}