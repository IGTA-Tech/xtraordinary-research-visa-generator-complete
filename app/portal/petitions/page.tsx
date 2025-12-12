'use client';

import PetitionGeneratorForm from '../../components/PetitionGeneratorForm';

export default function PetitionsPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Petition Generator</h2>
        <p className="mt-1 text-gray-600">
          Generate comprehensive 9-document visa petition packages with AI-powered research
        </p>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Generated</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 1</div>
            <div className="text-base font-semibold text-gray-900">Comprehensive Analysis</div>
            <div className="text-xs text-gray-500 mt-1">75+ pages</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 2</div>
            <div className="text-base font-semibold text-gray-900">Publication Analysis</div>
            <div className="text-xs text-gray-500 mt-1">Media coverage review</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 3</div>
            <div className="text-base font-semibold text-gray-900">URL Reference Guide</div>
            <div className="text-xs text-gray-500 mt-1">With archive.org links</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 4</div>
            <div className="text-base font-semibold text-gray-900">Legal Brief</div>
            <div className="text-xs text-gray-500 mt-1">Attorney-ready arguments</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 5</div>
            <div className="text-base font-semibold text-gray-900">Evidence Gap Analysis</div>
            <div className="text-xs text-gray-500 mt-1">Missing evidence identification</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 6</div>
            <div className="text-base font-semibold text-gray-900">USCIS Cover Letter</div>
            <div className="text-xs text-gray-500 mt-1">Professional submission letter</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 7</div>
            <div className="text-base font-semibold text-gray-900">Visa Checklist</div>
            <div className="text-xs text-gray-500 mt-1">Complete filing checklist</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Document 8</div>
            <div className="text-base font-semibold text-gray-900">Exhibit Assembly Guide</div>
            <div className="text-xs text-gray-500 mt-1">Organization instructions</div>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
            <div className="text-sm font-medium text-indigo-600">Document 9</div>
            <div className="text-base font-semibold text-indigo-900">USCIS Officer Rating</div>
            <div className="text-xs text-indigo-500 mt-1">Approval prediction analysis</div>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <PetitionGeneratorForm />
    </div>
  );
}
