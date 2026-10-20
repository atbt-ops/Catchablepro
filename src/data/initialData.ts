import {
  User,
  CandidateProfile,
  CompanyProfile,
  Job,
  Application,
  SavedJob,
  WalletTransaction,
  AuditLogEntry,
  FeedbackItem,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    email: 'hr@acme.io',
    role: 'employer',
    name: 'Priya Nair',
    company_name: 'Acme Cloud',
    phone: '+91 98765 43210',
    designation: 'Head of Talent',
    email_verified: true,
    is_admin: false,
    is_suspended: false,
    totp_enabled: false,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 2,
    email: 'talent@nimbus.dev',
    role: 'employer',
    name: 'Raj Malhotra',
    company_name: 'Nimbus Labs',
    phone: '+91 98111 22334',
    designation: 'Tech Recruiting Lead',
    email_verified: true,
    is_admin: false,
    is_suspended: false,
    totp_enabled: false,
    created_at: '2026-09-05T11:30:00Z',
  },
  {
    id: 3,
    email: 'asha@example.com',
    role: 'candidate',
    name: 'Asha Verma',
    company_name: '',
    phone: '+91 99200 11223',
    designation: 'Senior Backend Engineer',
    email_verified: true,
    is_admin: false,
    is_suspended: false,
    totp_enabled: false,
    created_at: '2026-09-10T14:15:00Z',
  },
  {
    id: 4,
    email: 'dev@example.com',
    role: 'candidate',
    name: 'Dev Kumar',
    company_name: '',
    phone: '+91 98222 33445',
    designation: 'Full-stack Engineer',
    email_verified: true,
    is_admin: false,
    is_suspended: false,
    totp_enabled: false,
    created_at: '2026-09-12T09:20:00Z',
  },
  {
    id: 5,
    email: 'sam@example.com',
    role: 'candidate',
    name: 'Sam Iyer',
    company_name: '',
    phone: '+91 97333 44556',
    designation: 'DevOps / Cloud Specialist',
    email_verified: true,
    is_admin: false,
    is_suspended: false,
    totp_enabled: false,
    created_at: '2026-09-14T16:45:00Z',
  },
  {
    id: 99,
    email: 'admin@catchablepro.in',
    role: 'employer',
    name: 'Super Admin',
    company_name: 'Catchablepro Operations',
    phone: '+91 90000 00001',
    designation: 'Platform Administrator',
    email_verified: true,
    is_admin: true,
    is_suspended: false,
    totp_enabled: true,
    created_at: '2026-08-01T00:00:00Z',
  },
];

export const INITIAL_COMPANY_PROFILES: Record<number, CompanyProfile> = {
  1: {
    userId: 1,
    industry: 'Cloud Infrastructure',
    size: '201-500 employees',
    website: 'https://acme.io',
    about: 'Acme Cloud builds developer infrastructure for high-scale APIs across global edge networks.',
    hqLocation: 'Bengaluru, India',
    walletBalancePaise: 250000, // ₹2,500
    onboardingStep: 3,
    updatedAt: '2026-09-01T10:00:00Z',
  },
  2: {
    userId: 2,
    industry: 'Product Design Tools',
    size: '51-200 employees',
    website: 'https://nimbus.dev',
    about: 'Nimbus Labs crafts collaborative design tooling for next-gen product teams.',
    hqLocation: 'Hyderabad, India',
    walletBalancePaise: 500000, // ₹5,000
    onboardingStep: 3,
    updatedAt: '2026-09-05T11:30:00Z',
  },
};

export const INITIAL_CANDIDATE_PROFILES: Record<number, CandidateProfile> = {
  3: {
    userId: 3,
    headline: 'Backend Engineer | Distributed Systems & Microservices',
    skills: 'python, fastapi, sql, docker, aws, redis',
    resumeFilename: 'asha_verma_resume.pdf',
    resumeText: 'Experienced Senior Backend Engineer with 5+ years shipping low-latency microservices with Python, FastAPI, Docker, and PostgreSQL.',
    autoApply: true,
    jobAlerts: true,
    updatedAt: '2026-09-10T14:15:00Z',
  },
  4: {
    userId: 4,
    headline: 'Full-stack Developer | React, TypeScript & Node.js',
    skills: 'javascript, react, css, typescript, node.js, python',
    resumeFilename: 'dev_kumar_resume.pdf',
    resumeText: 'Full-stack developer building intuitive UI systems with React, modern CSS, TypeScript, and Express APIs.',
    autoApply: false,
    jobAlerts: true,
    updatedAt: '2026-09-12T09:20:00Z',
  },
  5: {
    userId: 5,
    headline: 'Platform / DevOps Engineer | Kubernetes, Terraform & AWS',
    skills: 'docker, kubernetes, aws, terraform, linux, ci/cd, python',
    resumeFilename: 'sam_iyer_resume.pdf',
    resumeText: 'Site reliability and platform engineer specializing in cloud infra automation with Terraform, Kubernetes, and AWS.',
    autoApply: true,
    jobAlerts: false,
    updatedAt: '2026-09-14T16:45:00Z',
  },
};

