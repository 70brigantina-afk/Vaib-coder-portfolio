(function () {
  const mount = document.querySelector('.cursor-shape-blur');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!mount || !canHover || reduceMotion || !window.THREE) {
    return;
  }

  const vertexShader = `
    varying vec2 v_texcoord;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      v_texcoord = uv;
    }
  `;

  const fragmentShader = `
    varying vec2 v_texcoord;

    uniform vec2 u_mouse;
    uniform vec2 u_resolution;
    uniform float u_pixelRatio;

    uniform float u_shapeSize;
    uniform float u_roundness;
    uniform float u_borderSize;
    uniform float u_circleSize;
    uniform float u_circleEdge;

    #ifndef PI
    #define PI 3.1415926535897932384626433832795
    #endif
    #ifndef TWO_PI
    #define TWO_PI 6.2831853071795864769252867665590
    #endif

    vec2 coord(in vec2 p) {
      p = p / u_resolution.xy;
      if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
      } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
      }
      p -= 0.5;
      p *= vec2(-1.0, 1.0);
      return p;
    }

    #define st0 coord(gl_FragCoord.xy)
    #define mx coord(u_mouse * u_pixelRatio)

    float sdRoundRect(vec2 p, vec2 b, float r) {
      vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
      return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
    }

    float sdCircle(in vec2 st, in vec2 center) {
      return length(st - center) * 2.0;
    }

    float aastep(float threshold, float value) {
      float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
      return smoothstep(threshold - afwidth, threshold + afwidth, value);
    }

    float fill(float x, float size, float edge) {
      return 1.0 - smoothstep(size - edge, size + edge, x);
    }

    float strokeAA(float x, float size, float w, float edge) {
      float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
      float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)
        - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);
      return clamp(d, 0.0, 1.0);
    }

    void main() {
      vec2 st = st0 + 0.5;
      vec2 posMouse = mx * vec2(1.0, -1.0) + 0.5;

      float sdfCircle = fill(
        sdCircle(st, posMouse),
        u_circleSize,
        u_circleEdge
      );

      float sdf = sdRoundRect(st, vec2(u_shapeSize), u_roundness);
      sdf = strokeAA(sdf, 0.0, u_borderSize, sdfCircle) * 4.0;

      vec3 color = vec3(1.0, 0.78, 0.42);
      gl_FragColor = vec4(color.rgb, sdf);
    }
  `;

  let active = true;
  let animationFrameId = 0;
  let lastTime = performance.now() * 0.001;

  const vMouse = new THREE.Vector2(window.innerWidth * 0.72, window.innerHeight * 0.34);
  const vMouseDamp = new THREE.Vector2(vMouse.x, vMouse.y);
  const vResolution = new THREE.Vector2();

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power'
  });
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_mouse: { value: vMouseDamp },
      u_resolution: { value: vResolution },
      u_pixelRatio: { value: 1 },
      u_shapeSize: { value: 1.1 },
      u_roundness: { value: 0.5 },
      u_borderSize: { value: 0.045 },
      u_circleSize: { value: 0.26 },
      u_circleEdge: { value: 0.9 }
    },
    transparent: true,
    extensions: {
      derivatives: true
    }
  });

  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  const updatePointer = (event) => {
    vMouse.set(event.clientX, event.clientY);
  };

  const resize = () => {
    if (!active) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(pixelRatio);

    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();

    quad.scale.set(width, height, 1);
    vResolution.set(width, height).multiplyScalar(pixelRatio);
    material.uniforms.u_pixelRatio.value = pixelRatio;
  };

  const render = () => {
    if (!active) return;

    const time = performance.now() * 0.001;
    const delta = time - lastTime;
    lastTime = time;

    vMouseDamp.x = THREE.MathUtils.damp(vMouseDamp.x, vMouse.x, 7, delta);
    vMouseDamp.y = THREE.MathUtils.damp(vMouseDamp.y, vMouse.y, 7, delta);

    renderer.render(scene, camera);
    animationFrameId = window.requestAnimationFrame(render);
  };

  window.addEventListener('pointermove', updatePointer, { passive: true });
  window.addEventListener('resize', resize);

  resize();
  render();

  window.addEventListener('pagehide', () => {
    active = false;
    window.cancelAnimationFrame(animationFrameId);
    window.removeEventListener('pointermove', updatePointer);
    window.removeEventListener('resize', resize);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }, { once: true });
}());
