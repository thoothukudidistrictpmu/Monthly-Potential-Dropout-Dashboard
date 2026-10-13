import React, { useEffect, useRef, useState } from 'react';

interface Background3DProps {
  theme?: 'executive-slate' | 'deep-navy' | 'frost-minimal';
  intensity?: 'normal' | 'subtle';
  interactive?: boolean;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Node3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseRadius: number;
  color: string;
}

interface Shape3D {
  center: Point3D;
  vertices: Point3D[];
  edges: [number, number][];
  rotation: { x: number; y: number; z: number };
  rotSpeed: { x: number; y: number; z: number };
  color: string;
  fillColor: string;
  size: number;
}

export const Background3D: React.FC<Background3DProps> = ({
  theme = 'executive-slate',
  intensity = 'normal',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Respect user's reduced motion system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      // Normalized between -1 and 1
      mouseRef.current.targetX = (e.clientX / width - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / height - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Color definitions based on theme
    const themePalettes = {
      'executive-slate': {
        nodeColors: ['rgba(37, 99, 235, 0.45)', 'rgba(13, 148, 136, 0.45)', 'rgba(79, 70, 229, 0.4)'],
        lineColor: 'rgba(148, 163, 184, 0.18)',
        shapeStroke: 'rgba(59, 130, 246, 0.35)',
        shapeFill: 'rgba(219, 234, 254, 0.12)',
        cubeStroke: 'rgba(20, 184, 166, 0.35)',
        cubeFill: 'rgba(204, 251, 241, 0.12)',
      },
      'deep-navy': {
        nodeColors: ['rgba(59, 130, 246, 0.55)', 'rgba(96, 165, 250, 0.45)', 'rgba(45, 212, 191, 0.4)'],
        lineColor: 'rgba(100, 116, 139, 0.22)',
        shapeStroke: 'rgba(96, 165, 250, 0.45)',
        shapeFill: 'rgba(191, 219, 254, 0.15)',
        cubeStroke: 'rgba(56, 189, 248, 0.4)',
        cubeFill: 'rgba(186, 230, 253, 0.15)',
      },
      'frost-minimal': {
        nodeColors: ['rgba(100, 116, 139, 0.3)', 'rgba(148, 163, 184, 0.3)', 'rgba(59, 130, 246, 0.25)'],
        lineColor: 'rgba(203, 213, 225, 0.25)',
        shapeStroke: 'rgba(148, 163, 184, 0.25)',
        shapeFill: 'rgba(241, 245, 249, 0.15)',
        cubeStroke: 'rgba(100, 116, 139, 0.25)',
        cubeFill: 'rgba(241, 245, 249, 0.12)',
      },
    };

    const palette = themePalettes[theme] || themePalettes['executive-slate'];

    // 1. Generate 3D floating interconnected nodes
    const nodeCount = intensity === 'subtle' ? 22 : 36;
    const nodes: Node3D[] = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1100,
        z: Math.random() * 800 + 200, // 200 to 1000
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.2,
        baseRadius: Math.random() * 2.2 + 1.8,
        color: palette.nodeColors[i % palette.nodeColors.length],
      });
    }

    // 2. Helper to create 3D Cube vertices and edges
    const createCube = (size: number, center: Point3D, color: string, fill: string): Shape3D => {
      const s = size / 2;
      const vertices: Point3D[] = [
        { x: -s, y: -s, z: -s },
        { x: s, y: -s, z: -s },
        { x: s, y: s, z: -s },
        { x: -s, y: s, z: -s },
        { x: -s, y: -s, z: s },
        { x: s, y: -s, z: s },
        { x: s, y: s, z: s },
        { x: -s, y: s, z: s },
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0], // back face
        [4, 5], [5, 6], [6, 7], [7, 4], // front face
        [0, 4], [1, 5], [2, 6], [3, 7], // connecting edges
      ];
      return {
        center,
        vertices,
        edges,
        rotation: { x: Math.random() * Math.PI, y: Math.random() * Math.PI, z: Math.random() * Math.PI },
        rotSpeed: {
          x: (Math.random() * 0.003 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
          y: (Math.random() * 0.004 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
          z: (Math.random() * 0.002 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        },
        color,
        fillColor: fill,
        size,
      };
    };

    // 3. Helper to create 3D Octahedron / Diamond (Educational data crystal)
    const createOctahedron = (size: number, center: Point3D, color: string, fill: string): Shape3D => {
      const s = size / 1.5;
      const vertices: Point3D[] = [
        { x: 0, y: -s, z: 0 }, // top
        { x: 0, y: s, z: 0 },  // bottom
        { x: -s, y: 0, z: -s },
        { x: s, y: 0, z: -s },
        { x: s, y: 0, z: s },
        { x: -s, y: 0, z: s },
      ];
      const edges: [number, number][] = [
        [0, 2], [0, 3], [0, 4], [0, 5], // top pyramid
        [1, 2], [1, 3], [1, 4], [1, 5], // bottom pyramid
        [2, 3], [3, 4], [4, 5], [5, 2], // equatorial ring
      ];
      return {
        center,
        vertices,
        edges,
        rotation: { x: Math.random() * Math.PI, y: Math.random() * Math.PI, z: Math.random() * Math.PI },
        rotSpeed: {
          x: (Math.random() * 0.003 + 0.0015) * (Math.random() > 0.5 ? 1 : -1),
          y: (Math.random() * 0.003 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
          z: 0.001,
        },
        color,
        fillColor: fill,
        size,
      };
    };

    // Instantiate 4 floating 3D polyhedra around the dashboard corners
    const shapes: Shape3D[] = [
      createCube(110, { x: -480, y: -220, z: 520 }, palette.shapeStroke, palette.shapeFill),
      createOctahedron(130, { x: 520, y: -200, z: 580 }, palette.cubeStroke, palette.cubeFill),
      createCube(95, { x: 550, y: 260, z: 460 }, palette.shapeStroke, palette.shapeFill),
      createOctahedron(105, { x: -520, y: 240, z: 490 }, palette.cubeStroke, palette.cubeFill),
      createCube(75, { x: 0, y: -320, z: 620 }, palette.cubeStroke, palette.cubeFill),
    ];

    // Camera perspective settings
    const fov = 650; // Focal length

    const rotateX = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: p.x,
        y: p.y * cos - p.z * sin,
        z: p.y * sin + p.z * cos,
      };
    };

    const rotateY = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: p.x * cos + p.z * sin,
        y: p.y,
        z: -p.x * sin + p.z * cos,
      };
    };

    const rotateZ = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
        z: p.z,
      };
    };

    const project = (p: Point3D, camPitch: number, camYaw: number): { x: number; y: number; scale: number; visible: boolean } => {
      // Apply camera rotation
      let rotated = rotateY(p, camYaw);
      rotated = rotateX(rotated, camPitch);

      if (rotated.z + fov <= 20) return { x: 0, y: 0, scale: 0, visible: false };

      const scale = fov / (fov + rotated.z);
      return {
        x: width / 2 + rotated.x * scale,
        y: height / 2 + rotated.y * scale,
        scale,
        visible: true,
      };
    };

    // Render loop
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth mouse interpolation (spring feel)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const camYaw = mouseRef.current.x * 0.14; // Subtle 3D tilt
      const camPitch = -mouseRef.current.y * 0.1;

      ctx.clearRect(0, 0, width, height);

      // --- Layer 1: Render Connected 3D Node Mesh ---
      const projectedNodes: Array<{ x: number; y: number; scale: number; node: Node3D; visible: boolean }> = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!reducedMotion) {
          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;

          // Gentle bounds bounce
          if (node.x < -800 || node.x > 800) node.vx *= -1;
          if (node.y < -550 || node.y > 550) node.vy *= -1;
          if (node.z < 150 || node.z > 950) node.vz *= -1;
        }

        const proj = project({ x: node.x, y: node.y, z: node.z }, camPitch, camYaw);
        if (proj.visible) {
          projectedNodes.push({ ...proj, node });
        }
      }

      // Draw connecting 3D lines between nearby nodes
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = palette.lineColor;
      for (let i = 0; i < projectedNodes.length; i++) {
        const p1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p2 = projectedNodes[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          // Screen-space proximity threshold
          if (distSq < 135 * 135) {
            const alpha = (1 - Math.sqrt(distSq) / 135) * 0.35 * Math.min(p1.scale, p2.scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw node spheres with glowing radial gradients
      for (let i = 0; i < projectedNodes.length; i++) {
        const p = projectedNodes[i];
        const r = Math.max(1.2, p.node.baseRadius * p.scale);

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.node.color;
        ctx.fill();

        // Soft outer ambient halo for foreground nodes
        if (p.scale > 0.85) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.node.color.replace(/[\d\.]+\)$/, '0.08)');
          ctx.fill();
        }
      }

      // --- Layer 2: Render 3D Floating Polyhedra ---
      shapes.forEach((shape) => {
        if (!reducedMotion) {
          shape.rotation.x += shape.rotSpeed.x;
          shape.rotation.y += shape.rotSpeed.y;
          shape.rotation.z += shape.rotSpeed.z;

          // Gentle bobbing motion
          shape.center.y += Math.sin(currentTime * 0.001 + shape.center.x) * 0.15;
        }

        // Transform and project shape vertices
        const projectedVerts = shape.vertices.map((v) => {
          let p = rotateZ(v, shape.rotation.z);
          p = rotateY(p, shape.rotation.y);
          p = rotateX(p, shape.rotation.x);

          const worldPos = {
            x: shape.center.x + p.x,
            y: shape.center.y + p.y,
            z: shape.center.z + p.z,
          };

          return project(worldPos, camPitch, camYaw);
        });

        // Draw translucent faces if vertices visible
        const allVisible = projectedVerts.every((v) => v.visible);
        if (allVisible) {
          // Draw connecting 3D wireframe edges
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = shape.color;

          shape.edges.forEach(([i1, i2]) => {
            const v1 = projectedVerts[i1];
            const v2 = projectedVerts[i2];
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
          });

          // Draw vertex points
          ctx.fillStyle = shape.color;
          projectedVerts.forEach((v) => {
            ctx.beginPath();
            ctx.arc(v.x, v.y, 2 * v.scale, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [theme, intensity, interactive, reducedMotion]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Subtle Ambient Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl animate-float" />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl animate-float"
        style={{ animationDelay: '-2s' }}
      />
      <div
        className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-indigo-400/8 blur-3xl animate-float"
        style={{ animationDelay: '-4s' }}
      />

      {/* 2. Interactive 3D Perspective WebGL/Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90" />

      {/* 3. Executive Blueprint Grid Overlay (Anti-slop geometric precision) */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0f172a 1px, transparent 1px),
            linear-gradient(to bottom, #0f172a 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
};
