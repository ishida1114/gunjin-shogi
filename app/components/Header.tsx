'use client'

export default function Header() {
  return (
    <header className="flex flex-col items-center mb-8 border-b-4 border-[#b71c1c] pb-6 shadow-sm">
      <div className="relative w-full max-w-4xl h-44 md:h-56 mb-2 rounded-lg overflow-hidden border-2 border-[#c9a063] shadow-lg bg-[#2a2a2a] flex items-center justify-center">
        <img
          src="/images/gunjin_shogi_logo.webp"
          alt="軍人将棋"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <p className="text-sm md:text-base text-[#b71c1c] font-bold tracking-widest mt-1">
        — 弐拾参枚型 電脳対局場 —
      </p>
    </header>
  )
}