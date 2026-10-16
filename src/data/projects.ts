export type ShapeType = 'hexagon' | 'circle' | 'square' | 'clover';

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  shapeType: ShapeType;
  color: string;
  accentTextColor?: string;
  summary: string;
  description: string;
  keyFeatures: string[];
  tags: string[];
  demoUrl?: string;
  githubUrl?: string;
  coverImage?: string;
  galleryImages?: string[];
  metrics: { label: string; value: string }[];
  year: string;
  published: boolean;
  featuredOnMobile: boolean;
  order: number;
  updatedAt?: number;
}

export interface SiteSettings {
  brandName: string;
  aboutBadge: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  contactEmail: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    discord?: string;
    reddit?: string;
    linkedin?: string;
    instagram?: string;
  };
  adminWhitelistEmails: string[];
}

export const CURATED_PALETTE = [
  { name: 'Coral Orange', hex: '#FF864A' },
  { name: 'Electric Blue', hex: '#5E9BFF' },
  { name: 'Mint Green', hex: '#48F08B' },
  { name: 'Bubblegum Pink', hex: '#FFBDF9' },
  { name: 'Sunflower Yellow', hex: '#FCC934' },
  { name: 'Ultraviolet Lavender', hex: '#A78BFA' },
  { name: 'Watermelon Red', hex: '#FF6B6B' },
  { name: 'Cyan Frost', hex: '#38BDF8' },
] as const;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandName: 'Muhammad Nurrudin Praseptyo',
  aboutBadge: 'Creative Technologist',
  aboutTitle: 'Muhammad Nurrudin Praseptyo',
  aboutParagraphs: [
    'I am Muhammad Nurrudin Praseptyo, a creative engineer and full-stack technologist focused on crafting interactive digital experiences, generative systems, and high-performance software.',
    'Every tumbling shape in this physics playground represents a project or experiment. Tap or toss any shape to explore case studies, architectural breakdowns, live demos, and technical metrics.'
  ],
  contactEmail: 'contact@mnpraseptyo.com',
  socialLinks: {
    github: 'https://github.com/ThioNP',
    linkedin: 'https://linkedin.com/in/mnpraseptyo',
    instagram: 'https://instagram.com/mnpraseptyo',
  },
  adminWhitelistEmails: []
};

