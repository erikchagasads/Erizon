import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0D17] text-white p-4 font-sans">
      <div className="max-w-md w-full bg-[#15182B] border border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="text-6xl font-bold text-blue-500 mb-4 tracking-tighter">404</div>
        <h2 className="text-2xl font-bold mb-3 text-white">Página não encontrada</h2>
        <p className="text-gray-400 mb-8 text-sm">
          A URL que você tentou acessar não existe ou foi movida. Verifique se o endereço foi digitado corretamente.
        </p>
        <div className="flex flex-col gap-3">
          <Link 
            href="/cliente" 
            className="w-full inline-block py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Acessar Dashboard
          </Link>
          <Link 
            href="/" 
            className="w-full inline-block py-3 px-4 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Página Inicial
          </Link>
        </div>
      </div>
    </div>
  );
}