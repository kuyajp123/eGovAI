import { TourismPlannerPrompt, TourismResult } from '../services/aiTourismService'

interface TourismDestinationPickerCardProps {
  prompt: TourismPlannerPrompt
  busy: boolean
  onReply: (destination: string) => void
  onCancel: () => void
}

const suggestedDestinations = [
  'Palawan',
  'Cebu',
  'Bohol',
  'Siargao',
  'Baguio',
  'Vigan',
  'Banaue',
  'Dumaguete',
]

export const TourismDestinationPickerCard = ({
  prompt,
  busy,
  onReply,
  onCancel,
}: TourismDestinationPickerCardProps) => (
  <div className="mt-4 rounded-2xl overflow-hidden border border-cyan-200 bg-cyan-50/70 shadow-sm">
    <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-cyan-200">
      <div className="flex items-center gap-2 text-cyan-900">
        <span className="material-symbols-outlined text-xl">travel_explore</span>
        <div>
          <p className="text-xs font-bold leading-none">Tourism Planner · Choose a Destination</p>
          <p className="text-[9px] opacity-75 mt-1">Philippine tourism guidance</p>
        </div>
      </div>
      <span className="px-2.5 py-1 rounded-full bg-white text-cyan-800 text-[9px] font-bold uppercase tracking-wide border border-cyan-100">
        Not booked
      </span>
    </div>

    <div className="p-4 space-y-3">
      <p className="text-[11px] leading-relaxed text-on-surface-variant">
        Pick a suggestion, or type <strong>any Philippine city, province, island, municipality, or attraction</strong> in the chat field.
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Suggested Philippine destinations">
        {suggestedDestinations.map(destination => (
          <button
            key={destination}
            type="button"
            disabled={busy}
            onClick={() => onReply(destination)}
            className="px-3 py-2 rounded-full bg-white border border-cyan-200 text-cyan-900 text-[10px] font-semibold hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {destination}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-white border border-cyan-100 px-3 py-2 flex items-start gap-2 text-[10px] text-on-surface-variant">
        <span className="material-symbols-outlined text-sm text-cyan-700">keyboard</span>
        <span>Example custom answers: “Marinduque”, “Kawasan Falls”, or “General Santos City”.</span>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="text-[10px] font-semibold text-on-surface-variant hover:text-error disabled:opacity-50"
      >
        Cancel tourism planning
      </button>
      <span className="sr-only">Tourism conversation {prompt.conversationId}</span>
    </div>
  </div>
)

interface TourismResultCardProps {
  result: TourismResult
  onFollowUp: (prompt: string) => void
}

const requestTypeLabels: Record<TourismResult['requestType'], string> = {
  itinerary: 'Travel Itinerary',
  destinations: 'Destination Guide',
  activities: 'Activities & Experiences',
  budget: 'Budget Planning',
  transport: 'Transportation Guide',
  general: 'Tourism Guidance',
}

export const TourismResultCard = ({ result, onFollowUp }: TourismResultCardProps) => {
  const available = result.source === 'egov_tourism_api'

  return (
    <div className={`mt-4 rounded-2xl overflow-hidden border shadow-sm ${available ? 'border-cyan-200' : 'border-amber-200'}`}>
      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${available ? 'bg-gradient-to-r from-cyan-700 to-blue-700' : 'bg-amber-700'}`}>
        <div className="flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-xl">travel_explore</span>
          <div>
            <p className="text-xs font-bold leading-none">eGovPH Tourism Assistant</p>
            <p className="text-[9px] opacity-80 mt-1">Philippine travel planning</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide">
          {available ? 'Tourism API' : 'Temporarily unavailable'}
        </span>
      </div>

      <div className="bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-100">
            <span className="text-[9px] uppercase tracking-wide font-bold text-cyan-800 block">Destination</span>
            <span className="font-semibold text-on-surface">{result.destination || 'Philippines'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
            <span className="text-[9px] uppercase tracking-wide font-bold text-blue-800 block">Request</span>
            <span className="font-semibold text-on-surface">{requestTypeLabels[result.requestType]}</span>
          </div>
        </div>

        {available ? (
          <>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Continue planning</p>
              <div className="flex flex-wrap gap-2">
                {result.followUpPrompts.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onFollowUp(prompt)}
                    className="px-3 py-2 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-900 text-[10px] font-semibold hover:bg-cyan-100 text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[9px] leading-relaxed text-on-surface-variant border-t border-outline-variant/20 pt-2">
              Travel conditions, prices, schedules, entry rules, and closures can change. Confirm time-sensitive details with the destination, transport operator, or relevant government office before travelling or paying.
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onFollowUp(result.prompt)}
            className="w-full py-2.5 rounded-lg bg-amber-700 text-white font-bold text-xs hover:bg-amber-800 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Try Tourism API Again
          </button>
        )}
      </div>
    </div>
  )
}
