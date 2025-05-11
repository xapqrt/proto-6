'use client';

import React from 'react';
import { Bolt } from 'lucide-react';

export const Logo = () => (
  <div className="flex items-center gap-2 p-2">
    <Bolt className="text-primary w-8 h-8 neon-glow" />
    <span className="text-xl font-bold tracking-tight text-primary neon-glow">LifeOS</span>
    {/* Apply styles using styled-jsx, which necessitates this being a client component */}
    <style jsx>{`
      .neon-glow {
        filter: drop-shadow(0 0 5px hsl(var(--primary)/0.7)) drop-shadow(0 0 10px hsl(var(--primary)/0.5));
      }
    `}</style>
  </div>
);

Logo.displayName = "Logo";