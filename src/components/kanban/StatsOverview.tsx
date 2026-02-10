import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Order, OrderStatus } from '../../types';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

const pieData = [
  { name: 'Negociação', value: 3, color: '#a855f7' }, 
  { name: 'Produção', value: 8, color: '#0ea5e9' },   
  { name: 'Finalizados', value: 5, color: '#22c55e' },   
];

interface StatsOverviewProps {
  orders: Order[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ orders }) => {
  // Calculate active orders dynamically (excluding Finalized)
  const activeOrdersCount = orders.filter(o => o.status !== OrderStatus.FINALIZED && o.status !== OrderStatus.CANCELLED).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Card 1: Produção */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center gap-1 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
         <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Produção Semanal</span>
            <div className="p-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-md text-brand-600 dark:text-brand-400">
                <TrendingUp className="h-4 w-4" />
            </div>
         </div>
         <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">1.250</span>
            <span className="text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded flex items-center">
              +12%
            </span>
         </div>
      </div>

       {/* Card 2: Financeiro */}
       <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center gap-1 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
         <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">A Receber</span>
            <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md text-green-600 dark:text-green-400">
                <DollarSign className="h-4 w-4" />
            </div>
         </div>
         <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">R$ 14.5k</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">próx. 30 dias</span>
         </div>
      </div>

       {/* Card 3: Pedidos Ativos */}
       <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center gap-1 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
         <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pedidos Ativos</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
            </div>
         </div>
         <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{activeOrdersCount}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">em andamento</span>
         </div>
      </div>

      {/* Card 4: Pipeline (Compacto) */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hidden lg:flex items-center gap-3">
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
                 <Activity className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
                 <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Visão Geral</h4>
            </div>
            <div className="space-y-1">
                {pieData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                            <span className="text-gray-500 dark:text-gray-400 font-medium truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 ml-2">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Gráfico Donut Compacto */}
        <div className="h-20 w-20 relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={35}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ borderRadius: '6px', padding: '4px 8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1f2937', color: '#f3f4f6' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#f3f4f6' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};