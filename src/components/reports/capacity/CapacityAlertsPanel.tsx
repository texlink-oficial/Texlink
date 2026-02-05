import React from 'react';
import { AlertTriangle, Info, AlertCircle, TrendingUp } from 'lucide-react';
import {
  CapacityAlert,
  CapacityAlertType,
  CapacityAlertSeverity,
} from '../../../services/capacityReports.service';

interface CapacityAlertsPanelProps {
  alerts: CapacityAlert[];
  isLoading?: boolean;
}

const AlertIcon: React.FC<{ type: CapacityAlertType }> = ({ type }) => {
  const config = {
    [CapacityAlertType.NEAR_FULL]: AlertTriangle,
    [CapacityAlertType.UNDERUTILIZED]: AlertCircle,
    [CapacityAlertType.DEMAND_PEAK]: TrendingUp,
    [CapacityAlertType.NO_CAPACITY]: Info,
  };

  const Icon = config[type];
  return <Icon className="w-5 h-5" />;
};

const AlertCard: React.FC<{ alert: CapacityAlert }> = ({ alert }) => {
  const severityConfig = {
    [CapacityAlertSeverity.CRITICAL]: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800/40',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-900 dark:text-red-100',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    },
    [CapacityAlertSeverity.WARNING]: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/40',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-900 dark:text-amber-100',
      badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    },
    [CapacityAlertSeverity.INFO]: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800/40',
      iconBg: 'bg-gray-100 dark:bg-gray-900/40',
      iconColor: 'text-gray-600 dark:text-gray-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      badge: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
    },
  };

  const config = severityConfig[alert.severity];

  const severityLabels = {
    [CapacityAlertSeverity.CRITICAL]: 'Crítico',
    [CapacityAlertSeverity.WARNING]: 'Atenção',
    [CapacityAlertSeverity.INFO]: 'Info',
  };

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.iconBg} p-2 rounded-lg flex-shrink-0`}>
          <div className={config.iconColor}>
            <AlertIcon type={alert.type} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {alert.supplierName || 'Geral'}
            </p>
            <span
              className={`${config.badge} px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0`}
            >
              {severityLabels[alert.severity]}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {alert.message}
          </p>
          {alert.value !== undefined && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      alert.severity === CapacityAlertSeverity.CRITICAL
                        ? 'bg-red-500'
                        : alert.severity === CapacityAlertSeverity.WARNING
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${Math.min(100, alert.value)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {alert.value.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AlertSkeleton: React.FC = () => (
  <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800/40 rounded-xl p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="flex-1">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  </div>
);

export const CapacityAlertsPanel: React.FC<CapacityAlertsPanelProps> = ({
  alerts,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 lg:p-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      </div>
    );
  }

  // Group alerts by severity
  const criticalAlerts = alerts.filter((a) => a.severity === CapacityAlertSeverity.CRITICAL);
  const warningAlerts = alerts.filter((a) => a.severity === CapacityAlertSeverity.WARNING);
  const infoAlerts = alerts.filter((a) => a.severity === CapacityAlertSeverity.INFO);

  const sortedAlerts = [...criticalAlerts, ...warningAlerts, ...infoAlerts];

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Alertas de Capacidade
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {alerts.length} {alerts.length === 1 ? 'alerta encontrado' : 'alertas encontrados'}
          </p>
        </div>
        {criticalAlerts.length > 0 && (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
            {criticalAlerts.length} crítico{criticalAlerts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Tudo certo!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Nenhum alerta de capacidade no momento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CapacityAlertsPanel;
