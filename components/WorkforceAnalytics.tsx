import React, { useEffect, useState } from 'react';
import { generateStrategicInsights } from '../services/geminiService';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { MOCK_SKILL_GAP_DATA } from '../constants';
import { Lightbulb, Target, TrendingUp } from 'lucide-react';

export const WorkforceAnalytics: React.FC = () => {
  const [insight, setInsight] = useState<string>('Initializing strategic analysis engine...');

  useEffect(() => {
    // Simulate fetching complex analysis on mount
    const fetchInsights = async () => {
        const dummyData = JSON.stringify(MOCK_SKILL_GAP_DATA);
        const result = await generateStrategicInsights(dummyData);
        setInsight(result);
    };
    fetchInsights();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Chart Section */}
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 flex items-center tracking-tight uppercase text-sm tracking-widest">
                <Target className="mr-3 text-derivhr-500" size={24} />
                Skill Gap Analysis
            </h3>
            <span className="px-3 py-1 bg-derivhr-50 text-derivhr-600 border border-derivhr-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                Live Data
            </span>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={MOCK_SKILL_GAP_DATA}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar
                  name="Current Capability"
                  dataKey="A"
                  stroke="#FF444F"
                  strokeWidth={3}
                  fill="#FF444F"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Strategic Target (2025)"
                  dataKey="B"
                  stroke="#00B67B"
                  strokeWidth={3}
                  fill="#00B67B"
                  fillOpacity={0.1}
                />
                <Legend wrapperStyle={{ color: '#0f172a', paddingTop: '30px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="space-y-6">
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                <Lightbulb size={120} className="text-derivhr-900" />
            </div>
            
            <h3 className="text-xs font-black text-derivhr-900 mb-6 flex items-center relative z-10 uppercase tracking-widest">
                <TrendingUp className="mr-2 text-derivhr-500" size={20} />
                Strategic Guidance
            </h3>
            
            <div className="relative z-10 space-y-4">
                <div className="prose prose-sm text-slate-700 leading-relaxed font-medium">
                   {/* Simulate Markdown rendering simply by line splitting for the demo */}
                   {insight.split('\n').map((line, i) => {
                       if(line.startsWith('-')) return <li key={i} className="text-slate-700 ml-4 mb-2">{line.replace('-','')}</li>
                       if(line.length > 0) return <p key={i} className="mb-3">{line}</p>
                       return <br key={i}/>
                   })}
                </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200 relative z-10">
                <h4 className="text-[10px] font-black text-derivhr-700 mb-4 uppercase tracking-widest">Recommended Actions</h4>
                <ul className="space-y-3 text-xs text-slate-600 font-bold">
                    <li className="flex items-start">
                        <span className="mr-3 text-derivhr-500">→</span>
                        Initiate "AI for Managers" program.
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3 text-derivhr-500">→</span>
                        Recruit 2 Senior Data Analysts.
                    </li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};