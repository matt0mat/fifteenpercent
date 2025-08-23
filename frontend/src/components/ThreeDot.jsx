import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeDot() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const setSize = () => {
      const w = canvas.clientWidth || 120;
      const h = canvas.clientHeight || 40;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();

    const geometry = new THREE.TorusGeometry(0.3, 0.1, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);
    camera.position.z = 1.5;

    let raf;
    const animate = () => {
      torus.rotation.x += 0.005;
      torus.rotation.y += 0.005;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => setSize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-24 h-10 -mt-2 -mb-2" />;
}
