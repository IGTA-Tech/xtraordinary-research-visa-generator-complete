import PetitionGeneratorForm from './components/PetitionGeneratorForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <header className="bg-white shadow-lg border-b-4 border-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Mega Internal V1 - Visa Petition Generator
          </h1>
          <p className="mt-3 text-base text-gray-600 font-medium">
            AI-powered visa petition document generation for O-1, EB-1A, EB-2 NIW, and P-1 cases
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">O-1A/B</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">EB-1A</span>
            <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">EB-2 NIW</span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">P-1A</span>
          </div>
        </div>
      </header>

      <main className="py-12">
        <PetitionGeneratorForm />
      </main>

      <footer className="bg-white border-t-2 border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500 font-medium">
            Internal Tool - Mega Internal V1 Visa Petition Generator - Powered by Claude AI
          </p>
        </div>
      </footer>
    </div>
  );
}
