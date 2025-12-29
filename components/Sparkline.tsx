import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  isPositive: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({ isPositive }) => {
  // Generate fake data points that trend up or down based on isPositive
  const data = useMemo(() => {
    const points = [];
    let current = 100;
    const trend = isPositive ? 2 : -2;
    
    for (let i = 0; i < 20; i++) {
      // Add randomness + trend
      const noise = (Math.random() - 0.5) * 5;
      current = current + trend + noise;
      points.push({ value: current });
    }
    return points;
  }, [isPositive]);

  const color = isPositive ? '#22c55e' : '#ef4444'; // Tailwind green-500 : red-500

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
