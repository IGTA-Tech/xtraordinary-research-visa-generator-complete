'use client';

import { useState } from 'react';
import { FileText, Download, Plus, Check } from 'lucide-react';

const agreementTypes = [
  {
    id: 'representation',
    name: 'Representation Agreement',
    description: 'Standard attorney-client representation agreement for visa petition services',
    fields: ['clientName', 'visaType', 'fee', 'paymentTerms'],
    category: 'legal'
  },
  {
    id: 'deal-memo',
    name: 'Deal Memo',
    description: 'Agreement between petitioner and beneficiary outlining terms of employment/engagement',
    fields: ['petitioner', 'beneficiary', 'position', 'compensation', 'duration'],
    category: 'employment'
  },
  {
    id: 'sponsorship',
    name: 'Sponsorship Agreement',
    description: 'Employer sponsorship commitment for visa petition support',
    fields: ['employer', 'employee', 'position', 'startDate', 'terms'],
    category: 'employment'
  },
  {
    id: 'consultation',
    name: 'Consultation Agreement',
    description: 'Initial consultation and case evaluation agreement',
    fields: ['clientName', 'consultationFee', 'scope'],
    category: 'legal'
  },
  {
    id: 'agent',
    name: 'Agent Agreement',
    description: 'Agreement for P-1A/O-1B petitions filed by agents on behalf of multiple employers',
    fields: ['agentName', 'beneficiary', 'employers', 'eventDetails'],
    category: 'agent'
  },
  {
    id: 'multiple-employer',
    name: 'Multiple Employer Agreement',
    description: 'Agreement for cases with multiple U.S. employers sponsoring the same beneficiary',
    fields: ['beneficiary', 'primaryEmployer', 'secondaryEmployers', 'workAllocation', 'compensation', 'visaType'],
    category: 'employment'
  },
  {
    id: 'foreign-employer',
    name: 'Foreign Employer Agreement',
    description: 'Agreement with foreign employer for O/P visa petitions with international components',
    fields: ['foreignEmployer', 'foreignCountry', 'beneficiary', 'usAgent', 'workLocation', 'duration', 'compensation'],
    category: 'international'
  },
  {
    id: 'self-employment',
    name: 'Self-Employment Agreement',
    description: 'Agreement structure for self-petitioned cases (O-1A, EB-1A, EB-2 NIW)',
    fields: ['beneficiary', 'businessEntity', 'businessType', 'fieldOfWork', 'projectedIncome', 'visaType'],
    category: 'self-petition'
  }
];

export default function AgreementsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedType) return;

    setGenerating(true);
    // In production, call API to generate document
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGenerating(false);
    alert('Agreement generated! Download will start shortly.');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Agreements & Deal Memos</h2>
        <p className="mt-1 text-gray-600">
          Generate professional legal agreements for visa petition cases
        </p>
      </div>

      {/* Agreement Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Agreement Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agreementTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${selectedType === type.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{type.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                </div>
                {selectedType === type.id && (
                  <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      {selectedType && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {agreementTypes.find(t => t.id === selectedType)?.name} Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agreementTypes.find(t => t.id === selectedType)?.fields.map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="text"
                  value={formData[field] || ''}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Agreement
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedType(null);
                setFormData({});
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Recent Agreements */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Agreements</h3>
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No agreements generated yet</p>
          <p className="text-sm">Select an agreement type above to get started</p>
        </div>
      </div>
    </div>
  );
}