// Past date helpers so meters show staggered tiers (free week, paid tier, etc.)
const daysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const INITIAL_JOBS: Job[] = [
  {
    id: 1,
    employerId: 1,
    companyName: 'Acme Cloud',
    title: 'Backend Engineer',
    description: `<h3>Role Overview</h3>
<p>Build low-latency APIs on our cloud platform serving millions of requests per second.</p>
<h4>What you'll do:</h4>
<ul>
  <li>Design and ship high-throughput REST and gRPC microservices in Python & FastAPI</li>
  <li>Own reliability, latency percentiles, and performance budgets</li>
  <li>Mentor junior and mid-level engineers across platform squads</li>
</ul>`,
    requiredSkills: 'python, fastapi, sql, docker, aws',
    location: 'Remote',
    employmentType: 'Full-time',
    workMode: 'Remote',
    expMin: 3,
    expMax: 6,
    salaryMin: 18,
    salaryMax: 32,
    hideSalary: false,
    vacancies: 2,
    education: 'Graduate',
    department: 'Engineering',
    deadline: '2026-12-31',
    status: 'active',
    activeSince: daysAgo(10), // in week 2 (₹50/day)
    billableSeconds: 0,
    createdAt: daysAgo(10),
  },
  {
    id: 2,
    employerId: 1,
    companyName: 'Acme Cloud',
    title: 'Data Engineer',
    description: `<h3>Role Overview</h3>
<p>Own our high-throughput batch and streaming data pipelines processing petabytes of event streams.</p>
<h4>Responsibilities:</h4>
<ul>
  <li>Maintain Apache Spark and Airflow DAGs for analytics and ML feature stores</li>
  <li>Optimize AWS data lake partitioning and SQL queries</li>
  <li>Collaborate closely with AI/ML researchers on model inputs</li>
</ul>`,
    requiredSkills: 'python, sql, airflow, spark, aws',
    location: 'Bengaluru',
    employmentType: 'Full-time',
    workMode: 'Hybrid',
    expMin: 2,
    expMax: 5,
    salaryMin: 14,
    salaryMax: 26,
    hideSalary: false,
    vacancies: 1,
    education: 'Graduate',
    department: 'Data Science',
    deadline: '2026-11-30',
    status: 'active',
    activeSince: daysAgo(2), // week 1 (FREE)
    billableSeconds: 0,
    createdAt: daysAgo(2),
  },
  {
    id: 3,
    employerId: 2,
    companyName: 'Nimbus Labs',
    title: 'Frontend Engineer',
    description: `<h3>About The Team</h3>
<p>Craft delightful, fluid UIs for our next-generation collaborative design and prototyping canvas.</p>
<h4>Key Responsibilities:</h4>
<ul>
  <li>Build reactive UI components with React 19, TypeScript, and clean CSS architectures</li>
  <li>Work on 60fps canvas rendering and real-time multiplayer states</li>
  <li>Partner with product designers to polish micro-interactions</li>
</ul>`,
    requiredSkills: 'javascript, react, css, typescript',
    location: 'Remote',
    employmentType: 'Full-time',
    workMode: 'Remote',
    expMin: 1,
    expMax: 4,
    salaryMin: 10,
    salaryMax: 20,
    hideSalary: false,
    vacancies: 3,
    education: 'Any',
    department: 'Engineering',
    deadline: '2026-12-15',
    status: 'active',
    activeSince: daysAgo(4), // week 1 (FREE)
    billableSeconds: 0,
    createdAt: daysAgo(4),
  },
  {
    id: 4,
    employerId: 2,
    companyName: 'Nimbus Labs',
    title: 'DevOps / Platform Engineer',
    description: `<h3>Role Mission</h3>
<p>Keep our multi-region Kubernetes infrastructure fast, reliable, resilient, and cost-effective.</p>
<h4>Requirements:</h4>
<ul>
  <li>Hands-on experience with Kubernetes clusters, Helm charts, and Docker containerization</li>
  <li>Infrastructure as Code with Terraform and AWS services</li>
  <li>CI/CD pipelines with GitHub Actions or Jenkins</li>
</ul>`,
    requiredSkills: 'docker, kubernetes, aws, terraform, python',
    location: 'Hyderabad',
    employmentType: 'Full-time',
    workMode: 'On-site',
    expMin: 4,
    expMax: 8,
    salaryMin: 22,
    salaryMax: 40,
    hideSalary: true,
    vacancies: 1,
    education: 'Graduate',
    department: 'Engineering',
    deadline: '2026-11-20',
    status: 'active',
    activeSince: daysAgo(22), // week 4 (₹200/day)
    billableSeconds: 0,
    createdAt: daysAgo(22),
  },
  {
    id: 5,
    employerId: 2,
    companyName: 'Nimbus Labs',
    title: 'ML Engineering Intern',
    description: `<h3>Internship Details</h3>
<p>Join our applied AI team for an intensive 6-month hands-on internship in Bengaluru.</p>
<ul>
  <li>Fine-tune vision and multi-modal models with PyTorch</li>
  <li>Develop automated benchmarking and latency profiling tools</li>
</ul>`,
    requiredSkills: 'python, machine learning, pytorch',
    location: 'Bengaluru',
    employmentType: 'Internship',
    workMode: 'On-site',
    expMin: 0,
    expMax: 0,
    salaryMin: 3,
    salaryMax: 5,
    hideSalary: false,
    vacancies: 2,
    education: 'Any',
    department: 'Data Science',
    deadline: '2026-11-10',
    status: 'draft',
    activeSince: '',
    billableSeconds: 0,
    createdAt: daysAgo(5),
  },
];

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 1,
    jobId: 1, // Backend Engineer
    candidateId: 3, // Asha Verma
    matchPct: 100,
    source: 'auto',
    status: 'interview',
    notes: 'Outstanding technical assessment in FastAPI. Invited for system design round.',
    updatedAt: daysAgo(1),
    createdAt: daysAgo(7),
  },
  {
    id: 2,
    jobId: 3, // Frontend Engineer
    candidateId: 4, // Dev Kumar
    matchPct: 100,
    source: 'manual',
    status: 'shortlisted',
    notes: 'Great portfolio project with high quality animations.',
    updatedAt: daysAgo(2),
    createdAt: daysAgo(3),
  },
  {
    id: 3,
    jobId: 4, // DevOps Engineer
    candidateId: 5, // Sam Iyer
    matchPct: 100,
    source: 'auto',
    status: 'applied',
    notes: '',
    updatedAt: daysAgo(5),
    createdAt: daysAgo(5),
  },
];

