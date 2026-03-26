'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles({ count = 800 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const light = useRef<THREE.PointLight>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const green = new THREE.Color('#16A34A');
    const amber = new THREE.Color('#D97706');
    const white = new THREE.Color('#EDEDEA');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;

      const r = Math.random();
      const color = r < 0.4 ? green : r < 0.6 ? amber : white;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    return { positions, colors, sizes };
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock.getElapsedTime();
    mesh.current.rotation.y = time * 0.03;
    mesh.current.rotation.x = Math.sin(time * 0.02) * 0.1;

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.001;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;

    if (light.current) {
      light.current.position.x = Math.sin(time * 0.5) * 3;
      light.current.position.y = Math.cos(time * 0.3) * 2;
    }
  });

  return (
    <>
      <pointLight ref={light} color="#16A34A" intensity={2} distance={15} />
      <points ref={mesh}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particles.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

function FloatingShield() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.getElapsedTime();
    ref.current.rotation.y = time * 0.4;
    ref.current.rotation.x = Math.sin(time * 0.3) * 0.15;
    ref.current.position.y = Math.sin(time * 0.5) * 0.2;
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshStandardMaterial
        color="#16A34A"
        wireframe
        transparent
        opacity={0.15}
        emissive="#16A34A"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function GlowRing() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.getElapsedTime();
    ref.current.rotation.z = time * 0.2;
    ref.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.3) * 0.1;
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <torusGeometry args={[2, 0.02, 16, 100]} />
      <meshStandardMaterial
        color="#16A34A"
        transparent
        opacity={0.3}
        emissive="#16A34A"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

export function ParticleField() {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    // CSS fallback for environments without WebGL
    return (
      <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(22, 163, 74, 0.08) 0%, transparent 60%)',
        }} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onCreated={() => {}}
      >
        <ambientLight intensity={0.2} />
        <Particles />
        <FloatingShield />
        <GlowRing />
      </Canvas>
    </div>
  );
}
