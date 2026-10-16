import React, { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import type { Project } from '../data/projects';
import { PROJECTS } from '../data/projects';
import { SHAPE_GEOMETRIES, samplePathToVertices } from '../lib/shapeGeometry';
import { ArrowRight } from 'lucide-react';

interface ShapeInstance {
  project: Project;
  body: Matter.Body;
  element: HTMLDivElement;
  pathElement: SVGPathElement;
  offset: { x: number; y: number };
  halfSize: number;
}

interface PhysicsHeroProps {
  projects?: Project[];
  onSelectProject: (project: Project, rect: DOMRect) => void;
}

export const PhysicsHero: React.FC<PhysicsHeroProps> = React.memo(({ projects = PROJECTS, onSelectProject }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const instancesRef = useRef<ShapeInstance[]>([]);
  const pointerStartRef = useRef<{ x: number; y: number; time: number; hasDragged: boolean } | null>(null);
  const activeHoverTargetRef = useRef<Project | null>(null);
  const lastWidthRef = useRef<number>(0);

  // Keep latest projects & onSelectProject in refs so opening/closing modals NEVER resets physics
  const projectsRef = useRef<Project[]>(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const onSelectProjectRef = useRef(onSelectProject);
  useEffect(() => {
    onSelectProjectRef.current = onSelectProject;
  }, [onSelectProject]);

  // Structural signature only changes when published shapes, their geometry/color, or order change
  const shapeStructureSignature = projects
    .filter((p) => p.published !== false)
    .map((p) => `${p.id}:${p.shapeType}:${p.color}:${p.order}:${p.featuredOnMobile}`)
    .join('|');

  const initPhysics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up any existing instances
    instancesRef.current.forEach(({ element }) => {
      if (element.parentElement) {
        element.parentElement.removeChild(element);
      }
    });
    instancesRef.current = [];

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    lastWidthRef.current = window.innerWidth;

    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;

    // Google Labs scale factor:
    // Scale calibrated so shapes tumble comfortably into 2 tiers
    const baseShapeSize = isMobile 
      ? Math.min(width * 0.42, 160) 
      : isTablet 
        ? Math.min(width * 0.26, 210) 
        : Math.min(width * 0.22, 270);

    // 1. Create Engine & Runner matching Google Labs parameters
    const engine = Matter.Engine.create({
      positionIterations: 8,
      velocityIterations: 6,
    });
    engine.gravity.y = 1.0; // Google Labs natural gravity

    const runner = Matter.Runner.create({ delta: 1000 / 60 });

    // 2. Set Boundary Walls (Floor, Left, Right, High Ceiling)
    const wallThickness = 500;
    const ceilingOffset = 3000;
    const floorY = height - 2; // Exact ground line
    const floor = Matter.Bodies.rectangle(
      width / 2,
      floorY + wallThickness / 2,
      width + wallThickness * 2,
      wallThickness,
      { isStatic: true, friction: 0.95 }
    );
    const leftWall = Matter.Bodies.rectangle(
      -wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2 + ceilingOffset,
      { isStatic: true, friction: 0.1 }
    );
    const rightWall = Matter.Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2 + ceilingOffset,
      { isStatic: true, friction: 0.1 }
    );
    const ceiling = Matter.Bodies.rectangle(
      width / 2,
      -ceilingOffset - wallThickness / 2,
      width + wallThickness * 2,
      wallThickness,
      { isStatic: true }
    );

    Matter.Composite.add(engine.world, [floor, leftWall, rightWall, ceiling]);

    // 3. Select Published Projects to Spawn (up to 5 on mobile, all published on desktop)
    const publishedList = projectsRef.current.filter((p) => p.published !== false);
    const mobilePool = publishedList.filter((p) => p.featuredOnMobile !== false);
    const projectList = isMobile
      ? (mobilePool.length > 0 ? mobilePool : publishedList).slice(0, 5)
      : publishedList;

    // Google Labs horizontal spacing distributions:
    // On mobile: sH = [0.18, 0.45, 0.82, 0.32, 0.65]
    // On desktop: width / (count + 1) * (i + 1)
    const mobileFractions = [0.18, 0.45, 0.82, 0.32, 0.65];

    // Google Labs vertical cascading drop formula:
    // Every shape starts completely ABOVE the viewport and drops in sequentially
    const initialTopOffset = baseShapeSize / 2 + 120;
    const verticalCascadeStep = baseShapeSize * 0.55 + 40;

    projectList.forEach((proj, idx) => {
      const geo = SHAPE_GEOMETRIES[proj.shapeType];
      const targetSize = baseShapeSize * geo.sizeCompensation;

      // Calculate initial X position
      let xBase: number;
      if (isMobile) {
        xBase = width * (mobileFractions[idx % mobileFractions.length] || 0.5);
      } else {
        xBase = (width / (projectList.length + 1)) * (idx + 1);
      }

      // Add gentle organic jitter (+- 12px)
      const xJitter = (Math.random() - 0.5) * 24;
      const x = Math.max(targetSize / 2 + 10, Math.min(width - targetSize / 2 - 10, xBase + xJitter));

      // Y position: starts completely offscreen above the viewport
      const y = -initialTopOffset - idx * verticalCascadeStep;

      // Initial subtle rotation (-0.15 to +0.15 rad) for realistic tumbling
      const initialAngle = (Math.random() - 0.5) * 0.3;

      // Generate physics body matching Google Labs options
      let body: Matter.Body;
      const bodyOptions: Matter.IBodyDefinition = {
        friction: 0.618,
        frictionStatic: 0.986,
        frictionAir: 0.011,
        restitution: 0.34,
        density: 0.01,
        angle: initialAngle,
      };

      if (proj.shapeType === 'circle') {
        body = Matter.Bodies.circle(x, y, targetSize / 2, bodyOptions);
      } else {
        const vertices = samplePathToVertices(geo.path, geo.viewBox, targetSize, 28, 14);
        if (vertices.length > 0 && vertices[0].length > 0) {
          body = Matter.Bodies.fromVertices(x, y, vertices, bodyOptions, true);
        } else {
          body = Matter.Bodies.rectangle(x, y, targetSize, targetSize, {
            ...bodyOptions,
            chamfer: { radius: 24 },
          });
        }
      }

      // Compute bounding box offset relative to position
      const offset = {
        x: (body.bounds.min.x + body.bounds.max.x) / 2 - body.position.x,
        y: (body.bounds.min.y + body.bounds.max.y) / 2 - body.position.y,
      };

      // Create DOM SVG Element matching Google Labs
      const el = document.createElement('div');
      el.className = 'absolute top-0 left-0 svg-shape shape-enter-anim pointer-events-auto';
      el.style.width = `${targetSize}px`;
      el.style.height = `${targetSize}px`;
      el.style.setProperty('--i', String(idx));
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Project: ${proj.title}`);

      // Internal SVG with geometry path
      el.innerHTML = `
        <svg viewBox="${geo.viewBox}" class="w-full h-full block overflow-visible">
          <path d="${geo.path}" fill="${proj.color}" class="shape-path" />
        </svg>
      `;

      const pathEl = el.querySelector('path') as SVGPathElement;

      // Pointer event listeners for tap vs drag detection
      el.addEventListener('pointerdown', (e) => {
        pointerStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now(),
          hasDragged: false,
        };
      });

      el.addEventListener('pointermove', (e) => {
        if (pointerStartRef.current && !pointerStartRef.current.hasDragged) {
          const dist = Math.hypot(
            e.clientX - pointerStartRef.current.x,
            e.clientY - pointerStartRef.current.y
          );
          if (dist > 6) {
            pointerStartRef.current.hasDragged = true;
          }
        }
      });

      // Unified click handler that only opens the project if NO dragging occurred
      el.addEventListener('click', (e) => {
        const elapsedSinceDrag = Date.now() - lastDragEndTime;
        if (isDraggingBody || elapsedSinceDrag < 200) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (pointerStartRef.current && pointerStartRef.current.hasDragged) {
          e.preventDefault();
          e.stopPropagation();
          pointerStartRef.current = null;
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        onSelectProjectRef.current(proj, rect);
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          onSelectProjectRef.current(proj, rect);
        }
      });

      el.addEventListener('pointerenter', () => {
        activeHoverTargetRef.current = proj;
        setHoveredProject(proj);
      });

      el.addEventListener('pointerleave', () => {
        if (activeHoverTargetRef.current?.id === proj.id) {
          activeHoverTargetRef.current = null;
          setHoveredProject(null);
        }
      });

      container.appendChild(el);
      Matter.Composite.add(engine.world, [body]);

      instancesRef.current.push({
        project: proj,
        body,
        element: el,
        pathElement: pathEl,
        offset,
        halfSize: targetSize / 2,
      });
    });

    // Remove entrance animation class once completed so it never replays
    setTimeout(() => {
      instancesRef.current.forEach(({ element }) => {
        element.classList.remove('shape-enter-anim');
      });
    }, 2200);

    // 4. Set up Mouse / Pointer Dragging Constraint
    let isDraggingBody = false;
    let lastDragEndTime = 0;

    const mouse = Matter.Mouse.create(container);
    // Allow touch scroll on background while allowing shape drag
    const mouseAny = mouse as any;
    if (mouseAny.mousewheel && mouse.element) {
      (mouse.element as any).removeEventListener('mousewheel', mouseAny.mousewheel);
      (mouse.element as any).removeEventListener('DOMMouseScroll', mouseAny.mousewheel);
    }

    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.055,
        damping: 0.618,
        render: { visible: false },
      },
    });

    Matter.Events.on(mouseConstraint, 'startdrag', () => {
      isDraggingBody = true;
      if (pointerStartRef.current) {
        pointerStartRef.current.hasDragged = true;
      }
      setIsDragging(true);
    });

    Matter.Events.on(mouseConstraint, 'enddrag', () => {
      isDraggingBody = false;
      lastDragEndTime = Date.now();
      setIsDragging(false);
    });

    Matter.Composite.add(engine.world, mouseConstraint);

    // 5. Physics Tick Sync -> Update DOM Transforms with exact Google Labs rotation matrix
    Matter.Events.on(engine, 'afterUpdate', () => {
      instancesRef.current.forEach(({ body, element, halfSize, offset }) => {
        const cos = Math.cos(body.angle);
        const sin = Math.sin(body.angle);
        const rotOffsetX = offset.x * cos - offset.y * sin;
        const rotOffsetY = offset.x * sin + offset.y * cos;
        const posX = body.position.x + rotOffsetX - halfSize;
        const posY = body.position.y + rotOffsetY - halfSize;
        element.style.transform = `translate(${posX}px, ${posY}px) rotate(${body.angle}rad)`;
      });
    });

    // 6. Run the physics engine
    Matter.Runner.run(runner, engine);

    // Cleanup reference
    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [shapeStructureSignature]); // Only re-initialize if shape structure actually changes!

  useEffect(() => {
    const cleanup = initPhysics();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      if (Math.abs(window.innerWidth - lastWidthRef.current) > 30) {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          initPhysics();
        }, 250);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      if (cleanup) cleanup();
    };
  }, [initPhysics]);

  // Track cursor for floating tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <section 
      id="projects" 
      className="relative w-full h-full overflow-hidden select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Subtle Background Accent */}
      <div className="absolute inset-0 -z-10 bg-[#F8F9FA]" />

      {/* Full Physics Playground Viewport */}
      <div
        ref={containerRef}
        className={`relative w-full h-full touch-pan-y ${
          isDragging ? 'is-dragging' : ''
        }`}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Crisp Ground Line Indicator (Google Labs signature bottom border) */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-neutral-900/80 z-10 pointer-events-none" />
      </div>

      {/* Floating Tooltip Pill (Google Labs style) */}
      {hoveredProject && !isDragging && (
        <div
          className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out hidden sm:block"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y + 16}px`,
          }}
        >
          <div className="bg-neutral-900/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-neutral-700/50 flex flex-col gap-0.5 animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: hoveredProject.color }}
              />
              <span className="text-xs font-semibold tracking-wide text-neutral-100">
                {hoveredProject.title}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
              <span>{hoveredProject.category}</span>
              <span>·</span>
              <span className="text-emerald-300">Tap to inspect</span>
              <ArrowRight className="w-3 h-3 text-emerald-300" />
            </span>
          </div>
        </div>
      )}
    </section>
  );
});
