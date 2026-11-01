import React, { useState } from 'react';
import { User, CandidateProfile, Job } from '../types';
import { SkillRadarChart, computeSkillAxes, SkillAxisData } from './SkillRadarChart';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  CalendarClock,
  Send,
  Star,
  ExternalLink,
  Target,
  Layers,
  Award,
} from 'lucide-react';

interface CandidateRadarDetailModalProps {
  user: User;
  profile?: CandidateProfile;
  job: Job;
  matchPct: number;
  onClose: () => void;
  onShortlist: (userId: number) => void;
  onSchedule: (userId: number) => void;
  onInvite: (user: User) => void;
}

export const CandidateRadarDetailModal: React.FC<CandidateRadarDetailModalProps> = ({
  user,
  profile,
  job,
  matchPct,
  onClose,
  onShortlist,
  onSchedule,
  onInvite,
}) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillAxisData | null>(null);

  const axes = computeSkillAxes(job.requiredSkills, profile?.skills || '');

  const exactCount = axes.filter((a) => a.kind === 'exact' || a.kind === 'alias').length;
  const partialCount = axes.filter((a) => a.kind === 'related' || a.kind === 'typo').length;
  const missingCount = axes.filter((a) => a.kind === 'missing').length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '880px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              }}
            >
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {user.name}
                </h2>
                <span
                  style={{
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    backgroundColor: matchPct >= 75 ? '#ecfdf5' : matchPct >= 50 ? '#fffbeb' : '#fef2f2',
                    border: `1px solid ${matchPct >= 75 ? '#a7f3d0' : matchPct >= 50 ? '#fde68a' : '#fecdd3'}`,
                    color: matchPct >= 75 ? '#065f46' : matchPct >= 50 ? '#92400e' : '#991b1b',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={13} color={matchPct >= 75 ? '#059669' : '#d97706'} />
                  <span>{matchPct}% Job Match</span>
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '3px 0 0' }}>
                Evaluating for: <strong style={{ color: '#1e293b' }}>{job.title}</strong> ({job.department})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '10px',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Top Quick Summary Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={24} color="#059669" />
              <div>
                <span style={{ fontSize: '1.125rem', fontWeight: 900, color: '#065f46', display: 'block' }}>
                  {exactCount} of {axes.length}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                  Exact / Direct Skills
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={24} color="#d97706" />
              <div>
                <span style={{ fontSize: '1.125rem', fontWeight: 900, color: '#92400e', display: 'block' }}>
                  {partialCount} Skills
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  Related / Transferable
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Target size={24} color="#64748b" />
              <div>
                <span style={{ fontSize: '1.125rem', fontWeight: 900, color: '#1e293b', display: 'block' }}>
                  {missingCount} Skills
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Skill Gap to Probe
                </span>
              </div>
            </div>
          </div>

          {/* Radar Chart & Deep Dive Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 460px) 1fr',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {/* D3 Radar Chart Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={14} />
                  <span>D3 Skill Topology Map</span>
                </span>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Blue polygon = Job Requirement (100%) • Green polygon = Candidate Coverage
                </p>
              </div>

              <SkillRadarChart
                requiredSkillsStr={job.requiredSkills}
                candidateSkillsStr={profile?.skills || ''}
                candidateName={user.name}
                jobTitle={job.title}
                size="lg"
                showLegend={true}
                showLabels={true}
                interactive={true}
                onSkillHover={(skill) => setSelectedSkill(skill)}
              />
            </div>

            {/* Skill Breakdown & Gap Analysis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Dimensional Skill Alignment
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Detailed scoring based on semantic relationships and keyword parsing.
                </p>
              </div>

              {/* Skill Bars List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '310px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {axes.map((axis) => {
                  const isMatch = axis.kind === 'exact' || axis.kind === 'alias';
                  const isPartial = axis.kind === 'related' || axis.kind === 'typo' || axis.kind === 'bonus';
                  const isSelected = selectedSkill?.skill === axis.skill;

                  return (
                    <div
                      key={axis.skill}
                      onMouseEnter={() => setSelectedSkill(axis)}
                      onMouseLeave={() => setSelectedSkill(null)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: isSelected ? '#f1f5f9' : '#ffffff',
                        border: `1px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isMatch ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444',
                            }}
                          />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                            {axis.displaySkill}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: isMatch ? '#059669' : isPartial ? '#d97706' : '#dc2626',
                          }}
                        >
                          {axis.candidateScore}%
                        </span>
                      </div>

                      {/* Progress bar comparing Candidate vs Job Requirement */}
                      <div
                        style={{
                          height: '6px',
                          width: '100%',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${axis.candidateScore}%`,
                            backgroundColor: isMatch ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444',
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>

                      {/* Sub-note */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '6px',
                          fontSize: '0.6875rem',
                          color: '#64748b',
                        }}
                      >
                        <span>
                          {axis.kind === 'exact' && 'Exact match verified in profile'}
                          {axis.kind === 'alias' && `Recognized alias: "${axis.via}"`}
                          {axis.kind === 'related' && `Related: ${axis.via || 'ecosystem'}`}
                          {axis.kind === 'typo' && `Fuzzy match on "${axis.via}"`}
                          {axis.kind === 'missing' && 'Not listed in candidate skills'}
                          {axis.kind === 'bonus' && 'Bonus candidate skill'}
                        </span>
                        <span style={{ fontWeight: 600, color: '#94a3b8' }}>Req: 100%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Candidate Headline & Notes */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Candidate Headline:
                </span>
                <p style={{ color: '#1e293b', margin: 0, fontWeight: 500 }}>
                  {profile?.headline || 'No headline available'}
                </p>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {profile?.skills.split(',').map((s) => (
                    <span
                      key={s.trim()}
                      style={{
                        padding: '1px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.6875rem',
                        color: '#334155',
                      }}
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            <span>Auto-Apply Status: </span>
            <strong style={{ color: profile?.autoApply ? '#059669' : '#64748b' }}>
              {profile?.autoApply ? '⚡ Enabled' : 'Manual'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                onShortlist(user.id);
                onClose();
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#4338ca',
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Star size={15} />
              <span>Shortlist Candidate</span>
            </button>

            <button
              onClick={() => {
                onSchedule(user.id);
                onClose();
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#4f46e5',
                backgroundColor: '#ffffff',
                border: '1px solid #c7d2fe',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CalendarClock size={15} />
              <span>Schedule Interview</span>
            </button>

            <button
              onClick={() => {
                onInvite(user);
                onClose();
              }}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: '#4f46e5',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
              }}
            >
              <Send size={15} />
              <span>Send Direct Invite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
