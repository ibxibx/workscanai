export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-white pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Header skeleton */}
        <div className="mb-[48px]">
          <div className="h-[52px] w-[280px] bg-[#e8e8ed] rounded-[12px] animate-pulse mb-[12px]" />
          <div className="h-[22px] w-[360px] bg-[#e8e8ed] rounded-[8px] animate-pulse" />
        </div>
        {/* CTA skeleton */}
        <div className="h-[120px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] animate-pulse mb-[32px]" />
        {/* Stats skeleton */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] animate-pulse">
              <div className="h-[12px] w-[100px] bg-[#e8e8ed] rounded mb-[16px]" />
              <div className="h-[40px] w-[80px] bg-[#e8e8ed] rounded mb-[8px]" />
              <div className="h-[12px] w-[140px] bg-[#e8e8ed] rounded" />
            </div>
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="space-y-[16px]">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] animate-pulse">
              <div className="h-[20px] w-[200px] bg-[#e8e8ed] rounded mb-[12px]" />
              <div className="h-[14px] w-[300px] bg-[#e8e8ed] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
