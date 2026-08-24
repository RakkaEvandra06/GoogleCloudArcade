export default function DashboardSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Profile skeleton */}
      <div className="glass-card" style={{ background:'rgba(66,133,244,0.05)', borderColor:'rgba(66,133,244,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full animate-subtle-pulse" style={{ background:'rgba(66,133,244,0.12)' }} />
          <div className="space-y-2 flex-1">
            <div className="h-2.5 rounded w-20 animate-subtle-pulse" style={{ background:'rgba(255,255,255,0.07)' }} />
            <div className="h-5 rounded w-44 animate-subtle-pulse" style={{ background:'rgba(255,255,255,0.07)' }} />
          </div>
          <div className="hidden sm:flex gap-2">
            {[52, 44, 48].map((w, i) => (
              <div key={i} className="h-10 rounded-lg animate-subtle-pulse"
                style={{ width: w, background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tab skeleton */}
      <div className="h-10 rounded-xl animate-subtle-pulse"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />

      {/* Points + Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[
          'rgba(66,133,244,0.10)',
          'rgba(255,255,255,0.04)',
        ].map((bg, i) => (
          <div key={i} className="rounded-xl p-5 space-y-3 animate-subtle-pulse"
            style={{ background: bg, border: '1px solid rgba(255,255,255,0.08)', minHeight: 180 }}>
            <div className="h-2.5 rounded w-24" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-12 rounded w-28" style={{ background: 'rgba(255,255,255,0.07)' }} />
            {[1, 2].map(j => (
              <div key={j} className="h-8 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ))}
      </div>

      {/* Milestone skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          'rgba(52,168,83,0.08)',
          'rgba(66,133,244,0.08)',
          'rgba(249,171,0,0.08)',
        ].map((bg, i) => (
          <div key={i} className="rounded-xl p-4 space-y-3 animate-subtle-pulse"
            style={{ background: bg, border: '1px solid rgba(255,255,255,0.07)', minHeight: 140 }}>
            <div className="h-2.5 rounded w-20" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-9 rounded w-16"   style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>

      {/* Track skeletons — show image placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden animate-subtle-pulse"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)' }}>
            <div className="h-[120px]" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="p-3 space-y-2">
              <div className="h-4 rounded w-28" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="h-3 rounded w-40" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="h-3 rounded w-32" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
