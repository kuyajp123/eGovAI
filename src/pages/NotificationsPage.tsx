const NotificationsPage = () => {
  return (
    <div className="pt-24 px-margin-mobile max-w-2xl mx-auto pb-32">
      <h2 className="text-2xl font-bold mb-6">Notifications</h2>

      <div className="space-y-3">
        <div className="bg-white p-4 rounded-xl border-l-4 border-primary shadow-sm flex gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Payment Confirmed</h4>
            <p className="text-sm text-on-surface-variant">Your renewal fee has been processed.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm flex gap-4 opacity-70">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Application Updated</h4>
            <p className="text-sm text-on-surface-variant">Business permit status: In Progress.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsPage
