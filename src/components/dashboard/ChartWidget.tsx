import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend, RadialBarChart, RadialBar 
} from 'recharts';

interface ChartWidgetProps {
  type: 'bar' | 'line' | 'pie' | 'funnel' | 'map';
  data: any[];
}

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#a855f7', '#eab308', '#ec4899'];

export function ChartWidget({ type, data }: ChartWidgetProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
        No analytical records loaded.
      </div>
    );
  }

  // 1. Render Line Chart
  if (type === 'line') {
    return (
      <div className="w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
            <YAxis stroke="#555" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} 
              labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#ea580c', fontSize: '11px' }}
            />
            <Line type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 2. Render Pie/Donut Chart
  if (type === 'pie') {
    return (
      <div className="w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }}
              itemStyle={{ fontSize: '11px' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconSize={8}
              formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 3. Render Area/Funnel Chart
  if (type === 'funnel') {
    return (
      <div className="w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
            <YAxis stroke="#555" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} 
              labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#ea580c', fontSize: '11px' }}
            />
            <Area type="monotone" dataKey="value" stroke="#ea580c" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: Render Bar Chart
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
          <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
          <YAxis stroke="#555" fontSize={10} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} 
            labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
            itemStyle={{ color: '#ea580c', fontSize: '11px' }}
          />
          <Bar dataKey="value" fill="#ea580c" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
