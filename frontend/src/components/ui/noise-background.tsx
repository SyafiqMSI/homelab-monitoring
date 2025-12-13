"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Program, Mesh, Plane } from "ogl";
import { cn } from "@/lib/utils";

interface NoiseBackgroundProps {
    hue?: number;
    saturation?: number;
    chroma?: number;
    className?: string;
}

export function NoiseBackground({
    hue = 200,
    saturation = 0.8,
    chroma = 0.6,
    className,
}: NoiseBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const animationRef = useRef<number | null>(null);
    const sceneRef = useRef<Transform | null>(null);
    const meshRef = useRef<Mesh | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    const pointerRef = useRef({ x: 0, y: 0, tX: 0, tY: 0 });

    useEffect(() => {
        // Update uniforms when props change
        const mesh = meshRef.value;
        if (mesh && mesh.program && mesh.program.uniforms) {
            if (mesh.program.uniforms.u_hue) mesh.program.uniforms.u_hue.value = hue;
            if (mesh.program.uniforms.u_saturation) mesh.program.uniforms.u_saturation.value = saturation;
            if (mesh.program.uniforms.u_chroma) mesh.program.uniforms.u_chroma.value = chroma;
        }
    }, [hue, saturation, chroma]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let width = canvas.clientWidth;
        let height = canvas.clientHeight;

        const vertexShader = `
      precision mediump float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

        const fragmentShader = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform float u_scroll_progress;
      uniform float u_hue;
      uniform float u_saturation;
      uniform float u_chroma;

      vec2 rotate(vec2 uv, float th) {
          return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }

      float neuro_shape(vec2 uv, float t, float p) {
          vec2 sine_acc = vec2(0.);
          vec2 res = vec2(0.);
          float scale = 8.;

          for (int j = 0; j < 15; j++) {
              uv = rotate(uv, 1.);
              sine_acc = rotate(sine_acc, 1.);
              vec2 layer = uv * scale + float(j) + sine_acc - t;
              sine_acc += sin(layer) + 2.4 * p;
              res += (.5 + .5 * cos(layer)) / scale;
              scale *= (1.2);
          }
          return res.x + res.y;
  }
      // HSL to RGB conversion
      vec3 hsl2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
          return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
      }

      void main() {
          vec2 uv = .5 * vUv;
          uv.x *= u_ratio;

          vec2 pointer = vUv - u_pointer_position;
          pointer.x *= u_ratio;
          float p = clamp(length(pointer), 0., 1.);
          p = .5 * pow(1. - p, 2.);

          float t = .001 * u_time;
          vec3 color = vec3(0.);

          float noise = neuro_shape(uv, t, p);

          noise = 1.2 * pow(noise, 3.);
          noise += pow(noise, 10.);
          noise = max(.0, noise - .5);
          noise *= (1. - length(vUv - .5));

          // Convert hue from degrees to 0-1 range
          float normalizedHue = u_hue / 360.0;
          
          // Create HSL color with animation
          vec3 hsl = vec3(
              normalizedHue + 0.1 * sin(3.0 * u_scroll_progress + 1.5),
              u_saturation,
              u_chroma * 0.5 + 0.2 * sin(2.0 * u_scroll_progress)
          );

          // Convert to RGB
          color = hsl2rgb(hsl);
          color = color * noise;

          gl_FragColor = vec4(color, noise);
      }
    `;

        try {
            const renderer = new Renderer({
                canvas,
                width,
                height,
                dpr: Math.min(window.devicePixelRatio, 2),
                alpha: true,
            });

            const camera = new Camera(renderer.gl);
            const scene = new Transform();

            const geometry = new Plane(renderer.gl, {
                width: 2,
                height: 2,
            });

            const program = new Program(renderer.gl, {
                vertex: vertexShader,
                fragment: fragmentShader,
                uniforms: {
                    u_time: { value: 0 },
                    u_ratio: { value: width / height },
                    u_pointer_position: { value: [0, 0] },
                    u_scroll_progress: { value: 0 },
                    u_hue: { value: hue },
                    u_saturation: { value: saturation },
                    u_chroma: { value: chroma },
                },
            });

            const mesh = new Mesh(renderer.gl, { geometry, program });
            mesh.setParent(scene);

            rendererRef.current = renderer;
            sceneRef.current = scene;
            cameraRef.current = camera;
            meshRef.current = mesh;

            const resize = () => {
                if (!canvas) return;
                width = canvas.clientWidth;
                height = canvas.clientHeight;
                renderer.setSize(width, height);
                if (program.uniforms.u_ratio) {
                    program.uniforms.u_ratio.value = width / height;
                }
            };

            const updateMousePosition = (x: number, y: number) => {
                pointerRef.current.tX = x;
                pointerRef.current.tY = y;
            };

            const handlePointerMove = (e: PointerEvent) => updateMousePosition(e.clientX, e.clientY);
            const handleTouchMove = (e: TouchEvent) => updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
            const handleClick = (e: MouseEvent) => updateMousePosition(e.clientX, e.clientY);

            window.addEventListener("resize", resize);
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("click", handleClick);

            let frameId: number;
            const render = (time: number) => {
                const pointer = pointerRef.current;
                pointer.x += (pointer.tX - pointer.x) * 0.2;
                pointer.y += (pointer.tY - pointer.y) * 0.2;

                if (program.uniforms.u_time) program.uniforms.u_time.value = time;
                if (program.uniforms.u_pointer_position) {
                    program.uniforms.u_pointer_position.value = [
                        pointer.x / window.innerWidth,
                        1 - pointer.y / window.innerHeight,
                    ];
                }
                if (program.uniforms.u_scroll_progress) {
                    program.uniforms.u_scroll_progress.value = window.scrollY / (2 * window.innerHeight);
                }

                renderer.render({ scene, camera });
                frameId = requestAnimationFrame(render);
            };

            frameId = requestAnimationFrame(render);
            resize();

            return () => {
                cancelAnimationFrame(frameId);
                window.removeEventListener("resize", resize);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("touchmove", handleTouchMove);
                window.removeEventListener("click", handleClick);
                // Clean up OGL if needed
            };
        } catch (e) {
            console.error("OGL Init Error", e);
        }
    }, []); // Run once on mount

    // Watch prop changes manually handled via useRef or recreating program,
    // but to keep it simple we rely on the first useEffect to update uniforms.

    return (
        <canvas
            ref={canvasRef}
            className={cn("absolute inset-0 h-full w-full pointer-events-none opacity-95", className)}
        />
    );
}
