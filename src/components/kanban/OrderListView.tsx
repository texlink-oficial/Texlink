import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderStatus } from '../../types';
import { Calendar, CheckCircle2, Clock, ArrowUpRight, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, MapPin, DollarSign, PackageCheck, Scissors, Square, CheckSquare } from 'lucide-react';

interface OrderListViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  // Suggestion 5: Bulk Action Props
  onBulkAction?: (action: string, orderIds: string[]) => void;
}

type SortKey = 'id' | 'brand' | 'product' | 'op' | 'artigo' | 'value' | 'status' | 'deadline' | 'payment';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export const OrderListView: React.FC<OrderListViewProps> = ({ orders, onOrderClick, onBulkAction }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Tooltip State
  const [hoveredBrandId, setHoveredBrandId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleBrandMouseEnter = (e: React.MouseEvent, brandId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      top: rect.top - 8,
      left: rect.left + (rect.width / 2)
    });
    setHoveredBrandId(brandId);
  };

  const handleBrandMouseLeave = () => {
    setHoveredBrandId(null);
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map(o => o.id)));
    }
  };

  const handleSelectOrder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening detail modal
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOrderIds(newSelected);
  };

  const executeBulkAction = (action: string) => {
    if (onBulkAction) {
      onBulkAction(action, Array.from(selectedOrderIds));
      setSelectedOrderIds(new Set()); // Clear selection after action
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig) return orders;

    return [...orders].sort((a, b) => {
      const { key, direction } = sortConfig;

      let aValue: any;
      let bValue: any;

      switch (key) {
        case 'id':
          aValue = a.displayId;
          bValue = b.displayId;
          break;
        case 'brand':
          aValue = a.brand.name.toLowerCase();
          bValue = b.brand.name.toLowerCase();
          break;
        case 'product':
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
          break;
        case 'op':
          aValue = (a.op || '').toLowerCase();
          bValue = (b.op || '').toLowerCase();
          break;
        case 'artigo':
          aValue = (a.artigo || '').toLowerCase();
          bValue = (b.artigo || '').toLowerCase();
          break;
        case 'value':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'deadline':
          aValue = new Date(a.deliveryDeadline).getTime();
          bValue = new Date(b.deliveryDeadline).getTime();
          break;
        case 'payment':
          aValue = a.paymentStatus;
          bValue = b.paymentStatus;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortConfig]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case OrderStatus.AVAILABLE_FOR_OTHERS: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case OrderStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case OrderStatus.NEGOTIATING: return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
      case OrderStatus.ACCEPTED: return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      case OrderStatus.PREPARING_BRAND: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case OrderStatus.TRANSIT_TO_SUPPLIER: return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800';
      case OrderStatus.RECEIVED_SUPPLIER: return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800';
      case OrderStatus.PRODUCTION: return 'bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800';
      case OrderStatus.READY_SEND: return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800';
      case OrderStatus.TRANSIT_TO_BRAND: return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800';
      case OrderStatus.IN_REVIEW: return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case OrderStatus.PARTIALLY_APPROVED: return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case OrderStatus.DISAPPROVED: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case OrderStatus.AWAITING_REWORK: return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case OrderStatus.FINALIZED: return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW: return 'Novo';
      case OrderStatus.AVAILABLE_FOR_OTHERS: return 'Disponível';
      case OrderStatus.REJECTED: return 'Recusado';
      case OrderStatus.NEGOTIATING: return 'Em Negociação';
      case OrderStatus.ACCEPTED: return 'Aceito';
      case OrderStatus.PREPARING_BRAND: return 'Preparando';
      case OrderStatus.TRANSIT_TO_SUPPLIER: return 'Trânsito';
      case OrderStatus.RECEIVED_SUPPLIER: return 'Preparação';
      case OrderStatus.PRODUCTION: return 'Produção';
      case OrderStatus.READY_SEND: return 'Pronto/Envio';
      case OrderStatus.TRANSIT_TO_BRAND: return 'Trânsito';
      case OrderStatus.IN_REVIEW: return 'Em Revisão';
      case OrderStatus.PARTIALLY_APPROVED: return 'Parcial';
      case OrderStatus.DISAPPROVED: return 'Reprovado';
      case OrderStatus.AWAITING_REWORK: return 'Retrabalho';
      case OrderStatus.FINALIZED: return 'Finalizado';
      default: return status;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <div className="h-2.5 w-2.5 rounded-full bg-green-500" title="Pago"></div>;
      case 'late': return <div className="h-2.5 w-2.5 rounded-full bg-red-500" title="Atrasado"></div>;
      case 'partial': return <div className="h-2.5 w-2.5 rounded-full bg-blue-500" title="Parcial"></div>;
      default: return <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" title="Pendente"></div>;
    }
  }

  const getUrgencyInfo = (order: Order) => {
    const isFinalized = order.status === OrderStatus.FINALIZED;
    if (isFinalized) {
      return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle2, text: 'Entregue' };
    }

    if (order.status === OrderStatus.REJECTED) {
      return { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: AlertCircle, text: 'Cancelado' };
    }

    const deadline = new Date(order.deliveryDeadline);
    const today = new Date('2026-01-25');
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle, text: `${Math.abs(diffDays)}d atrasado` };
    if (diffDays <= 3) return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Clock, text: `${diffDays}d restantes` };
    return { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700', icon: Calendar, text: 'No prazo' };
  };

  const SortIcon = ({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) => {
    if (!active) return <ArrowUpDown className="h-3 w-3 text-gray-300 dark:text-gray-600 ml-1 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
    if (direction === 'asc') return <ArrowUp className="h-3 w-3 text-brand-600 dark:text-brand-400 ml-1" />;
    return <ArrowDown className="h-3 w-3 text-brand-600 dark:text-brand-400 ml-1" />;
  };

  const renderHeader = (label: string, sortKey: SortKey, width?: string) => (
    <th
      className={`px-3 py-2 cursor-pointer group/th hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none ${width || ''}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
        {label}
        <SortIcon
          active={sortConfig?.key === sortKey}
          direction={sortConfig?.key === sortKey ? sortConfig.direction : undefined}
        />
      </div>
    </th>
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full transition-colors relative">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-[10px] uppercase tracking-wider font-semibold">
                <th className="px-3 py-2 w-10">
                  <button onClick={handleSelectAll} className="flex items-center text-gray-400 hover:text-brand-600">
                    {selectedOrderIds.size === orders.length && orders.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                {renderHeader('ID', 'id', 'w-32')}
                {renderHeader('Marca', 'brand')}
                {renderHeader('Produto', 'product')}
                {renderHeader('OP', 'op')}
                {renderHeader('Artigo', 'artigo')}
                {renderHeader('Qtd / Valor', 'value')}
                {renderHeader('Status', 'status')}
                {renderHeader('$', 'payment')}
                {renderHeader('Prazo', 'deadline')}
                <th className="px-3 py-2 text-right text-[10px] text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedOrders.map((order) => {
                const urgency = getUrgencyInfo(order);
                const UrgencyIcon = urgency.icon;
                const isSelected = selectedOrderIds.has(order.id);

                return (
                  <tr
                    key={order.id}
                    onClick={() => onOrderClick(order)}
                    className={`hover:bg-brand-50/30 dark:hover:bg-brand-900/20 transition-colors cursor-pointer group ${isSelected ? 'bg-brand-50/50 dark:bg-brand-900/30' : ''}`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => handleSelectOrder(e, order.id)} className={`text-gray-300 hover:text-brand-600 ${isSelected ? 'text-brand-600' : ''}`}>
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] group-hover:text-brand-600 dark:group-hover:text-brand-300 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors whitespace-nowrap">
                        {order.displayId}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={order.brand.image} alt="" className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-600" />

                        {/* Brand Info with Portal Tooltip Trigger */}
                        <div
                          onMouseEnter={(e) => handleBrandMouseEnter(e, order.id)}
                          onMouseLeave={handleBrandMouseLeave}
                          className="relative"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-xs leading-tight">{order.brand.name}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{order.brand.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800 dark:text-gray-200 text-xs leading-tight">{order.productName}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0">{order.type}</div>
                    </td>
                    <td className="px-3 py-2">
                      {order.op ? (
                        <span className="inline-flex items-center text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 px-1.5 py-0 rounded">
                          {order.op}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {order.artigo ? (
                        <span className="inline-flex items-center text-[10px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-1.5 py-0 rounded">
                          {order.artigo}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">{order.quantity} <span className="text-gray-400 dark:text-gray-500 font-normal">pçs</span></div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">R$ {order.totalValue.toLocaleString('pt-BR')}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium border ${getStatusBadge(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.waitingReason && (order.status === OrderStatus.PREPARING_BRAND || order.status === OrderStatus.TRANSIT_TO_SUPPLIER) && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 max-w-[120px] truncate" title={order.waitingReason}>
                          ⚠️ {order.waitingReason}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {getPaymentStatusIcon(order.paymentStatus)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-200 leading-tight">
                          {new Date(order.deliveryDeadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                        <div className={`flex items-center gap-1 text-[10px] mt-0.5 font-medium ${urgency.color}`}>
                          <UrgencyIcon className="h-2 w-2" />
                          {urgency.text}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button className="text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400">
          <span>Mostrando {orders.length} pedidos</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200">Anterior</button>
            <button className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">Próximo</button>
          </div>
        </div>

        {/* Suggestion 5: Bulk Actions Floating Bar */}
        {selectedOrderIds.size > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 z-10">
            <div className="font-bold text-sm flex items-center gap-2">
              <div className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {selectedOrderIds.size}
              </div>
              Selecionados
            </div>
            <div className="h-6 w-px bg-gray-700 dark:bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => executeBulkAction('receipt')}
                className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-black/10 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
              >
                <PackageCheck className="h-4 w-4" /> Receber Insumos
              </button>
              <button
                onClick={() => executeBulkAction('production')}
                className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-black/10 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
              >
                <Scissors className="h-4 w-4" /> Produção
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portal Tooltip for List View */}
      {hoveredBrandId && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none transition-opacity duration-200"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {(() => {
            const brandOrder = orders.find(o => o.id === hoveredBrandId);
            if (!brandOrder) return null;
            return (
              <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg p-3 shadow-xl border border-gray-200 dark:border-gray-700 w-56 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-bold text-sm">{brandOrder.brand.name}</div>
                  <span className="text-[10px] bg-yellow-100 dark:bg-yellow-500 text-yellow-800 dark:text-black px-1 rounded font-bold">★ {brandOrder.brand.rating}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> {brandOrder.brand.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Cliente desde Nov 2023
                  </div>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-900 rotate-45 border-r border-b border-gray-200 dark:border-gray-700"></div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </>
  );
};