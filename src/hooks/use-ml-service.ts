'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  JobMatchResult,
  AtsSimulationResult,
  MLServiceHealth,
  BulletAnalysis,
} from '@/lib/ml-types';
import type { ProjectData } from '@/lib/data';

export function useMlService() {
  const [health, setHealth] = useState<MLServiceHealth>({ status: 'offline' });
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  // Job Matching
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // ATS Simulation
  const [atsSimulation, setAtsSimulation] = useState<AtsSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Manual health check refresh
  const checkHealth = useCallback(async () => {
    setIsHealthChecking(true);
    try {
      const res = await fetch('/api/ml/health', { cache: 'no-store' });
      if (!res.ok) {
        setHealth({ status: 'offline', message: `HTTP ${res.status}` });
        return;
      }
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: 'offline', message: 'Unable to reach local ML API route' });
    } finally {
      setIsHealthChecking(false);
    }
  }, []);

  // Check health on mount
  useEffect(() => {
    let active = true;
    fetch('/api/ml/health', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : { status: 'offline', message: `HTTP ${res.status}` }))
      .then(data => {
        if (!active) return;
        setHealth(data);
        setIsHealthChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setHealth({ status: 'offline', message: 'Unable to reach local ML API route' });
        setIsHealthChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Match resume to job description
  const matchJob = useCallback(
    async (resumeText: string, jobDescription: string) => {
      if (!jobDescription.trim()) {
        setMatchResult(null);
        setMatchError(null);
        return null;
      }

      setIsMatching(true);
      setMatchError(null);

      try {
        const res = await fetch('/api/ml/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jobDescription }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Match request failed' }));
          setMatchError(errData.error || `HTTP ${res.status}`);
          return null;
        }

        const data: JobMatchResult = await res.json();
        setMatchResult(data);
        return data;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Match network error';
        setMatchError(msg);
        return null;
      } finally {
        setIsMatching(false);
      }
    },
    []
  );

  // Score list of bullets
  const scoreBullets = useCallback(
    async (bullets: string[]): Promise<BulletAnalysis[]> => {
      const nonEmpty = bullets.filter(b => b.trim().length > 0);
      if (nonEmpty.length === 0) return [];

      try {
        const res = await fetch('/api/ml/score-bullets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bullets: nonEmpty }),
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.bullets || [];
      } catch {
        return [];
      }
    },
    []
  );

  // Simulate enterprise ATS parsing
  const simulateAts = useCallback(
    async (project: ProjectData, variantId?: string) => {
      setIsSimulating(true);
      setSimulationError(null);

      try {
        const res = await fetch('/api/ml/simulate-ats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project, variantId }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Simulation request failed' }));
          setSimulationError(errData.error || `HTTP ${res.status}`);
          return null;
        }

        const data: AtsSimulationResult = await res.json();
        setAtsSimulation(data);
        return data;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'ATS simulation network error';
        setSimulationError(msg);
        return null;
      } finally {
        setIsSimulating(false);
      }
    },
    []
  );

  return {
    health,
    isHealthChecking,
    checkHealth,
    matchResult,
    isMatching,
    matchError,
    matchJob,
    scoreBullets,
    atsSimulation,
    isSimulating,
    simulationError,
    simulateAts,
  };
}
