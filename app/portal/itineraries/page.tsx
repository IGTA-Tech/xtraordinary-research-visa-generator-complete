'use client';

import { useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Download } from 'lucide-react';

interface Event {
  id: string;
  date: string;
  endDate: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  eventType: string;
  description: string;
  compensation: string;
}

export default function ItinerariesPage() {
  const [visaType, setVisaType] = useState('P-1A');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      date: '',
      endDate: '',
      venue: '',
      city: '',
      state: '',
      country: 'United States',
      eventType: 'Competition',
      description: '',
      compensation: ''
    }
  ]);
  const [generating, setGenerating] = useState(false);

  const addEvent = () => {
    setEvents([
      ...events,
      {
        id: Date.now().toString(),
        date: '',
        endDate: '',
        venue: '',
        city: '',
        state: '',
        country: 'United States',
        eventType: 'Competition',
        description: '',
        compensation: ''
      }
    ]);
  };

  const removeEvent = (id: string) => {
    if (events.length > 1) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const updateEvent = (id: string, field: keyof Event, value: string) => {
    setEvents(events.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const eventTypes = {
    'P-1A': ['Competition', 'Game', 'Match', 'Tournament', 'Training Camp', 'Exhibition', 'Practice', 'Media Appearance'],
    'O-1A': ['Conference', 'Lecture', 'Research', 'Consultation', 'Workshop', 'Meeting', 'Project Work'],
    'O-1B': ['Performance', 'Recording', 'Rehearsal', 'Production', 'Appearance', 'Festival', 'Show', 'Tour Date']
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGenerating(false);
    alert('Itinerary document generated! Download will start shortly.');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Itinerary Generator</h2>
        <p className="mt-1 text-gray-600">
          Create detailed itineraries for P-1A, O-1A, and O-1B visa petitions
        </p>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="P-1A">P-1A (Athlete)</option>
              <option value="O-1A">O-1A (Extraordinary Ability)</option>
              <option value="O-1B">O-1B (Arts/Entertainment)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter beneficiary name"
            />
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Events & Activities</h3>
          <button
            onClick={addEvent}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Event {index + 1}</h4>
                {events.length > 1 && (
                  <button
                    onClick={() => removeEvent(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={event.date}
                    onChange={(e) => updateEvent(event.id, 'date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={event.endDate}
                    onChange={(e) => updateEvent(event.id, 'endDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={event.eventType}
                    onChange={(e) => updateEvent(event.id, 'eventType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {eventTypes[visaType as keyof typeof eventTypes]?.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Venue
                  </label>
                  <input
                    type="text"
                    value={event.venue}
                    onChange={(e) => updateEvent(event.id, 'venue', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Madison Square Garden"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={event.city}
                    onChange={(e) => updateEvent(event.id, 'city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={event.state}
                    onChange={(e) => updateEvent(event.id, 'state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="NY"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={event.description}
                    onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Brief description of the event"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compensation</label>
                  <input
                    type="text"
                    value={event.compensation}
                    onChange={(e) => updateEvent(event.id, 'compensation', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="$5,000"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleGenerate}
            disabled={generating || !beneficiaryName || events.some(e => !e.date || !e.venue)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Itinerary
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Itinerary Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Include at least 3-5 confirmed events for the petition period</li>
          <li>- Dates should fall within the requested visa validity period</li>
          <li>- For P-1A, include competition schedules, training camps, and media appearances</li>
          <li>- Compensation details help demonstrate the nature of the engagement</li>
        </ul>
      </div>
    </div>
  );
}
