import React from 'react';
import { Link } from 'react-router-dom';
import {
    GitBranch, ArrowRight, CheckCircle, XCircle, Clock,
    AlertTriangle, Package, RefreshCw
} from 'lucide-react';
import { OrderStatus, OrderChild, OrderHierarchy } from '../../services/orders.service';

interface OrderHierarchyTreeProps {
    hierarchy: OrderHierarchy;
    currentOrderId: string;
    basePath?: string; // '/brand/pedidos' or '/supplier/pedidos'
}

const statusConfig: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
    LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'amber', icon: Clock },
    ACEITO_PELA_FACCAO: { label: 'Aceito', color: 'blue', icon: CheckCircle },
    EM_PREPARACAO_SAIDA_MARCA: { label: 'Preparando', color: 'indigo', icon: Package },
    EM_TRANSITO_PARA_FACCAO: { label: 'Trânsito', color: 'cyan', icon: ArrowRight },
    EM_PREPARACAO_ENTRADA_FACCAO: { label: 'Recebido', color: 'teal', icon: Package },
    EM_PRODUCAO: { label: 'Produção', color: 'purple', icon: Package },
    PRONTO: { label: 'Pronto', color: 'emerald', icon: CheckCircle },
    EM_TRANSITO_PARA_MARCA: { label: 'Trânsito', color: 'sky', icon: ArrowRight },
    EM_REVISAO: { label: 'Em Revisão', color: 'orange', icon: AlertTriangle },
    PARCIALMENTE_APROVADO: { label: 'Parcial', color: 'amber', icon: AlertTriangle },
    REPROVADO: { label: 'Reprovado', color: 'red', icon: XCircle },
    AGUARDANDO_RETRABALHO: { label: 'Retrabalho', color: 'blue', icon: RefreshCw },
    FINALIZADO: { label: 'Finalizado', color: 'green', icon: CheckCircle },
    RECUSADO_PELA_FACCAO: { label: 'Recusado', color: 'red', icon: XCircle },
    DISPONIVEL_PARA_OUTRAS: { label: 'Disponível', color: 'gray', icon: Clock },
};

const getStatusConfig = (status: OrderStatus) => {
    return statusConfig[status] || { label: status, color: 'gray', icon: Clock };
};

const OrderNode: React.FC<{
    id: string;
    displayId: string;
    status: OrderStatus;
    quantity: number;
    revisionNumber?: number;
    isCurrent: boolean;
    isRework?: boolean;
    basePath: string;
}> = ({ id, displayId, status, quantity, revisionNumber, isCurrent, isRework, basePath }) => {
    const config = getStatusConfig(status);
    const StatusIcon = config.icon;

    const colorClasses: Record<string, string> = {
        amber: 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700',
        blue: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
        green: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
        red: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700',
        purple: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700',
        orange: 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700',
        gray: 'bg-gray-100 border-gray-300 dark:bg-gray-700/50 dark:border-gray-600',
        indigo: 'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700',
        cyan: 'bg-cyan-100 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700',
        teal: 'bg-teal-100 border-teal-300 dark:bg-teal-900/30 dark:border-teal-700',
        emerald: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700',
        sky: 'bg-sky-100 border-sky-300 dark:bg-sky-900/30 dark:border-sky-700',
    };

    const textClasses: Record<string, string> = {
        amber: 'text-amber-700 dark:text-amber-400',
        blue: 'text-blue-700 dark:text-blue-400',
        green: 'text-green-700 dark:text-green-400',
        red: 'text-red-700 dark:text-red-400',
        purple: 'text-purple-700 dark:text-purple-400',
        orange: 'text-orange-700 dark:text-orange-400',
        gray: 'text-gray-700 dark:text-gray-400',
        indigo: 'text-indigo-700 dark:text-indigo-400',
        cyan: 'text-cyan-700 dark:text-cyan-400',
        teal: 'text-teal-700 dark:text-teal-400',
        emerald: 'text-emerald-700 dark:text-emerald-400',
        sky: 'text-sky-700 dark:text-sky-400',
    };

    const content = (
        <div className={`relative p-3 rounded-xl border-2 transition-all ${colorClasses[config.color] || colorClasses.gray
            } ${isCurrent ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-gray-900' : 'hover:opacity-80'}`}>
            {isRework && revisionNumber && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    R{revisionNumber}
                </div>
            )}
            <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${textClasses[config.color] || textClasses.gray}`} />
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {displayId}
                </span>
            </div>
            <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-medium ${textClasses[config.color] || textClasses.gray}`}>
                    {config.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {quantity} pçs
                </span>
            </div>
        </div>
    );

    if (isCurrent) {
        return content;
    }

    return (
        <Link to={`${basePath}/${id}`} className="block">
            {content}
        </Link>
    );
};

export const OrderHierarchyTree: React.FC<OrderHierarchyTreeProps> = ({
    hierarchy,
    currentOrderId,
    basePath = '/brand/pedidos'
}) => {
    const { currentOrder, rootOrder, hierarchy: h } = hierarchy;
    const hasParent = !!h.parent;
    const hasChildren = h.children.length > 0;

    if (!hasParent && !hasChildren) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-gray-400" />
                Pedidos Relacionados
            </h3>

            <div className="space-y-4">
                {/* Parent Order */}
                {h.parent && (
                    <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Pedido Original
                        </div>
                        <OrderNode
                            id={h.parent.id}
                            displayId={h.parent.displayId}
                            status={h.parent.status}
                            quantity={rootOrder?.quantity || currentOrder.quantity}
                            isCurrent={h.parent.id === currentOrderId}
                            basePath={basePath}
                        />
                    </div>
                )}

                {/* Current Order (if it's a child) */}
                {hasParent && (
                    <div className="flex items-center justify-center">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Retrabalho</span>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                )}

                {/* Current Order Node (only if there's a parent) */}
                {hasParent && (
                    <OrderNode
                        id={currentOrder.id}
                        displayId={currentOrder.displayId}
                        status={currentOrder.status}
                        quantity={currentOrder.quantity}
                        revisionNumber={currentOrder.revisionNumber}
                        isCurrent={true}
                        isRework={currentOrder.origin === 'REWORK'}
                        basePath={basePath}
                    />
                )}

                {/* Children Orders */}
                {hasChildren && (
                    <div>
                        <div className="flex items-center justify-center my-3">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center gap-1">
                                <GitBranch className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {h.children.length} retrabalho{h.children.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="space-y-2">
                            {h.children.map((child) => (
                                <OrderNode
                                    key={child.id}
                                    id={child.id}
                                    displayId={child.displayId}
                                    status={child.status}
                                    quantity={child.quantity}
                                    revisionNumber={child.revisionNumber}
                                    isCurrent={child.id === currentOrderId}
                                    isRework={child.origin === 'REWORK'}
                                    basePath={basePath}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHierarchyTree;
