import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-brand-500">404</h1>
          <div className="w-16 h-1 bg-brand-500 mx-auto mt-4" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Página não encontrada
        </h2>
        <p className="text-gray-400 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium"
          >
            Ir para o início
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-brand-800 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
