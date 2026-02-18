export default function ResultsLoading() {
  return (
    <div className="min-h-screen bg-white pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Header skeleton */}
        <div className="mb-[48px]">
          <div className="h-[52px] w-[360px] bg-[#e8e8ed] rounded-[12px] animate-pulse mb-[12px]" />
          <div className="h-[16px] w-[200px] bg-[#e8e8ed] rounded animate-pulse" />
        </div>
        {/* Summary cards */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] animate-pulse">
              <div className="h-[12px] w-[100px] bg-[#e8e8ed] rounded mb-[16px]" />
              <div className="h-[48px] w-[100px] bg-[#e8e8ed] rounded mb-[8px]" />
              <div className="h-[12px] w-[140px] bg-[#e8e8ed] rounded" />
            </div>
          ))}
        </div>
        {/* Task breakdown */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
          <div className="h-[28px] w-[200px] bg-[#e8e8ed] rounded animate-pulse mb-[32px]" />
          <div className="space-y-[16px]">
            {[1,2,3,4].map(i => (
              <div key={i} className="border border-[#d2d2d7] rounded-[12px] p-[24px] bg-white animate-pulse">
                <div className="h-[20px] w-[240px] bg-[#e8e8ed] rounded mb-[12px]" />
                <div className="h-[14px] w-[180px] bg-[#e8e8ed] rounded mb-[16px]" />
                <div className="h-[48px] w-full bg-[#e8e8ed] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
