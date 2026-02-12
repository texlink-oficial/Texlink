import React from 'react';
import { Link } from 'react-router-dom';

const ServerErrorPage: React.FC = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-500">500</h1>
          <div className="w-16 h-1 bg-red-500 mx-auto mt-4" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Erro interno do servidor
        </h2>
        <p className="text-gray-400 mb-8">
          Desculpe, algo deu errado em nossos servidores. Nossa equipe foi
          notificada e está trabalhando para resolver o problema.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReload}
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-brand-800 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
          >
            Ir para o início
          </Link>
        </div>
        <p className="text-gray-500 text-sm mt-8">
          Se o problema persistir, entre em contato com{' '}
          <a href="mailto:suporte@texlink.com.br" className="text-brand-400 hover:underline">
            suporte@texlink.com.br
          </a>
        </p>
      </div>
    </div>
  );
};

export default ServerErrorPage;