export const PROJECTS: Project[] = [
  {
    id: 'agentic-ai',
    title: 'Agentic Workflow Studio',
    subtitle: 'Autonomous Multi-Agent Orchestration Platform',
    category: 'Artificial Intelligence',
    shapeType: 'hexagon',
    color: '#FF864A', // Coral Orange
    summary: 'A visual canvas and runtime environment for coordinating autonomous reasoning agents with live tool execution.',
    description: 'Designed and built a reactive orchestration engine where LLM agents collaborate on complex reasoning workflows. Includes streaming token visualizers, real-time memory inspection, and secure client-side sandbox execution.',
    keyFeatures: [
      'Bidirectional streaming with WebSocket & WebWorker thread isolation',
      'Dynamic acyclic graph (DAG) scheduler with automatic deadlock resolution',
      'Memory vector index caching reducing repetitive LLM calls by 64%'
    ],
    tags: ['TypeScript', 'React', 'Web Workers', 'Node.js', 'Vector DB'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Latency', value: '<45ms' },
      { label: 'Token Efficiency', value: '+64%' },
      { label: 'Agents / Canvas', value: '50+' }
    ],
    year: '2026',
    published: true,
    featuredOnMobile: true,
    order: 0
  },
  {
    id: 'neural-synth',
    title: 'Neural Audio Canvas',
    subtitle: 'Zero-Latency Web Audio & Spectral Synthesizer',
    category: 'Creative Tech',
    shapeType: 'circle',
    color: '#5E9BFF', // Electric Blue
    summary: 'Browser-based granular audio synthesizer powered by WebAudio DSP and neural timbre transfer.',
    description: 'An experimental playground transforming sketches and vector drawings into evolving spatial soundscapes. Built with WebAudio AudioWorklets running custom C++ DSP algorithms compiled to WebAssembly.',
    keyFeatures: [
      'Ultra low latency (<12ms) WebAudio AudioWorklet pipeline',
      'Custom WebAssembly DSP kernel for additive & granular synthesis',
      'Interactive vector spectrogram with 60 FPS Canvas visualizer'
    ],
    tags: ['WebAudio', 'WebAssembly', 'C++', 'DSP', 'Three.js'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Audio Latency', value: '11.8ms' },
      { label: 'Frame Rate', value: '60 FPS' },
      { label: 'Voice Polyphony', value: '32 Ch' }
    ],
    year: '2025',
    published: true,
    featuredOnMobile: true,
    order: 1
  },
  {
    id: 'hyper-graph',
    title: 'Distributed State Mesh',
    subtitle: 'Peer-to-Peer Conflict-Free Realtime Database',
    category: 'Systems Architecture',
    shapeType: 'hexagon',
    color: '#48F08B', // Mint Green
    summary: 'A high-throughput CRDT sync engine built for offline-first local applications with instantaneous peer reconciliation.',
    description: 'Developed an embedded CRDT data engine enabling fluid multiplayer collaboration without requiring a centralized coordinator. Features encrypted WebRTC data channels with deterministic state convergence.',
    keyFeatures: [
      'State-based CRDTs with state vector compression',
      'End-to-end encrypted peer mesh via WebRTC DataChannels',
      'IndexedDB persistent ledger with optimistic local updates'
    ],
    tags: ['CRDTs', 'WebRTC', 'IndexedDB', 'Rust', 'Wasm'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Sync Time', value: '8ms' },
      { label: 'Bandwidth Saved', value: '78%' },
      { label: 'Max Peers', value: '128' }
    ],
    year: '2025',
    published: true,
    featuredOnMobile: true,
    order: 2
  },
  {
    id: 'fluid-design',
    title: 'Kinetic Design System',
    subtitle: 'Physics-Based Micro-Interactions & UI Foundation',
    category: 'UI/UX & Design',
    shapeType: 'square',
    color: '#48F08B', // Soft Mint Square
    summary: 'A component library driven by spring physics, spatial depth, and tactile audio feedback.',
    description: 'An open-source design system engineered to bridge physical product industrial design with high-craft digital interfaces. All animations use damping equations rather than artificial bezier curves.',
    keyFeatures: [
      'Euler spring simulation engine for layout transitions',
      'Adaptive high-contrast accessibility compliant with WCAG 2.2 AAA',
      'Synthesized tactile haptic clicks via WebAudio micro-transients'
    ],
    tags: ['Design Systems', 'CSS Architecture', 'Spring Physics', 'A11y'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Bundle Size', value: '4.2 KB' },
      { label: 'WCAG Rating', value: 'AAA' },
      { label: 'Adoption', value: '18k+ stars' }
    ],
    year: '2025',
    published: true,
    featuredOnMobile: true,
    order: 3
  },
  {
    id: 'spatial-viewport',
    title: 'Voxel Space Engine',
    subtitle: 'Volumetric NeRF & Gaussian Splatting Viewer',
    category: 'Computer Graphics',
    shapeType: 'square',
    color: '#FFBDF9', // Bubblegum Pink
    summary: 'Real-time 3D Gaussian Splatting rendering engine running at 120 FPS on modern web browsers.',
    description: 'Pioneered WebGPU-based tile rasterization for neural radiance fields and 3D Gaussian Splats. Allows photorealistic spatial captures of architectural monuments to be inspected smoothly across mobile and desktop.',
    keyFeatures: [
      'WebGPU compute shader sort and radix prefix-sum',
      'Dynamic LOD octree for streaming multi-gigabyte splat files',
      'Mobile progressive rendering with automatic quality throttling'
    ],
    tags: ['WebGPU', 'WGSL', 'Compute Shaders', '3D Graphics', 'Math'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Render FPS', value: '120 FPS' },
      { label: 'Splat Capacity', value: '2.5M+' },
      { label: 'VRAM Usage', value: '140 MB' }
    ],
    year: '2026',
    published: true,
    featuredOnMobile: true,
    order: 4
  },
  {
    id: 'biomimic-flow',
    title: 'Chrono Genetic Algorithm',
    subtitle: 'Evolutionary Topology Optimization Engine',
    category: 'Computational Design',
    shapeType: 'clover',
    color: '#FCC934', // Sunflower Yellow
    summary: 'Generative design tool that evolves ultra-lightweight structural lattices using biomechanical bone remodeling algorithms.',
    description: 'Simulates cellular bone remodeling (Wolff’s law) and finite element analysis directly in browser threads, allowing industrial designers to produce 3D-printable structural components with 50% less material.',
    keyFeatures: [
      '2D/3D Finite Element Analysis (FEA) solver in parallel threads',
      'Generative stress-flow vector topology optimization',
      'Direct STEP and STL mesh export for additive manufacturing'
    ],
    tags: ['Generative Design', 'Finite Element', 'Web Workers', 'Topology'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Material Saved', value: '-48%' },
      { label: 'Solve Duration', value: '1.2s' },
      { label: 'Stress Factor', value: '2.4x' }
    ],
    year: '2024',
    published: true,
    featuredOnMobile: false,
    order: 5
  },
  {
    id: 'stellar-cloud',
    title: 'Edge Compute Kernel',
    subtitle: 'Serverless Micro-VM Platform with Sub-Millisecond Cold Starts',
    category: 'Cloud Infrastructure',
    shapeType: 'circle',
    color: '#5E9BFF', // Cobalt Blue
    summary: 'A distributed edge virtualization runtime that spins up WebAssembly isolated sandboxes across 300 global cities.',
    description: 'Engineered an edge execution runtime leveraging V8 isolates and Wasm compilation. Achieved sub-millisecond cold starts, automated memory pooling, and unified HTTP/WebSocket wire routing.',
    keyFeatures: [
      'Sub-millisecond isolate instantiation with snapshot pre-warming',
      'Strict memory isolation with hardware-enforced CPU quotas',
      'Global geo-routing with active latency-based health steering'
    ],
    tags: ['Edge Computing', 'Rust', 'V8', 'Wasm', 'Networking'],
    demoUrl: 'https://github.com',
    githubUrl: 'https://github.com',
    metrics: [
      { label: 'Cold Start', value: '0.8ms' },
      { label: 'Global PoPs', value: '310+' },
      { label: 'Throughput', value: '250k rps' }
    ],
    year: '2024',
    published: true,
    featuredOnMobile: false,
    order: 6
  }
];
