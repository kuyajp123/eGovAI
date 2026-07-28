const ActivityPage = () => {
  return (
    <div className="pt-24 px-margin-mobile max-w-5xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold">My Applications</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border-l-4 border-primary shadow-sm space-y-3 bento-card">
          <div className="flex justify-between">
            <span className="font-bold text-primary">Renewing</span>
            <span className="text-xs">Jan 12</span>
          </div>
          <h3 className="text-xl font-bold">Business Permit Renewal</h3>
          <div className="h-1.5 w-full bg-surface-container rounded-full">
            <div className="h-full bg-primary w-3/4 rounded-full"></div>
          </div>
          <p className="text-sm text-on-surface-variant italic">Under final review by officer.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border-l-4 border-tertiary shadow-sm space-y-3 bento-card">
          <div className="flex justify-between">
            <span className="font-bold text-tertiary">Active</span>
            <span className="text-xs">Oct 24</span>
          </div>
          <h3 className="text-xl font-bold">National ID Card</h3>
          <p className="text-sm text-on-surface-variant">Verified and stored in Identity Vault.</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityPage
