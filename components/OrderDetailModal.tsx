import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { ChatInterface } from './ChatInterface';
import { X, CheckCircle, AlertOctagon, FileText, Truck, MapPin, DollarSign, Calendar, Scissors, Box, Clock, MessageCircle, Video, Image as ImageIcon, Download, ChevronRight, CreditCard, Play, PackageCheck, AlertTriangle } from 'lucide-react';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: OrderStatus) => void;
  onTimelineStepToggle?: (id: string, stepName: string) => void;
}

type ConfirmActionType = 'accept' | 'reject' | 'negotiate' | 'advance' | 'receipt' | null;

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onStatusChange, onTimelineStepToggle }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);

  if (!order) return null;

  // This function now just executes the logic after confirmation
  const executeAction = () => {
    if (!confirmAction) return;

    if (confirmAction === 'accept') {
        onStatusChange(order.id, OrderStatus.PRODUCTION);
    } 
    else if (confirmAction === 'negotiate') {
        onStatusChange(order.id, OrderStatus.NEGOTIATION);
    }
    else if (confirmAction === 'reject') {
        onStatusChange(order.id, OrderStatus.REJECTED);
    }
    else if (confirmAction === 'advance') {
        if (order.status === OrderStatus.PRODUCTION) {
            onStatusChange(order.id, OrderStatus.READY_SEND);
        } else if (order.status === OrderStatus.READY_SEND) {
            onStatusChange(order.id, OrderStatus.FINALIZED);
        }
    }
    else if (confirmAction === 'receipt') {
        if (onTimelineStepToggle) {
            onTimelineStepToggle(order.id, 'Recebimento na Facção');
        }
        // Ensure status is production if it was waiting
        if (order.status === OrderStatus.WAITING) {
             onStatusChange(order.id, OrderStatus.PRODUCTION);
        }
    }

    setConfirmAction(null);
    onClose();
  };

  const getConfirmationDetails = () => {
      switch (confirmAction) {
          case 'accept':
              return {
                  title: 'Aceitar Pedido?',
                  message: 'O pedido entrará em fase de Produção. Certifique-se de que tem capacidade para atender o prazo.',
                  confirmBtn: 'Sim, Aceitar',
                  color: 'bg-brand-600 hover:bg-brand-700'
              };
          case 'negotiate':
              return {
                  title: 'Negociar Condições?',
                  message: 'O status mudará para "Em Negociação". A marca será notificada que você deseja ajustar prazos ou valores.',
                  confirmBtn: 'Confirmar Negociação',
                  color: 'bg-blue-600 hover:bg-blue-700'
              };
          case 'reject':
              return {
                  title: 'Recusar Pedido?',
                  message: 'Tem certeza? O pedido será recusado e arquivado. Essa ação sinaliza à marca que você não poderá atendê-lo.',
                  confirmBtn: 'Sim, Recusar',
                  color: 'bg-red-600 hover:bg-red-700'
              };
          case 'advance':
              return {
                  title: 'Avançar Etapa?',
                  message: 'Confirma que a etapa atual foi concluída e o pedido está pronto para o próximo passo?',
                  confirmBtn: 'Sim, Avançar',
                  color: 'bg-brand-600 hover:bg-brand-700'
              };
          case 'receipt':
              return {
                  title: 'Confirmar Recebimento?',
                  message: 'Confirma que recebeu todos os insumos e materiais necessários para iniciar?',
                  confirmBtn: 'Sim, Recebi',
                  color: 'bg-indigo-600 hover:bg-indigo-700'
              };
          default:
              return { title: '', message: '', confirmBtn: '', color: '' };
      }
  };

  const isReceived = order.timeline.find(t => t.step === 'Recebimento na Facção')?.completed;

  const getBadgeStyle = (status: OrderStatus) => {
    switch(status) {
        case OrderStatus.NEW: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case OrderStatus.PRODUCTION: return 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300';
        case OrderStatus.NEGOTIATION: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        case OrderStatus.WAITING: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case OrderStatus.READY_SEND: return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
        case OrderStatus.FINALIZED: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case OrderStatus.REJECTED: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTimelineIcon = (iconName?: string) => {
    switch(iconName) {
        case 'truck': return <Truck className="h-4 w-4"/>;
        case 'scissors': return <Scissors className="h-4 w-4"/>;
        case 'box': return <Box className="h-4 w-4"/>;
        case 'clock': return <Clock className="h-4 w-4"/>;
        default: return <CheckCircle className="h-4 w-4"/>;
    }
  };

  const renderThumbnail = (att: { type: string; url: string }) => {
     // Mock logic: In a real app, you'd check if the URL is a valid image. 
     // Here we simulate thumbnails based on type or use the URL if it's not a hash.
     const hasValidImage = att.type === 'image' && att.url && att.url !== '#';

     if (hasValidImage) {
         return <img src={att.url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />;
     }

     switch(att.type) {
         case 'video': 
            return (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-5 w-5 text-white ml-1" fill="currentColor" />
                    </div>
                </div>
            );
         case 'image':
            return (
                <div className="w-full h-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-blue-300 dark:text-blue-500" />
                </div>
            );
         case 'pdf':
            return (
                <div className="w-full h-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-red-300 dark:text-red-500" />
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold text-red-400 bg-red-100 dark:bg-red-900/50 px-1 rounded">PDF</span>
                </div>
            );
         default:
            return (
                <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                     <FileText className="h-10 w-10 text-gray-300 dark:text-gray-500" />
                </div>
            );
     }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900 bg-opacity-60 dark:bg-opacity-80 transition-opacity backdrop-blur-sm" onClick={onClose} aria-hidden="true"></div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          {/* Modal Panel */}
          <div className="relative inline-block align-bottom bg-gray-50 dark:bg-gray-900 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl w-full border border-gray-200 dark:border-gray-700">
            
            {/* Header Compacto */}
            <div className="bg-white dark:bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
              <div className="flex items-center gap-4">
                 <div>
                   <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Pedido {order.displayId}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getBadgeStyle(order.status)}`}>
                          {order.status}
                      </span>
                   </h2>
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Criado em {order.createdAt}</p>
                 </div>
              </div>
              <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-2 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* --- COLUNA ESQUERDA (PRINCIPAL) --- */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Card da Marca (Horizontal e Denso) */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <img src={order.brand.image} alt="" className="h-14 w-14 rounded-full object-cover border border-gray-100 dark:border-gray-600" />
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {order.brand.name} 
                              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 text-xs px-1.5 py-0.5 rounded flex items-center font-medium">
                                  ★ {order.brand.rating}
                              </span>
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                              <MapPin className="h-3.5 w-3.5 mr-1" />
                              {order.brand.location}
                          </div>
                      </div>
                  </div>
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800/50 rounded-lg text-sm font-semibold text-brand-700 dark:text-brand-300 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat com a Marca
                  </button>
                </div>

                {/* Card de Produto + Financeiro (Unificado) */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex justify-between items-center">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Especificações & Valores
                      </h4>
                      {order.techSheetUrl && (
                          <button className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1 hover:underline">
                              <FileText className="h-3 w-3"/> Ver Ficha Técnica
                          </button>
                      )}
                  </div>
                  
                  <div className="p-6">
                      {/* Linha 1: Produto Principal */}
                      <div className="mb-6">
                          <div className="flex justify-between items-start">
                              <div>
                                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{order.type}</span>
                                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{order.productName}</h3>
                              </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md border border-gray-100 dark:border-gray-600">
                              {order.description}
                          </p>
                      </div>

                      {/* Linha 2: Grid de Dados (Régua) */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-gray-100 dark:border-gray-700">
                          <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Quantidade</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">{order.quantity} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">pçs</span></span>
                          </div>
                          <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Valor Unitário</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">R$ {order.pricePerUnit.toFixed(2)}</span>
                          </div>
                           <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Insumos</span>
                              <span className={`text-sm font-bold flex items-center gap-1 mt-1 ${order.materialsProvided ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                  {order.materialsProvided ? <CheckCircle className="h-4 w-4"/> : <AlertOctagon className="h-4 w-4"/>}
                                  {order.materialsProvided ? 'Fornecidos' : 'Pela Facção'}
                              </span>
                          </div>
                          <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Valor Total</span>
                              <span className="text-lg font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 rounded inline-block">
                                  R$ {order.totalValue.toLocaleString('pt-BR')}
                              </span>
                          </div>
                      </div>

                      {/* Linha 3: Pagamento */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <span className="font-medium">Condição:</span> {order.paymentTerms}
                      </div>
                  </div>
                </div>

                {/* Seção de Arquivos (Grid Visual & Compacto) */}
                {order.attachments && order.attachments.length > 0 && (
                  <div>
                      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 ml-1 flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Arquivos e Instruções
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {order.attachments.map((att) => (
                              <div key={att.id} className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600 transition-all cursor-pointer">
                                  {/* Thumbnail Area */}
                                  <div className="h-28 w-full relative overflow-hidden">
                                      {renderThumbnail(att)}
                                      
                                      {/* Hover Overlay */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button className="bg-white text-gray-900 rounded-full p-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                              <Download className="h-4 w-4" />
                                          </button>
                                      </div>
                                  </div>
                                  
                                  {/* Info Area */}
                                  <div className="p-2.5">
                                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mb-0.5" title={att.name}>
                                          {att.name}
                                      </p>
                                      <div className="flex justify-between items-center">
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{att.type}</span>
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-1 rounded">{att.size}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                )}
              </div>

              {/* --- COLUNA DIREITA (OPERACIONAL) --- */}
              <div className="lg:col-span-4 space-y-6">
                  
                  {/* Card de Ação Principal & Prazo (Destaque) */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm">
                      <div className="text-center mb-5">
                          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Prazo de Entrega</span>
                          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                               {new Date(order.deliveryDeadline).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                          </div>
                           <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.deliveryDeadline).getFullYear()}
                          </div>
                      </div>

                      <div className="space-y-3">
                           {order.status === OrderStatus.NEW ? (
                              <>
                                  <button 
                                      onClick={() => setConfirmAction('accept')}
                                      className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all transform active:scale-95 mb-3">
                                      <CheckCircle className="h-4 w-4" /> Aceitar Pedido
                                  </button>
                                  <div className="flex gap-3">
                                      <button 
                                          onClick={() => setConfirmAction('negotiate')}
                                          className="flex-1 flex justify-center items-center gap-2 px-3 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors">
                                          <MessageCircle className="h-4 w-4" /> Negociar
                                      </button>
                                      <button 
                                          onClick={() => setConfirmAction('reject')}
                                          className="flex-1 flex justify-center items-center gap-2 px-3 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors">
                                          <X className="h-4 w-4" /> Recusar
                                      </button>
                                  </div>
                              </>
                          ) : order.status === OrderStatus.WAITING ? (
                              <>
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-800 dark:text-amber-400 text-sm mb-1">
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                        <AlertOctagon className="h-4 w-4" /> Status: Aguardando
                                    </div>
                                    <p>{order.waitingReason}</p>
                                </div>
                                <button
                                    onClick={() => setConfirmAction('receipt')}
                                    className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm mt-2 transition-colors"
                                >
                                    <PackageCheck className="h-4 w-4" /> Confirmar Recebimento
                                </button>
                              </>
                          ) : order.status === OrderStatus.PRODUCTION ? (
                               <>
                                   {!isReceived && (
                                       <button 
                                           onClick={() => setConfirmAction('receipt')}
                                           className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm mb-2"
                                       >
                                           <PackageCheck className="h-4 w-4" /> Confirmar Recebimento
                                       </button>
                                   )}
                                   {isReceived && (
                                       <button 
                                          onClick={() => setConfirmAction('advance')}
                                          className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg shadow-sm">
                                          Marcar como Pronto <ChevronRight className="h-4 w-4" />
                                      </button>
                                   )}
                               </>
                          ) : order.status === OrderStatus.REJECTED ? (
                              <div className="w-full py-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center">
                                  <div className="flex flex-col items-center gap-1">
                                      <X className="h-6 w-6 mb-1" />
                                      <span>Pedido Recusado</span>
                                  </div>
                              </div>
                          ) : (
                               <div className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg text-center cursor-not-allowed">
                                   Aguardando próxima etapa
                               </div>
                          )}
                      </div>
                  </div>

                 {/* Timeline Vertical */}
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col h-auto">
                   <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Rastreamento
                      </h4>
                   </div>
                   <div className="p-5">
                      <div className="relative pl-2">
                          {/* Linha Vertical Conectora */}
                          <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-700"></div>
                          
                          <div className="space-y-6 relative">
                              {order.timeline.map((event, idx) => (
                                  <div key={idx} className="flex items-start group">
                                      <div className={`relative flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 transition-colors
                                          ${event.completed 
                                              ? 'border-green-500 text-green-500 bg-white dark:bg-gray-800' 
                                              : 'border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 bg-white dark:bg-gray-800'}`}>
                                          {getTimelineIcon(event.icon)}
                                      </div>
                                      <div className="ml-3 min-w-0 pt-1">
                                          <p className={`text-sm font-medium ${event.completed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}`}>
                                              {event.step}
                                          </p>
                                          {event.date ? (
                                               <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                  {event.date}
                                               </span>
                                          ) : (
                                              <span className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 block">Pendente</span>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)}></div>
              <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 transform scale-100 transition-all">
                  <div className="flex flex-col items-center text-center">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${confirmAction === 'reject' ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600'}`}>
                          {confirmAction === 'reject' ? <X className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {getConfirmationDetails().title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                          {getConfirmationDetails().message}
                      </p>
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setConfirmAction(null)}
                              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={executeAction}
                              className={`flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-lg shadow-sm transition-colors ${getConfirmationDetails().color}`}
                          >
                              {getConfirmationDetails().confirmBtn}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isChatOpen && <ChatInterface order={order} onClose={() => setIsChatOpen(false)} />}
    </>
  );
};