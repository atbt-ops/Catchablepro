import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { scoreSkill } from '../services/semantics';
import { parseSkills } from '../services/matching';
import { CheckCircle2, AlertCircle, HelpCircle, XCircle } from 'lucide-react';

export interface SkillAxisData {
  skill: string;
  displaySkill: string;
  requiredScore: number; // 0 - 100
  candidateScore: number; // 0 - 100
  kind: 'exact' | 'alias' | 'related' | 'typo' | 'missing' | 'bonus' | 'none';
  via?: string | null;
  rawScore: number; // 0.0 - 1.0
}

interface SkillRadarChartProps {
  requiredSkillsStr: string;
  candidateSkillsStr: string;
  candidateName?: string;
  jobTitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  showTooltips?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  onSkillHover?: (skill: SkillAxisData | null) => void;
}

export function computeSkillAxes(
  requiredSkillsStr: string,
  candidateSkillsStr: string
): SkillAxisData[] {
  const reqSet = parseSkills(requiredSkillsStr);
  const candSet = parseSkills(candidateSkillsStr);

  const reqList = Array.from(reqSet);

  const axes: SkillAxisData[] = reqList.map((reqSkill) => {
    const res = scoreSkill(candSet, reqSkill);
    const scorePct = Math.round(res.score * 100);
    const kind: SkillAxisData['kind'] =
      res.score >= 1.0
        ? res.kind
        : res.score > 0
        ? res.kind === 'none'
          ? 'related'
          : res.kind
        : 'missing';

    // Format display name nicely (capitalize first letter of words or known acronyms)
    const displayName = formatSkillName(reqSkill);

    return {
      skill: reqSkill,
      displaySkill: displayName,
      requiredScore: 100, // standard benchmark for required job skills
      candidateScore: scorePct,
      kind,
      via: res.via,
      rawScore: res.score,
    };
  });

  // Radar charts need at least 3 axes to form a 2D polygon.
  // If fewer than 3 required skills, add complementary candidate skills or foundational competencies.
  if (axes.length < 3) {
    const candidateList = Array.from(candSet).filter(
      (c) => !reqList.some((r) => r.toLowerCase() === c.toLowerCase())
    );

    let addedCount = 0;
    for (const extra of candidateList) {
      if (axes.length >= 3) break;
      axes.push({
        skill: extra,
        displaySkill: formatSkillName(extra) + ' (Bonus)',
        requiredScore: 60, // Baseline complementary target
        candidateScore: 90,
        kind: 'bonus',
        via: null,
        rawScore: 0.9,
      });
      addedCount++;
    }

    // If still < 3, add standard engineering baseline dimensions
    const fallbacks = ['System Design', 'Code Quality', 'Collaboration'];
    let fbIndex = 0;
    while (axes.length < 3 && fbIndex < fallbacks.length) {
      const fb = fallbacks[fbIndex++];
      axes.push({
        skill: fb.toLowerCase(),
        displaySkill: fb,
        requiredScore: 80,
        candidateScore: 75,
        kind: 'related',
        via: 'Profile baseline',
        rawScore: 0.75,
      });
    }
  }

  return axes;
}

