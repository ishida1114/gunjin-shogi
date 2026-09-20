'use client'

interface ResultModalProps {
  isWin: boolean
  gainedPoints: number
  onRestart: () => void
  onReturnLobby: () => void
}

export default function ResultModal({
  isWin,
  gainedPoints,
  onRestart,
  onReturnLobby,
}: ResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#fcf8f2] border-4 border-[#c9a063] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
        <h2 className={`text-2xl md:text-3xl font-black mb-2 ${isWin ? 'text-[#b71c1c]' : 'text-gray-800'}`}>
          {isWin ? '🎉 完全勝利！' : '💥 敗北…'}
        </h2>
        <p className="text-sm font-bold text-gray-700 mb-4">
          {isWin ? '敵軍の本陣を攻め落とし、見事勝利を収めました！' : '残念ながら本陣を奪われ、作戦は失敗に終わりました。'}
        </p>

        <div className="bg-[#e8d2b8] p-4 rounded-xl border-2 border-[#a87c4f] mb-6">
          <p className="text-xs font-bold text-[#5c3713]">獲得武功ポイント</p>
          <p className="text-3xl font-black text-[#b71c1c] mt-1">+{gainedPoints} pt</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full bg-[#b71c1c] hover:bg-[#8e0000] text-white font-black py-3 px-4 rounded-xl shadow-lg border-2 border-black transition-transform hover:scale-105"
          >
            🔄 再び出陣する（陣形再配置）
          </button>
          <button
            onClick={onReturnLobby}
            className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2.5 px-4 rounded-xl shadow border border-black text-sm"
          >
            🏰 ロビーへ戻る
          </button>
        </div>
      </div>
    </div>
  )
}