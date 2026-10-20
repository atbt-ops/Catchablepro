# Catchablepro (React SPA)

Catchablepro is a skill-based tech job platform built with React 19, Vite, TypeScript, and Tailwind CSS. It introduces transparent semantic skill matching, candidate auto-apply, candidate ranking for recruiters, a hiring pipeline, and a real-time on-demand pricing meter.

## Features

### Candidate Experience
- **Semantic Skill Matching**: Transparent compatibility scoring (0–100%) showing exact matches, related skills (e.g. React gives credit for JavaScript), aliases (e.g. Postgres -> PostgreSQL), and missing requirements.
- **Auto-Apply Engine**: Automatically applies to open jobs where skill match is ≥ 1%.
- **Resume & Skill Extractor**: Upload PDF/DOCX/TXT or paste bio text to auto-detect technical skills and add them to your profile.
- **Hiring Pipeline Tracking**: Track application statuses across `Applied`, `Shortlisted`, `Interview`, `Offered`, `Hired`, and `Rejected` with recruiter notes.
- **Saved Jobs**: Bookmark jobs for later consideration.

### Employer Experience
- **Job Posting & Management**: Post and manage jobs with rich attributes (department, location, work mode, experience range, LPA salary, vacancies, and required skills).
- **AI Skill Assistant**: Automatically extracts normalized skills from free-form job descriptions.
- **On-Demand Pricing Meter**:
  - Week 1 (Days 0–6): **FREE**
  - Week 2 (Days 7–13): ₹50 / day
  - Week 3 (Days 14–20): ₹100 / day
  - Week 4 (Days 21–27): ₹200 / day
  - Week 5 (Days 28–29): ₹400 / day
  - Day 30: Auto-closed (hard cap)
- **Prepaid Wallet (Paise/INR)**: Top-up via simulated Razorpay Checkout with full transaction ledger.
- **Ranked Candidate Matches**: Instant skill-ranked candidate profiles for any job posting with 1-click invitation.
- **Applicant Pipeline Kanban**: Move candidates between stages with private notes.

### Administration & Security
- **Platform KPIs**: Total users, active jobs, applications, and feedback submissions.
- **User & Job Moderation**: Account suspension with reasons and job deletion.
- **Feedback & AI Digest**: Feedback categorization and AI theme clustering.
- **Two-Factor Authentication (TOTP)**: In-app 2FA setup with authenticator verification and emergency recovery codes.
- **Data Privacy**: 1-click JSON export of all account and activity data.

## Running the App

```bash
npm run dev
```

Dev server listens on `http://0.0.0.0:3000`.
Build production assets with:
```bash
npm run build
```
