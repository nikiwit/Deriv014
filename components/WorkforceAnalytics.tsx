import React, { useEffect, useState } from 'react';
import { generateStrategicInsights } from '../services/geminiService';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { MOCK_SKILL_GAP_DATA } from '../constants';
import { Lightbulb, Target, TrendingUp } from 'lucide-react';
import { Card } from './design-system/Card';
import { Heading, Text } from './design-system/Typography';
import { Badge } from './design-system/Badge';

export const WorkforceAnalytics: React.FC = () => {
  const [insight, setInsight] = useState<string>('Initializing strategic analysis engine...');

  useEffect(() => {
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
      <div className="lg:col-span-2">
        <Card className="h-full">
          <div className="flex justify-between items-center mb-8">
            <Heading level="h3" className="!text-lg flex items-center">
                <Target className="mr-3 text-derivhr-500" size={24} />
                Skill Gap Analysis
            </Heading>
            <Badge variant="success" className="px-3 py-1 text-xs uppercase tracking-wider">
                Live Data
            </Badge>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%" aspect={1.5}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={MOCK_SKILL_GAP_DATA}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
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
                <Legend wrapperStyle={{ color: '#0f172a', paddingTop: '30px', fontSize: '12px', fontWeight: '600' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <div className="space-y-6">
        <Card className="bg-slate-50 border-slate-200 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                <Lightbulb size={120} className="text-derivhr-900" />
            </div>
            
            <Heading level="h4" className="mb-6 flex items-center relative z-10 !text-sm uppercase tracking-widest text-slate-500">
                <TrendingUp className="mr-2 text-derivhr-500" size={20} />
                Strategic Guidance
            </Heading>
            
            <div className="relative z-10 space-y-4">
                <div className="prose prose-sm text-slate-700 leading-relaxed font-medium">
                   {insight.split('\n').map((line, i) => {
                       if(line.startsWith('-')) return <li key={i} className="text-slate-700 ml-4 mb-2 text-sm">{line.replace('-','')}</li>
                       if(line.length > 0) return <p key={i} className="mb-3 text-sm">{line}</p>
                       return <div key={i} className="h-2" />
                   })}
                </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200 relative z-10">
                <Text weight="bold" size="sm" className="mb-4 uppercase tracking-widest !text-slate-500">Recommended Actions</Text>
                <ul className="space-y-3">
                    <li className="flex items-start text-sm font-semibold text-slate-700">
                        <span className="mr-3 text-derivhr-500 font-bold">→</span>
                        Initiate "AI for Managers" program.
                    </li>
                    <li className="flex items-start text-sm font-semibold text-slate-700">
                        <span className="mr-3 text-derivhr-500 font-bold">→</span>
                        Recruit 2 Senior Data Analysts.
                    </li>
                </ul>
            </div>
        </Card>
      </div>
    </div>
  );
};