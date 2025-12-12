'use client';

import { useState } from 'react';
import { FileText, Download, Check, AlertCircle } from 'lucide-react';

const formTypes = [
  {
    id: 'i-129',
    name: 'I-129',
    title: 'Petition for Nonimmigrant Worker',
    description: 'Primary petition form for O-1, P-1, and other work visas',
    pages: 36,
    required: true
  },
  {
    id: 'i-129-op',
    name: 'I-129 O/P Supplement',
    title: 'Classification Supplement for O and P Nonimmigrants',
    description: 'Required supplement for O-1 and P-1 classifications',
    pages: 2,
    required: true
  },
  {
    id: 'i-907',
    name: 'I-907',
    title: 'Request for Premium Processing',
    description: 'Optional form for 15-day processing ($2,805 fee)',
    pages: 2,
    required: false
  },
  {
    id: 'g-28',
    name: 'G-28',
    title: 'Notice of Entry of Appearance as Attorney',
    description: 'Required when attorney represents the petitioner',
    pages: 3,
    required: true
  }
];

const petitioners = [
  { id: 'igta', name: 'Innovative Global Talent Agency LLC', ein: 'XX-XXXXXXX' },
  { id: 'accelerator', name: 'Innovative Global Accelerator Studios LLC', ein: 'XX-XXXXXXX' },
  { id: 'custom', name: 'Custom Petitioner', ein: '' }
];

export default function FormFillerPage() {
  const [selectedForms, setSelectedForms] = useState<string[]>(['i-129', 'i-129-op', 'g-28']);
  const [selectedPetitioner, setSelectedPetitioner] = useState('igta');
  const [visaType, setVisaType] = useState('O-1A');
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    // Beneficiary
    beneficiaryFirstName: '',
    beneficiaryLastName: '',
    beneficiaryDOB: '',
    beneficiaryCountry: '',
    beneficiaryPassport: '',

    // Position
    jobTitle: '',
    startDate: '',
    endDate: '',
    salary: '',

    // Petitioner (for custom)
    petitionerName: '',
    petitionerAddress: '',
    petitionerCity: '',
    petitionerState: '',
    petitionerZip: '',
    petitionerPhone: '',
    petitionerEIN: ''
  });

  const toggleForm = (formId: string) => {
    if (selectedForms.includes(formId)) {
      setSelectedForms(selectedForms.filter(f => f !== formId));
    } else {
      setSelectedForms([...selectedForms, formId]);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // In production, call backend API to fill PDF forms
    await new Promise(resolve => setTimeout(resolve, 3000));
    setGenerating(false);
    alert('Forms generated! Download will start shortly.');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">USCIS Form Filler</h2>
        <p className="mt-1 text-gray-600">
          Auto-fill USCIS immigration forms with case data
        </p>
      </div>

      {/* Form Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Forms to Generate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formTypes.map((form) => (
            <button
              key={form.id}
              onClick={() => toggleForm(form.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${selectedForms.includes(form.id)
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900">{form.name}</h4>
                    {form.required && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Required</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">{form.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{form.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{form.pages} pages</p>
                </div>
                {selectedForms.includes(form.id) && (
                  <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Petitioner & Visa Type */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Petition Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Petitioner</label>
            <select
              value={selectedPetitioner}
              onChange={(e) => setSelectedPetitioner(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {petitioners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Classification</label>
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="O-1A">O-1A (Extraordinary Ability)</option>
              <option value="O-1B">O-1B (Arts/Entertainment)</option>
              <option value="O-2">O-2 (Support Personnel)</option>
              <option value="P-1A">P-1A (Athlete)</option>
              <option value="P-1B">P-1B (Entertainment Group)</option>
              <option value="P-1S">P-1S (Support Personnel)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Beneficiary Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Beneficiary Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.beneficiaryFirstName}
              onChange={(e) => setFormData({ ...formData, beneficiaryFirstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.beneficiaryLastName}
              onChange={(e) => setFormData({ ...formData, beneficiaryLastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={formData.beneficiaryDOB}
              onChange={(e) => setFormData({ ...formData, beneficiaryDOB: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country of Citizenship</label>
            <input
              type="text"
              value={formData.beneficiaryCountry}
              onChange={(e) => setFormData({ ...formData, beneficiaryCountry: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="United Kingdom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
            <input
              type="text"
              value={formData.beneficiaryPassport}
              onChange={(e) => setFormData({ ...formData, beneficiaryPassport: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Position Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Position Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Professional Athlete"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Salary</label>
            <input
              type="text"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="$150,000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex gap-4">
        <button
          onClick={handleGenerate}
          disabled={generating || selectedForms.length === 0}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating Forms...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate {selectedForms.length} Form{selectedForms.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-yellow-900">Review Before Filing</h3>
          <p className="text-sm text-yellow-800 mt-1">
            These forms are auto-filled based on the information provided. Always review all fields
            carefully before submission to USCIS. Consult with an immigration attorney if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
