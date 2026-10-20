/**
 * Semantic skill matching service.
 * Ported from app/matching.py
 */

import { MatchDetailResult } from '../types';
import { scoreSkill } from './semantics';

export const BASE_SKILL_VOCAB = new Set<string>([
  'python', 'java', 'javascript', 'typescript', 'go', 'golang', 'rust', 'c',
  'c++', 'c#', '.net', 'ruby', 'php', 'scala', 'kotlin', 'swift', 'r',
  'html', 'css', 'sql', 'nosql', 'bash', 'shell', 'powershell',
  'react', 'angular', 'vue', 'svelte', 'next.js', 'node.js', 'express',
  'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel',
  'postgresql', 'postgres', 'mysql', 'sqlite', 'mongodb', 'redis',
  'elasticsearch', 'kafka', 'rabbitmq', 'spark', 'hadoop', 'airflow',
  'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'git',
  'aws', 'azure', 'gcp', 'linux', 'nginx', 'graphql', 'rest', 'grpc',
  'machine learning', 'deep learning', 'nlp', 'tensorflow', 'pytorch',
  'pandas', 'numpy', 'data analysis', 'ci/cd', 'devops', 'microservices',
]);

export function parseSkills(raw: string): Set<string> {
  if (!raw) return new Set();
  const parts = raw.replace(/\n/g, ',').split(',');
  const result = new Set<string>();
  for (const p of parts) {
    const trimmed = p.trim().toLowerCase();
    if (trimmed) result.add(trimmed);
  }
  return result;
}

export function matchPct(candidateRaw: string, requiredRaw: string): number {
  const req = parseSkills(requiredRaw);
  const cand = parseSkills(candidateRaw);
  if (req.size === 0) return 0;

  let totalScore = 0;
  for (const want of req) {
    const res = scoreSkill(cand, want);
    totalScore += res.score;
  }
  return Math.round((totalScore / req.size) * 100);
}

export function matchDetail(candidateRaw: string, requiredRaw: string): MatchDetailResult {
  const req = Array.from(parseSkills(requiredRaw)).sort();
  const cand = parseSkills(candidateRaw);

  if (req.length === 0) {
    return { pct: 0, matched: [], partial: [], missing: [] };
  }

  const matched: string[] = [];
  const partial: Array<{ skill: string; via: string; kind: string; pct: number }> = [];
  const missing: string[] = [];
  let totalScore = 0;

  for (const want of req) {
    const res = scoreSkill(cand, want);
    totalScore += res.score;
    if (res.score >= 1.0) {
      matched.push(want);
    } else if (res.score > 0) {
      partial.push({
        skill: want,
        via: res.via || '',
        kind: res.kind,
        pct: Math.round(res.score * 100),
      });
    } else {
      missing.push(want);
    }
  }

  const pct = Math.round((totalScore / req.length) * 100);
  return { pct, matched, partial, missing };
}

export function extractSkills(text: string, extraVocab: string[] = []): Set<string> {
  if (!text) return new Set();
  const textL = text.toLowerCase();
  const vocab = new Set<string>(BASE_SKILL_VOCAB);
  for (const s of extraVocab) {
    if (s.trim()) vocab.add(s.trim().toLowerCase());
  }

  const found = new Set<string>();
  for (const skill of vocab) {
    // Regex boundary to prevent single letters or short names matching inside larger words
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-z0-9+#.])${escaped}(?![a-z0-9+#])`, 'i');
    if (regex.test(textL)) {
      found.add(skill);
    }
  }
  return found;
}