function formatSkillName(raw: string): string {
  const special: Record<string, string> = {
    sql: 'SQL',
    aws: 'AWS',
    gcp: 'GCP',
    css: 'CSS',
    html: 'HTML',
    nlp: 'NLP',
    api: 'API',
    'ci/cd': 'CI/CD',
    'next.js': 'Next.js',
    'node.js': 'Node.js',
    'vue.js': 'Vue.js',
    'react.js': 'React',
    fastapi: 'FastAPI',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    postgresql: 'PostgreSQL',
    mongodb: 'MongoDB',
    kubernetes: 'Kubernetes',
    docker: 'Docker',
    python: 'Python',
  };

  const lower = raw.trim().toLowerCase();
  if (special[lower]) return special[lower];

  return raw
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  requiredSkillsStr,
  candidateSkillsStr,
  candidateName = 'Candidate',
  jobTitle = 'Role',
  size = 'md',
  showLegend = true,
  showTooltips = true,
  showLabels = true,
  interactive = true,
  onSkillHover,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const axes = useMemo(
    () => computeSkillAxes(requiredSkillsStr, candidateSkillsStr),
    [requiredSkillsStr, candidateSkillsStr]
  );

  // Dimensions based on size preset
  const dim = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          width: 270,
          height: 250,
          margin: 42,
          levels: 4,
          labelFontSize: '10px',
          dotRadius: 4,
          hoverDotRadius: 6,
        };
      case 'lg':
        return {
          width: 440,
          height: 380,
          margin: 68,
          levels: 5,
          labelFontSize: '12px',
          dotRadius: 5.5,
          hoverDotRadius: 8,
        };
      case 'md':
      default:
        return {
          width: 330,
          height: 290,
          margin: 52,
          levels: 4,
          labelFontSize: '11px',
          dotRadius: 5,
          hoverDotRadius: 7.5,
        };
    }
  }, [size]);

  const centerX = dim.width / 2;
  const centerY = dim.height / 2;
  const maxRadius = Math.min(centerX, centerY) - dim.margin;

  // D3 Scale for radius: 0 -> 100 maps to 0 -> maxRadius
  const rScale = useMemo(() => {
    return d3.scaleLinear().domain([0, 100]).range([0, maxRadius]);
  }, [maxRadius]);

  const totalAxes = axes.length;
  const angleSlice = (Math.PI * 2) / totalAxes;

  // Calculate polygon vertices for a given score accessor
  const calculatePolygonCoords = (getScore: (a: SkillAxisData) => number) => {
    return axes.map((axis, i) => {
      const score = Math.max(getScore(axis), 4); // Keep minimum 4% so polygon stays visible
      const r = rScale(score);
      const angle = angleSlice * i - Math.PI / 2; // -PI/2 puts first axis at 12 o'clock
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return { x, y, score, axis, angle, index: i };
    });
  };

  const jobPoints = useMemo(
    () => calculatePolygonCoords((a) => a.requiredScore),
    [axes, angleSlice, centerX, centerY, rScale]
  );

  const candidatePoints = useMemo(
    () => calculatePolygonCoords((a) => a.candidateScore),
    [axes, angleSlice, centerX, centerY, rScale]
  );

  const jobPointsString = jobPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const candidatePointsString = candidatePoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Concentric levels grid
  const levelValues = useMemo(() => {
    const step = 100 / dim.levels;
    const vals: number[] = [];
    for (let i = 1; i <= dim.levels; i++) {
      vals.push(Math.round(i * step));
    }
    return vals;
  }, [dim.levels]);

  const handleMouseEnter = (idx: number) => {
    if (!interactive) return;
    setHoveredIndex(idx);
    if (onSkillHover) {
      onSkillHover(axes[idx]);
    }
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoveredIndex(null);
    if (onSkillHover) {
      onSkillHover(null);
    }
  };

  // Overall match average
  const avgCandidateMatch = useMemo(() => {
    if (axes.length === 0) return 0;
    const sum = axes.reduce((acc, curr) => acc + curr.candidateScore, 0);
    return Math.round(sum / axes.length);
  }, [axes]);

  const activeAxis = hoveredIndex !== null ? axes[hoveredIndex] : null;
  const activeCandPoint = hoveredIndex !== null ? candidatePoints[hoveredIndex] : null;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {/* Legend & Summary */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: `${dim.width}px`,
            padding: '4px 8px 8px',
            fontSize: '11px',
            color: '#475569',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Job Target */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(99, 102, 241, 0.25)',
                  border: '1.5px dashed #6366f1',
                }}
              />
              <span style={{ fontWeight: 600, color: '#4f46e5' }}>Job Target</span>
            </div>

            {/* Candidate Match */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.4)',
                  border: '2px solid #10b981',
                }}
              />
              <span style={{ fontWeight: 700, color: '#047857' }}>
                {candidateName.split(' ')[0]} ({avgCandidateMatch}%)
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: avgCandidateMatch >= 75 ? '#ecfdf5' : avgCandidateMatch >= 50 ? '#fffbeb' : '#f8fafc',
              color: avgCandidateMatch >= 75 ? '#065f46' : avgCandidateMatch >= 50 ? '#92400e' : '#64748b',
              border: `1px solid ${avgCandidateMatch >= 75 ? '#a7f3d0' : avgCandidateMatch >= 50 ? '#fde68a' : '#e2e8f0'}`,
            }}
          >
            {axes.length} Dimensions
          </span>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        width={dim.width}
        height={dim.height}
        viewBox={`0 0 ${dim.width} ${dim.height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Candidate Polygon Gradient */}
          <linearGradient id={`radarGrad-${candidateName.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
          </linearGradient>

          {/* Job Target Gradient */}
          <linearGradient id="jobReqGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.04" />
          </linearGradient>

          {/* Drop shadow filter for active point */}
          <filter id="radarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#047857" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Background Concentric Polygons / Rings */}
        <g className="grid-levels">
          {levelValues.map((level) => {
            const r = rScale(level);
            const levelPoints = axes
              .map((_, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <g key={`level-${level}`}>
                <polygon
                  points={levelPoints}
                  fill="none"
                  stroke={level === 100 ? '#cbd5e1' : '#e2e8f0'}
                  strokeWidth={level === 100 ? '1.5' : '1'}
                  strokeDasharray={level === 100 ? undefined : '2 3'}
                />
                {/* Level Percentage Label on 12 o'clock axis */}
                <text
                  x={centerX + 4}
                  y={centerY - r + 3}
                  fontSize="9px"
                  fontWeight="600"
                  fill="#94a3b8"
                  textAnchor="start"
                >
                  {level}%
                </text>
              </g>
            );
          })}
        </g>

        {/* 2. Axis Spokes radiating from center */}
        <g className="grid-spokes">
          {axes.map((axis, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const endX = centerX + maxRadius * Math.cos(angle);
            const endY = centerY + maxRadius * Math.sin(angle);
            const isHovered = hoveredIndex === i;

            return (
              <line
                key={`spoke-${axis.skill}-${i}`}
                x1={centerX}
                y1={centerY}
                x2={endX}
                y2={endY}
                stroke={isHovered ? '#6366f1' : '#e2e8f0'}
                strokeWidth={isHovered ? '2' : '1'}
                strokeDasharray={isHovered ? undefined : '3 3'}
                style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
              />
            );
          })}
        </g>

        {/* 3. Job Benchmark / Requirement Polygon */}
        <g className="job-requirement-layer">
          <polygon
            points={jobPointsString}
            fill="url(#jobReqGrad)"
            stroke="#6366f1"
            strokeWidth="1.75"
            strokeDasharray="4 4"
            style={{ transition: 'all 0.3s ease' }}
          />
          {jobPoints.map((pt) => (
            <rect
              key={`job-pt-${pt.index}`}
              x={pt.x - 3}
              y={pt.y - 3}
              width={6}
              height={6}
              transform={`rotate(45, ${pt.x}, ${pt.y})`}
              fill="#6366f1"
              opacity={0.7}
            />
          ))}
        </g>

        {/* 4. Candidate Skill Alignment Polygon */}
        <g className="candidate-skill-layer">
          <polygon
            points={candidatePointsString}
            fill={`url(#radarGrad-${candidateName.replace(/\s+/g, '')})`}
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />

          {/* Vertex circles for candidate scores */}
          {candidatePoints.map((pt) => {
            const isHovered = hoveredIndex === pt.index;
            const isMatch = pt.axis.kind === 'exact' || pt.axis.kind === 'alias';
            const isPartial = pt.axis.kind === 'related' || pt.axis.kind === 'typo' || pt.axis.kind === 'bonus';
            const vertexColor = isMatch ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';

            return (
              <g
                key={`cand-pt-${pt.index}`}
                onMouseEnter={() => handleMouseEnter(pt.index)}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
              >
                {/* Hit target helper */}
                <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />

                {/* Outer ring on hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={dim.hoverDotRadius + 4}
                    fill={vertexColor}
                    fillOpacity="0.25"
                    style={{ transition: 'all 0.2s ease' }}
                  />
                )}

                {/* Main vertex dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? dim.hoverDotRadius : dim.dotRadius}
                  fill={vertexColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter={isHovered ? 'url(#radarGlow)' : undefined}
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            );
          })}
        </g>

        {/* 5. Axis Labels around the radar perimeter */}
        {showLabels && (
          <g className="axis-labels">
            {axes.map((axis, i) => {
              const angle = angleSlice * i - Math.PI / 2;
              const labelRadius = maxRadius + (size === 'sm' ? 18 : 24);
              const lx = centerX + labelRadius * Math.cos(angle);
              const ly = centerY + labelRadius * Math.sin(angle);

              // Determine text anchor
              const cos = Math.cos(angle);
              const textAnchor: 'start' | 'middle' | 'end' =
                Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';

              const isHovered = hoveredIndex === i;
              const isMatch = axis.kind === 'exact' || axis.kind === 'alias';
              const isPartial = axis.kind === 'related' || axis.kind === 'typo' || axis.kind === 'bonus';
              const badgeColor = isMatch ? '#065f46' : isPartial ? '#92400e' : '#991b1b';
              const badgeBg = isMatch ? '#ecfdf5' : isPartial ? '#fffbeb' : '#fef2f2';

              return (
                <g
                  key={`label-${axis.skill}-${i}`}
                  onMouseEnter={() => handleMouseEnter(i)}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                >
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={textAnchor}
                    fontSize={dim.labelFontSize}
                    fontWeight={isHovered ? '800' : '600'}
                    fill={isHovered ? '#1e1b4b' : '#334155'}
                    dominantBaseline="central"
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    {axis.displaySkill}
                  </text>
                  {/* Score pill beneath/adjacent to label */}
                  <text
                    x={lx}
                    y={ly + (size === 'sm' ? 11 : 13)}
                    textAnchor={textAnchor}
                    fontSize="9.5px"
                    fontWeight="700"
                    fill={badgeColor}
                    dominantBaseline="central"
                  >
                    {axis.candidateScore}%
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {showTooltips && activeAxis && activeCandPoint && (
        <div
          style={{
            position: 'absolute',
            top: `${Math.max(10, activeCandPoint.y - 45)}px`,
            left: `${Math.min(dim.width - 150, Math.max(10, activeCandPoint.x - 70))}px`,
            pointerEvents: 'none',
            zIndex: 30,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '160px',
            maxWidth: '220px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#e2e8f0' }}>
              {activeAxis.displaySkill}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor:
                  activeAxis.candidateScore >= 80
                    ? '#064e3b'
                    : activeAxis.candidateScore > 0
                    ? '#78350f'
                    : '#7f1d1d',
                color:
                  activeAxis.candidateScore >= 80
                    ? '#6ee7b7'
                    : activeAxis.candidateScore > 0
                    ? '#fcd34d'
                    : '#fca5a5',
              }}
            >
              {activeAxis.candidateScore}%
            </span>
          </div>

          <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Job Demand:</span>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>{activeAxis.requiredScore}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Candidate:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{activeAxis.candidateScore}%</span>
            </div>
            <div style={{ marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #1e293b' }}>
              <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>
                {activeAxis.kind === 'exact' && '✓ Exact technology match'}
                {activeAxis.kind === 'alias' && `✓ Matched via alias "${activeAxis.via}"`}
                {activeAxis.kind === 'related' && `⚡ Related skill (${activeAxis.via || 'ecosystem'})`}
                {activeAxis.kind === 'typo' && `~ Close semantic syntax match`}
                {activeAxis.kind === 'missing' && '✗ Not detected in candidate profile'}
                {activeAxis.kind === 'bonus' && '★ Bonus capability'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
