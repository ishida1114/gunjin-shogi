'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'

interface ScoreRecord {
  user_id: string
  user_name: string
  wins: number
}

export default function RankingBoard() {
  const [rankings, setRankings] = useState<ScoreRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRankings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gunjin_scores')
      .select('*')
      .order('wins', { ascending: false })
      .limit(10)

    if (data) setRankings(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchRankings()

    // リアルタイム順位更新の監視
    const channel = supabase
      .channel('public:gunjin_scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gunjin_scores' }, () => {
        fetchRankings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="bg-white border-2 border-[#c9a063] rounded-lg p-4 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-3 border-b border-[#c9a063] pb-2">
        <h3 className="text-lg font-bold text-[#b71c1c] flex items-center gap-1.5">
          <span>🏆</span> 勝ち点 殿堂（上位10名）
        </h3>
        <button
          onClick={fetchRankings}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border"
        >
          🔄 更新
        </button>
      </div>

      {loading ? (
        <p className="text-center py-4 text-xs text-gray-500">ランキング読み込み中...</p>
      ) : rankings.length === 0 ? (
        <p className="text-center py-4 text-xs text-gray-500">まだ勝利データがありません。対戦で初勝利を収めましょう！</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fcf8f2] text-[#8e0000] border-b">
                <th className="py-2 px-3 font-extrabold text-center w-12">順位</th>
                <th className="py-2 px-3 font-extrabold">対戦者（武将名）</th>
                <th className="py-2 px-3 font-extrabold text-right">勝ち点 (勝利数)</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((item, index) => {
                const rank = index + 1
                const isTop3 = rank <= 3
                return (
                  <tr
                    key={item.user_id}
                    className={`border-b last:border-b-0 ${
                      rank === 1
                        ? 'bg-amber-50 font-extrabold'
                        : rank === 2
                        ? 'bg-slate-50 font-bold'
                        : rank === 3
                        ? 'bg-orange-50 font-bold'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      {rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `${rank}位`}
                    </td>
                    <td className="py-2 px-3 font-bold text-gray-900">{item.user_name}</td>
                    <td className="py-2 px-3 text-right text-base font-black text-[#b71c1c]">
                      {item.wins} <span className="text-xs font-normal text-gray-600">点</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}