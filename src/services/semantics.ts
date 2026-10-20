/**
 * Semantic skill knowledge: aliases, related-skill edges, and fuzzy matching.
 * Ported from app/semantics.py
 */

export const SKILL_ALIASES: Record<string, string> = {
  // languages
  js: 'javascript',
  ecmascript: 'javascript',
  ts: 'typescript',
  py: 'python',
  python3: 'python',
  golang: 'go',
  csharp: 'c#',
  'c sharp': 'c#',
  cpp: 'c++',
  'c plus plus': 'c++',
  dotnet: '.net',
  '.net core': '.net',
  'asp.net': '.net',
  // front end
  reactjs: 'react',
  'react.js': 'react',
  'react js': 'react',
  vuejs: 'vue',
  'vue.js': 'vue',
  angularjs: 'angular',
  'angular.js': 'angular',
  nextjs: 'next.js',
  'next js': 'next.js',
  nodejs: 'node.js',
  node: 'node.js',
  'node js': 'node.js',
  // data stores
  postgres: 'postgresql',
  psql: 'postgresql',
  'postgre sql': 'postgresql',
  mongo: 'mongodb',
  'elastic search': 'elasticsearch',
  elastic: 'elasticsearch',
  // cloud / infra
  k8s: 'kubernetes',
  k8: 'kubernetes',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  'microsoft azure': 'azure',
  'ci cd': 'ci/cd',
  cicd: 'ci/cd',
  'continuous integration': 'ci/cd',
  'infrastructure as code': 'terraform',
  // data / ml
  ml: 'machine learning',
  dl: 'deep learning',
  'natural language processing': 'nlp',
  'scikit learn': 'scikit-learn',
  sklearn: 'scikit-learn',
  'tensor flow': 'tensorflow',
  'py torch': 'pytorch',
  'data analytics': 'data analysis',
  // misc
  restful: 'rest',
  'rest api': 'rest',
  'restful api': 'rest',
  'structured query language': 'sql',
};

const RELATED_SEED: Record<string, Record<string, number>> = {
  typescript: { javascript: 0.8 },
  react: { javascript: 0.6, html: 0.4, css: 0.4 },
  vue: { javascript: 0.6 },
  angular: { javascript: 0.6 },
  svelte: { javascript: 0.6 },
  'next.js': { react: 0.7, javascript: 0.5 },
  'node.js': { javascript: 0.7 },
  express: { 'node.js': 0.7 },
  fastapi: { python: 0.7, rest: 0.5 },
  django: { python: 0.7 },
  flask: { python: 0.7 },
  pandas: { python: 0.6, 'data analysis': 0.7 },
  numpy: { python: 0.6 },
  'scikit-learn': { 'machine learning': 0.8, python: 0.5 },
  pytorch: { 'machine learning': 0.7, 'deep learning': 0.8, python: 0.5 },
  tensorflow: { 'machine learning': 0.7, 'deep learning': 0.8, python: 0.5 },
  nlp: { 'machine learning': 0.6 },
  spring: { java: 0.7 },
  rails: { ruby: 0.7 },
  laravel: { php: 0.7 },
  postgresql: { sql: 0.8 },
  mysql: { sql: 0.8 },
  sqlite: { sql: 0.7 },
  mongodb: { nosql: 0.8 },
  redis: { nosql: 0.5 },
  kubernetes: { docker: 0.6, devops: 0.7 },
  docker: { devops: 0.6 },
  terraform: { devops: 0.6, aws: 0.35 },
  ansible: { devops: 0.6 },
  jenkins: { 'ci/cd': 0.7, devops: 0.5 },
  'ci/cd': { devops: 0.7 },
  aws: { cloud: 0.8 },
  azure: { cloud: 0.8 },
  gcp: { cloud: 0.8 },
  spark: { hadoop: 0.6, 'big data': 0.7 },
  airflow: { 'data engineering': 0.7 },
  kafka: { microservices: 0.4 },
  graphql: { rest: 0.4, api: 0.7 },
  rest: { api: 0.8 },
};

// Build symmetric related map
const RELATED_GRAPH: Record<string, Record<string, number>> = {};
for (const [a, neighbours] of Object.entries(RELATED_SEED)) {
  if (!RELATED_GRAPH[a]) RELATED_GRAPH[a] = {};
  for (const [b, weight] of Object.entries(neighbours)) {
    RELATED_GRAPH[a][b] = Math.max(RELATED_GRAPH[a][b] || 0, weight);
    if (!RELATED_GRAPH[b]) RELATED_GRAPH[b] = {};
    RELATED_GRAPH[b][a] = Math.max(RELATED_GRAPH[b][a] || 0, weight * 0.7); // slightly diminished reciprocal
  }
}

export function canonical(skill: string): string {
  const s = skill.trim().toLowerCase();
  return SKILL_ALIASES[s] || s;
}

// String similarity (Dice coefficient approximation of SequenceMatcher)
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str: string) => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.substring(i, i + 2));
    }
    return s;
  };

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  let intersection = 0;
  for (const bi of aBigrams) {
    if (bBigrams.has(bi)) intersection++;
  }
  return (2.0 * intersection) / (aBigrams.size + bBigrams.size);
}

export interface ScoreSkillResult {
  score: number;
  via: string | null;
  kind: 'exact' | 'alias' | 'related' | 'typo' | 'none';
}

export function scoreSkill(candidateSkills: Set<string>, requiredSkill: string): ScoreSkillResult {
  const reqCanonical = canonical(requiredSkill);

  // 1. Exact canonical hit
  for (const raw of candidateSkills) {
    const candCanonical = canonical(raw);
    if (candCanonical === reqCanonical) {
      const isAlias = raw.trim().toLowerCase() !== requiredSkill.trim().toLowerCase();
      return {
        score: 1.0,
        via: isAlias ? raw : null,
        kind: isAlias ? 'alias' : 'exact',
      };
    }
  }

  // 2. Related skills
  let bestRelatedScore = 0;
  let bestRelatedVia: string | null = null;
  const relatedToReq = RELATED_GRAPH[reqCanonical];
  if (relatedToReq) {
    for (const raw of candidateSkills) {
      const candCanonical = canonical(raw);
      const weight = relatedToReq[candCanonical];
      if (weight && weight > bestRelatedScore) {
        bestRelatedScore = weight;
        bestRelatedVia = raw;
      }
    }
  }
  if (bestRelatedScore > 0) {
    return {
      score: bestRelatedScore,
      via: bestRelatedVia,
      kind: 'related',
    };
  }

  // 3. Typo / fuzzy match
  for (const raw of candidateSkills) {
    const sim = stringSimilarity(raw.trim().toLowerCase(), requiredSkill.trim().toLowerCase());
    if (sim >= 0.8) {
      return {
        score: 0.85,
        via: raw,
        kind: 'typo',
      };
    }
  }

  return { score: 0, via: null, kind: 'none' };
}
