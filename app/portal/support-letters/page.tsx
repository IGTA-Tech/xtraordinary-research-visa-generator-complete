'use client';

import { useState } from 'react';
import { Mail, FileText, Users, Building, GraduationCap, Award, Send } from 'lucide-react';

const letterTypes = [
  {
    id: 'expert',
    name: 'Expert Opinion Letter',
    icon: GraduationCap,
    description: 'Letter from recognized expert in the field attesting to extraordinary ability',
    requiredFor: ['O-1A', 'O-1B', 'EB-1A']
  },
  {
    id: 'employer',
    name: 'Employer Support Letter',
    icon: Building,
    description: 'Letter from current or prospective employer confirming position and qualifications',
    requiredFor: ['O-1A', 'O-1B', 'P-1A', 'EB-1A']
  },
  {
    id: 'peer',
    name: 'Peer Recommendation',
    icon: Users,
    description: 'Letter from colleagues or peers in the field recognizing achievements',
    requiredFor: ['O-1A', 'O-1B', 'EB-1A']
  },
  {
    id: 'advisory',
    name: 'Advisory Opinion',
    icon: Award,
    description: 'Letter from peer group, labor organization, or management organization',
    requiredFor: ['O-1A', 'O-1B', 'P-1A']
  }
];

export default function SupportLettersPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Beneficiary info
    beneficiaryName: '',
    visaType: 'O-1A',
    field: '',
    achievements: '',

    // Letter writer info
    writerName: '',
    writerTitle: '',
    writerOrganization: '',
    writerEmail: '',
    writerRelationship: '',

    // Letter specifics
    keyPoints: '',
    specificExamples: ''
  });

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    // In production, call API to generate letter
    await new Promise(resolve => setTimeout(resolve, 3000));
    setGenerating(false);
    alert('Support letter draft generated! You can now review and customize it.');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Support Letters</h2>
        <p className="mt-1 text-gray-600">
          Generate professional support letters with AI assistance and optional DocuSign integration
        </p>
      </div>

      {/* Letter Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Letter Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {letterTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setStep(1);
                }}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all flex gap-4
                  ${selectedType === type.id
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className={`p-3 rounded-lg ${selectedType === type.id ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                  <Icon className={`w-6 h-6 ${selectedType === type.id ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{type.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  <div className="flex gap-1 mt-2">
                    {type.requiredFor.map(visa => (
                      <span key={visa} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {visa}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-step Form */}
      {selectedType && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-medium
                  ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Beneficiary Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Beneficiary Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
                  <input
                    type="text"
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
                  <select
                    value={formData.visaType}
                    onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="O-1A">O-1A</option>
                    <option value="O-1B">O-1B</option>
                    <option value="P-1A">P-1A</option>
                    <option value="EB-1A">EB-1A</option>
                    <option value="EB-2 NIW">EB-2 NIW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field/Industry</label>
                  <input
                    type="text"
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Professional Basketball"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Achievements</label>
                  <textarea
                    value={formData.achievements}
                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="List major awards, publications, performances, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Letter Writer Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Letter Writer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Writer Name</label>
                  <input
                    type="text"
                    value={formData.writerName}
                    onChange={(e) => setFormData({ ...formData, writerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Dr. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.writerTitle}
                    onChange={(e) => setFormData({ ...formData, writerTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Professor of Sports Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input
                    type="text"
                    value={formData.writerOrganization}
                    onChange={(e) => setFormData({ ...formData, writerOrganization: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Stanford University"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.writerEmail}
                    onChange={(e) => setFormData({ ...formData, writerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="jane.doe@stanford.edu"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Beneficiary</label>
                  <textarea
                    value={formData.writerRelationship}
                    onChange={(e) => setFormData({ ...formData, writerRelationship: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="How does the writer know the beneficiary?"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Letter Content */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Letter Content</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Points to Address</label>
                  <textarea
                    value={formData.keyPoints}
                    onChange={(e) => setFormData({ ...formData, keyPoints: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder="What specific criteria or qualifications should the letter address?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specific Examples</label>
                  <textarea
                    value={formData.specificExamples}
                    onChange={(e) => setFormData({ ...formData, specificExamples: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder="Any specific examples, anecdotes, or experiences the writer should mention?"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Generate Letter
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
