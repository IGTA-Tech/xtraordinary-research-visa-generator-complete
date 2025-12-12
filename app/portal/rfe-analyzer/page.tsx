'use client';

import { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, TrendingUp, Lightbulb } from 'lucide-react';

interface RFEIssue {
  category: string;
  criterion?: string;
  title: string;
  description: string;
  uscisLanguage: string;
  evidenceRequested: string[];
  suggestedResponse: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  templateImpact: string[];
}

interface RFEData {
  receiptNumber: string;
  beneficiaryName: string;
  petitionerName: string;
  visaType: string;
  issueDate: string;
  responseDeadline: string;
  serviceCenter: string;
  issues: RFEIssue[];
  overallAssessment: string;
  criticalDeficiencies: string[];
  suggestedEvidence: string[];
}

interface ProcessedResult {
  success: boolean;
  data: RFEData;
  issueCount: number;
  criticalCount: number;
  highCount: number;
}

const visaTypes = ['O-1A', 'O-1B', 'P-1A', 'P-1B', 'EB-1A', 'EB-1B', 'EB-2 NIW'];

const priorityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

export default function RFEAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [visaType, setVisaType] = useState('O-1A');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);

    try {
      let response;

      if (inputMode === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('visaType', visaType);

        response = await fetch('/api/rfe/process', {
          method: 'POST',
          body: formData,
        });
      } else if (inputMode === 'text' && textInput) {
        response = await fetch('/api/rfe/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput, visaType }),
        });
      } else {
        throw new Error('Please provide a PDF file or paste RFE text');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process RFE');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RFE Analyzer</h1>
        <p className="text-gray-600">
          Upload Request for Evidence (RFE) documents to extract structured data and insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Upload RFE</h2>

          {/* Input Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('file')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                inputMode === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                inputMode === 'text'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paste Text
            </button>
          </div>

          {/* Visa Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {visaTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          {inputMode === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFE PDF</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="rfe-upload"
                />
                <label htmlFor="rfe-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">PDF files only</p>
                </label>
              </div>
            </div>
          )}

          {/* Text Input */}
          {inputMode === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFE Text</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-64 font-mono text-sm"
                placeholder="Paste the RFE document text here..."
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleProcess}
            disabled={processing || (inputMode === 'file' ? !file : !textInput)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing RFE...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Analyze RFE
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Analysis Results</h2>

          {result ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{result.issueCount}</div>
                  <div className="text-xs text-gray-500">Total Issues</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{result.criticalCount}</div>
                  <div className="text-xs text-gray-500">Critical</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">{result.highCount}</div>
                  <div className="text-xs text-gray-500">High Priority</div>
                </div>
              </div>

              {/* Case Info */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-gray-900">Case Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Receipt:</span> {result.data.receiptNumber}</div>
                  <div><span className="text-gray-500">Visa:</span> {result.data.visaType}</div>
                  <div><span className="text-gray-500">Beneficiary:</span> {result.data.beneficiaryName}</div>
                  <div><span className="text-gray-500">Deadline:</span> {result.data.responseDeadline}</div>
                </div>
              </div>

              {/* Overall Assessment */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Overall Assessment</h3>
                <p className="text-sm text-gray-600">{result.data.overallAssessment}</p>
              </div>

              {/* Critical Deficiencies */}
              {result.data.criticalDeficiencies.length > 0 && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Deficiencies
                  </h3>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {result.data.criticalDeficiencies.map((def, i) => (
                      <li key={i}>{def}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Evidence */}
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-800 flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  Suggested Evidence
                </h3>
                <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                  {result.data.suggestedEvidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Upload an RFE to see analysis results</p>
            </div>
          )}
        </div>
      </div>

      {/* Issues Detail */}
      {result && result.data.issues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Detailed Issues ({result.data.issues.length})</h2>
          <div className="space-y-4">
            {result.data.issues.map((issue, index) => (
              <div key={index} className={`border rounded-lg p-4 ${priorityColors[issue.priority]}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase mr-2 ${
                      issue.priority === 'critical' ? 'bg-red-600 text-white' :
                      issue.priority === 'high' ? 'bg-orange-600 text-white' :
                      issue.priority === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {issue.priority}
                    </span>
                    <span className="font-medium">{issue.title}</span>
                    {issue.criterion && (
                      <span className="ml-2 text-sm text-gray-600">({issue.criterion})</span>
                    )}
                  </div>
                  <span className="text-xs bg-white px-2 py-1 rounded">{issue.category}</span>
                </div>

                <p className="text-sm mb-3">{issue.description}</p>

                <div className="text-xs space-y-2">
                  <div>
                    <strong>USCIS Language:</strong>
                    <p className="italic mt-1 bg-white bg-opacity-50 p-2 rounded">"{issue.uscisLanguage}"</p>
                  </div>

                  <div>
                    <strong>Evidence Requested:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {issue.evidenceRequested.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong>Suggested Response:</strong>
                    <p className="mt-1">{issue.suggestedResponse}</p>
                  </div>

                  <div>
                    <strong>Templates to Update:</strong>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {issue.templateImpact.map((template, i) => (
                        <span key={i} className="bg-white px-2 py-0.5 rounded text-gray-600">
                          {template}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
