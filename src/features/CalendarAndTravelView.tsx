import React, { useEffect, useState } from 'react';
import { CalendarDays, Luggage, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { CalendarEvent, SavedOutfit, TravelPlan } from '../types/stylesync';

export const CalendarAndTravelView: React.FC = () => {
  const { notify } = useAuth();
  const [subTab, setSubTab] = useState<'calendar' | 'travel'>('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [plans, setPlans] = useState<TravelPlan[]>([]);

  // Calendar Form
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventTitle, setEventTitle] = useState('');
  const [occasion, setOccasion] = useState('Work');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');
  const [outfitSummary, setOutfitSummary] = useState('');

  // Travel Form
  const [destination, setDestination] = useState('Jaipur');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(3);
  const [activitiesText, setActivitiesText] = useState('Heritage walks, rooftop dinner, artisan market');
  const [weatherPref, setWeatherPref] = useState('Warm & Sunny');
  const [generatingTravel, setGeneratingTravel] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ events: CalendarEvent[] }>('/api/calendar').catch(() => ({ events: [] })),
      apiFetch<{ outfits: SavedOutfit[] }>('/api/outfits').catch(() => ({ outfits: [] })),
      apiFetch<{ plans: TravelPlan[] }>('/api/travel-plans').catch(() => ({ plans: [] })),
    ]).then(([c, o, t]) => {
      setEvents(c.events || []);
      setOutfits(o.outfits || []);
      setPlans(t.plans || []);
    });
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      notify('Enter an event title.', 'error');
      return;
    }

    // Check repeat warning within 7 days for the same outfit
    if (selectedOutfitId) {
      const targetTime = new Date(eventDate).getTime();
      const recentRepeat = events.find((ev) => {
        if (String(ev.outfitId) !== selectedOutfitId) return false;
        const diffDays = Math.abs(new Date(ev.eventDate).getTime() - targetTime) / (1000 * 3600 * 24);
        return diffDays <= 7;
      });
      if (recentRepeat) {
        notify(
          `Repeat notice: this outfit is already scheduled on ${recentRepeat.eventDate}.`,
          'info',
        );
      }
    }

    const chosenOutfit = outfits.find((o) => String(o.id) === selectedOutfitId);

    try {
      const res = await apiFetch<{ event: CalendarEvent }>('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          eventDate,
          eventTitle: eventTitle.trim(),
          occasion,
          outfitId: selectedOutfitId ? Number(selectedOutfitId) : null,
          outfitSummary: outfitSummary.trim() || chosenOutfit?.title || 'Planned outfit',
        }),
      });
      setEvents((prev) =>
        [...prev, res.event].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
      );
      setEventTitle('');
      setOutfitSummary('');
      notify('Outfit scheduled on your calendar.', 'success');
    } catch (err: any) {
      notify(err.message || 'Failed to schedule event.', 'error');
    }
  };

  const deleteEvent = async (id: number) => {
    try {
      await apiFetch(`/api/calendar/${id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      notify('Removed calendar entry.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const generateTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingTravel(true);
    try {
      const res = await apiFetch<{ plan: TravelPlan }>('/api/ai/travel-planner', {
        method: 'POST',
        body: JSON.stringify({
          destination,
          startDate,
          durationDays,
          activities: activitiesText.split(',').map((s) => s.trim()).filter(Boolean),
          weatherPref,
        }),
      });
      setPlans((prev) => [res.plan, ...prev]);
      notify(`Capsule travel plan created for ${destination}.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Could not generate travel plan.', 'error');
    } finally {
      setGeneratingTravel(false);
    }
  };

  const deletePlan = async (id: number) => {
    try {
      await apiFetch(`/api/travel-plans/${id}`, { method: 'DELETE' });
      setPlans((prev) => prev.filter((p) => p.id !== id));
      notify('Travel plan deleted.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9D5C63] mb-1">
            Weekly Planning & Capsule Packing
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
            Outfit Calendar & Travel Planner
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EAE3D9] rounded-lg shrink-0">
          <button
            onClick={() => setSubTab('calendar')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              subTab === 'calendar' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Outfit Calendar
          </button>
          <button
            onClick={() => setSubTab('travel')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              subTab === 'travel' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Travel Outfit Planner
          </button>
        </div>
      </div>

      {subTab === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSchedule}
            className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4 h-fit"
          >
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Schedule an Outfit
            </h2>
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Event / Occasion Title</label>
              <input
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="E.g. Client Presentation or Family Dinner"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Occasion Category</label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              >
                <option>Work</option>
                <option>Casual</option>
                <option>Festive</option>
                <option>Party</option>
                <option>Travel</option>
              </select>
            </div>
            {outfits.length > 0 && (
              <div>
                <label className="block text-xs text-[#57534E] mb-1">
                  Link Saved Outfit (Optional)
                </label>
                <select
                  value={selectedOutfitId}
                  onChange={(e) => setSelectedOutfitId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
                >
                  <option value="">Custom note below</option>
                  {outfits.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.occasion})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Outfit Summary</label>
              <input
                value={outfitSummary}
                onChange={(e) => setOutfitSummary(e.target.value)}
                placeholder="E.g. Ivory blazer + beige trousers + loafers"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Save to Calendar
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Upcoming Planned Outfits
            </h2>
            {events.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#57534E]">
                <CalendarDays className="w-8 h-8 mx-auto opacity-40 mb-2" />
                No outfits scheduled yet. Add an event to avoid repeating outfits too often.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#9D5C63] font-medium">
                        <span className="font-mono-num">{ev.eventDate}</span>
                        <span>·</span>
                        <span>{ev.occasion || 'General'}</span>
                      </div>
                      <div className="text-base font-semibold text-[#1C1917] mt-0.5">
                        {ev.eventTitle}
                      </div>
                      <div className="text-xs text-[#57534E] mt-0.5">{ev.outfitSummary}</div>
                    </div>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="p-2 text-[#8B2E2E] hover:bg-[#FDF2F2] rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={generateTravel}
            className="bg-white border border-[#E7E2DA] rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Destination</label>
              <input
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Duration (Days)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value) || 3)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs text-[#57534E] mb-1">Weather</label>
              <input
                value={weatherPref}
                onChange={(e) => setWeatherPref(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={generatingTravel}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
            >
              <Luggage className="w-4 h-4" />
              {generatingTravel ? 'Planning...' : 'Generate Packing Plan'}
            </button>
            <div className="sm:col-span-2 lg:col-span-5">
              <label className="block text-xs text-[#57534E] mb-1">Planned Activities</label>
              <input
                value={activitiesText}
                onChange={(e) => setActivitiesText(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
          </form>

          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-[#E7E2DA] rounded-xl p-6 lg:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
                <div>
                  <div className="text-xs text-[#9D5C63] font-medium">
                    {plan.startDate} · {plan.durationDays} Days · {plan.weatherPref}
                  </div>
                  <h2 className="font-editorial text-3xl font-semibold text-[#1C1917]">
                    {plan.destination} Capsule Itinerary
                  </h2>
                </div>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="p-2 text-[#8B2E2E] hover:bg-[#FDF2F2] rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plan.generatedPlan.dailyOutfits.map((day) => (
                  <div
                    key={day.day}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2 text-xs"
                  >
                    <div className="font-semibold text-[#9D5C63]">
                      Day {day.day} · {day.title}
                    </div>
                    <div className="text-[#1C1917] font-medium">{day.outfit}</div>
                    <div className="text-[#57534E]">Footwear: {day.footwear}</div>
                    <div className="text-[#57534E]">Accessories: {day.accessories}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
                <div>
                  <h3 className="font-semibold text-[#1C1917] mb-2">Packing Checklist</h3>
                  <ul className="space-y-1 text-[#44403C]">
                    {plan.generatedPlan.packingChecklist.map((item, idx) => (
                      <li key={idx}>· {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1C1917] mb-2">Footwear & Accessories</h3>
                  <ul className="space-y-1 text-[#44403C]">
                    {plan.generatedPlan.footwearRecs.map((f, idx) => (
                      <li key={idx}>· {f}</li>
                    ))}
                    {plan.generatedPlan.accessories.map((a, idx) => (
                      <li key={idx}>· {a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1C1917] mb-2">Capsule Tips</h3>
                  <ul className="space-y-1 text-[#44403C]">
                    {plan.generatedPlan.travelTips.map((t, idx) => (
                      <li key={idx}>· {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
