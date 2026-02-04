import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  DollarSign,
  ChevronRight,
  Bell,
} from 'lucide-react';

type AlertType = 'deadline' | 'quality' | 'cost' | 'supplier';
type AlertSeverity = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityId?: string;
  entityType?: 'order' | 'supplier';
  actionUrl?: string;
  createdAt: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  maxItems?: number;
  showHeader?: boolean;
}

const alertTypeConfig: Record<AlertType, { icon: React.ElementType; label: string }> = {
  deadline: { icon: Clock, label: 'Prazo' },
  quality: { icon: TrendingDown, label: 'Qualidade' },
  cost: { icon: DollarSign, label: 'Custo' },
  supplier: { icon: AlertTriangle, label: 'Fornecedor' },
};

const severityConfig: Record<
  AlertSeverity,
  { bg: string; border: string; iconBg: string; iconColor: string; badge: string }
> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800/30',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800/30',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
};

const AlertItem: React.FC<{ alert: Alert }> = ({ alert }) => {
  const typeConfig = alertTypeConfig[alert.type];
  const severity = severityConfig[alert.severity];
  const Icon = typeConfig.icon;

  const content = (
    <div
      className={`group p-3 rounded-xl border ${severity.bg} ${severity.border} transition-all hover:shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${severity.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${severity.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${severity.badge} uppercase`}>
              {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Atenção' : 'Info'}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {alert.title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
            {alert.description}
          </p>
        </div>
        {alert.actionUrl && (
          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        )}
      </div>
    </div>
  );

  if (alert.actionUrl) {
    return (
      <Link to={alert.actionUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  maxItems = 5,
  showHeader = true,
}) => {
  const displayAlerts = alerts.slice(0, maxItems);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden h-full flex flex-col">
      {showHeader && (
        <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Alertas
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} ativo{alerts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                  {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg">
                  {warningCount} atenção
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {displayAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Tudo em ordem!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Nenhum alerta no momento
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {alerts.length > maxItems && (
        <div className="p-4 border-t border-gray-100 dark:border-white/[0.06]">
          <Link
            to="/brand/notificacoes"
            className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
          >
            Ver todos os alertas ({alerts.length})
          </Link>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
