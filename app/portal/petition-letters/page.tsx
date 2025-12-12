'use client';

import { useState } from 'react';
import { FileText, Upload, Sparkles, Download, Eye } from 'lucide-react';

interface PetitionLetterForm {
  letterType: 'cover' | 'support' | 'advisory' | 'expert-opinion' | 'employer';
  beneficiaryName: string;
  visaType: string;
  petitionerName: string;
  petitionerOrganization: string;
  fieldOfExpertise: string;
  keyAchievements: string;
  caseNarrative: string;
  includeLogo: boolean;
  logoFile?: File;
  generateAILogo: boolean;
  logoStyle?: string;
}

const letterTypes = [
  { id: 'cover', name: 'Cover Letter', description: 'Main petition cover letter to USCIS' },
  { id: 'support', name: 'Support Letter', description: 'Third-party support/recommendation letter' },
  { id: 'advisory', name: 'Advisory Opinion', description: 'Expert advisory opinion letter' },
  { id: 'expert-opinion', name: 'Expert Opinion Letter', description: 'Detailed expert analysis letter' },
  { id: 'employer', name: 'Employer Support Letter', description: 'Current/prospective employer letter' },
];

const visaTypes = ['O-1A', 'O-1B', 'P-1A', 'P-1B', 'EB-1A', 'EB-1B', 'EB-2 NIW'];

const logoStyles = [
  { id: 'professional', name: 'Professional/Corporate' },
  { id: 'modern', name: 'Modern/Minimal' },
  { id: 'academic', name: 'Academic/Institutional' },
  { id: 'creative', name: 'Creative/Artistic' },
  { id: 'tech', name: 'Technology/Innovation' },
];

export default function PetitionLettersPage() {
  const [form, setForm] = useState<PetitionLetterForm>({
    letterType: 'cover',
    beneficiaryName: '',
    visaType: 'O-1A',
    petitionerName: '',
    petitionerOrganization: '',
    fieldOfExpertise: '',
    keyAchievements: '',
    caseNarrative: '',
    includeLogo: false,
    generateAILogo: false,
  });
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, logoFile: file, generateAILogo: false });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/petition-letters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedLetter(data.letter);
        if (data.logo) {
          setGeneratedLogo(data.logo);
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Petition Letters</h1>
          <p className="text-gray-600">Generate professional petition and support letters with optional logos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Letter Configuration
          </h2>

          {/* Letter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Letter Type</label>
            <div className="grid grid-cols-1 gap-2">
              {letterTypes.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    form.letterType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="letterType"
                    value={type.id}
                    checked={form.letterType === type.id}
                    onChange={(e) => setForm({ ...form, letterType: e.target.value as any })}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Visa Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
            <select
              value={form.visaType}
              onChange={(e) => setForm({ ...form, visaType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {visaTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Beneficiary Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
            <input
              type="text"
              value={form.beneficiaryName}
              onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Full legal name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field of Expertise</label>
            <input
              type="text"
              value={form.fieldOfExpertise}
              onChange={(e) => setForm({ ...form, fieldOfExpertise: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Machine Learning Research, Professional Soccer"
            />
          </div>

          {/* Petitioner Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Petitioner Name</label>
              <input
                type="text"
                value={form.petitionerName}
                onChange={(e) => setForm({ ...form, petitionerName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Contact person"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <input
                type="text"
                value={form.petitionerOrganization}
                onChange={(e) => setForm({ ...form, petitionerOrganization: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Company/Institution"
              />
            </div>
          </div>

          {/* Key Achievements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Achievements</label>
            <textarea
              value={form.keyAchievements}
              onChange={(e) => setForm({ ...form, keyAchievements: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
              placeholder="List major achievements, awards, publications, etc."
            />
          </div>

          {/* Case Narrative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Narrative</label>
            <textarea
              value={form.caseNarrative}
              onChange={(e) => setForm({ ...form, caseNarrative: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
              placeholder="Describe the case background, why extraordinary ability applies..."
            />
          </div>

          {/* Logo Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Logo Options
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.includeLogo}
                  onChange={(e) => setForm({ ...form, includeLogo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Include logo in letter header</span>
              </label>

              {form.includeLogo && (
                <div className="ml-6 space-y-3">
                  {/* Upload Logo */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Upload Logo</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Choose File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="sr-only"
                        />
                      </label>
                      {form.logoFile && (
                        <span className="text-sm text-gray-600">{form.logoFile.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Or generate with AI */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex-1 border-t" />
                    <span>or</span>
                    <div className="flex-1 border-t" />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.generateAILogo}
                      onChange={(e) => setForm({
                        ...form,
                        generateAILogo: e.target.checked,
                        logoFile: e.target.checked ? undefined : form.logoFile
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Generate logo with AI</span>
                  </label>

                  {form.generateAILogo && (
                    <div className="ml-6">
                      <label className="block text-sm text-gray-600 mb-1">Logo Style</label>
                      <select
                        value={form.logoStyle || 'professional'}
                        onChange={(e) => setForm({ ...form, logoStyle: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        {logoStyles.map((style) => (
                          <option key={style.id} value={style.id}>{style.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !form.beneficiaryName}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Letter
              </>
            )}
          </button>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview
            </h2>
            {generatedLetter && (
              <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
          </div>

          {generatedLetter ? (
            <div className="border rounded-lg p-6 bg-gray-50 min-h-[600px]">
              {generatedLogo && (
                <div className="mb-4 pb-4 border-b">
                  <img src={generatedLogo} alt="Logo" className="h-16 object-contain" />
                </div>
              )}
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {generatedLetter}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-400 min-h-[600px] flex items-center justify-center">
              <div>
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Generated letter will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
