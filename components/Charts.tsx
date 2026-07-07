import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChartProps {
  data: any[];
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export const AttendanceBarChart: React.FC<ChartProps> = ({ data }) => {
  return (
    <div className="h-72 w-full flex flex-col">
      <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-600" />
              <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-gray-400" tick={{ fill: 'currentColor' }} />
              <YAxis stroke="#6b7280" className="dark:stroke-gray-400" tick={{ fill: 'currentColor' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                cursor={{ fill: '#f3f4f6' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar name="حضور" dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar name="غياب" dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

export const SectorPieChart: React.FC<{ data: { name: string; value: number }[] }> = ({ data }) => {
  return (
    <div className="h-48 w-full flex flex-col">
      <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" verticalAlign="middle" align="left" />
            </PieChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};