export const INITIAL_SAVED_JOBS: SavedJob[] = [
  { candidateId: 3, jobId: 2, createdAt: daysAgo(1) },
  { candidateId: 4, jobId: 1, createdAt: daysAgo(2) },
];

export const INITIAL_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 1,
    userId: 1,
    type: 'topup',
    status: 'paid',
    amountPaise: 250000,
    razorpayOrderId: 'order_N8s99x12a9',
    razorpayPaymentId: 'pay_N8s99x44q1',
    note: 'Initial wallet top-up via Razorpay',
    createdAt: daysAgo(15),
  },
  {
    id: 2,
    userId: 2,
    type: 'topup',
    status: 'paid',
    amountPaise: 500000,
    razorpayOrderId: 'order_N9z77y55k2',
    razorpayPaymentId: 'pay_N9z77y88w9',
    note: 'Prepaid top-up for Q4 tech hiring',
    createdAt: daysAgo(25),
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 1,
    actorId: 1,
    actorEmail: 'hr@acme.io',
    action: 'job.create',
    targetType: 'job',
    targetId: 1,
    targetLabel: 'Backend Engineer',
    detail: 'Published job with active meter started',
    ip: '103.212.145.2',
    createdAt: daysAgo(10),
  },
  {
    id: 2,
    actorId: 3,
    actorEmail: 'asha@example.com',
    action: 'application.auto_apply',
    targetType: 'job',
    targetId: 1,
    targetLabel: 'Backend Engineer',
    detail: 'Auto-applied with 100% skill match',
    ip: '115.111.45.67',
    createdAt: daysAgo(7),
  },
  {
    id: 3,
    actorId: 1,
    actorEmail: 'hr@acme.io',
    action: 'pipeline.update',
    targetType: 'application',
    targetId: 1,
    targetLabel: 'Asha Verma',
    detail: 'Moved from shortlisted to interview stage',
    ip: '103.212.145.2',
    createdAt: daysAgo(1),
  },
];

export const INITIAL_FEEDBACK: FeedbackItem[] = [
  {
    id: 1,
    userId: 3,
    role: 'candidate',
    email: 'asha@example.com',
    category: 'praise',
    rating: 5,
    message: 'The semantic skill match breakdown is phenomenal! It explained why my Python and SQL skills gave me full credit for the Backend role.',
    page: '/jobs/1',
    status: 'reviewed',
    createdAt: daysAgo(4),
  },
  {
    id: 2,
    userId: 1,
    role: 'employer',
    email: 'hr@acme.io',
    category: 'feature',
    rating: 4,
    message: 'Would love an option to export shortlisted candidates into an Excel sheet directly from the hiring pipeline.',
    page: '/employer/pipeline',
    status: 'new',
    createdAt: daysAgo(2),
  },
  {
    id: 3,
    userId: 4,
    role: 'candidate',
    email: 'dev@example.com',
    category: 'general',
    rating: 4,
    message: 'Auto-Apply worked seamlessly. Could you add a salary expectation slider on the candidate profile?',
    page: '/account',
    status: 'new',
    createdAt: daysAgo(1),
  },
];
