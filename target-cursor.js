(function () {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canHover || reduceMotion) {
    return;
  }

  const targetSelector = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    '.btn',
    '.contact-link',
    '.service-card',
    '.case-card',
    '.roadmap-step',
    '.proof-stat',
    '.testimonial',
    '.hero-pills span'
  ].join(',');

  const wrapper = document.createElement('div');
  wrapper.className = 'target-cursor-wrapper';
  wrapper.innerHTML = [
    '<div class="target-cursor-dot"></div>',
    '<div class="target-cursor-corner corner-tl"></div>',
    '<div class="target-cursor-corner corner-tr"></div>',
    '<div class="target-cursor-corner corner-br"></div>',
    '<div class="target-cursor-corner corner-bl"></div>'
  ].join('');
  document.body.appendChild(wrapper);
  document.body.classList.add('target-cursor-enabled');

  const dot = wrapper.querySelector('.target-cursor-dot');
  const corners = Array.from(wrapper.querySelectorAll('.target-cursor-corner'));
  const defaultCorners = [
    { x: -18, y: -18 },
    { x: 6, y: -18 },
    { x: 6, y: 6 },
    { x: -18, y: 6 }
  ];
  const cornerPositions = defaultCorners.map((point) => ({ ...point }));

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let rotation = 0;
  let activeTarget = null;
  let isPressed = false;
  let lastTime = performance.now();

  const lerp = (start, end, amount) => start + (end - start) * amount;

  const getTargetFromPoint = () => {
    const element = document.elementFromPoint(mouseX, mouseY);
    return element ? element.closest(targetSelector) : null;
  };

  const setMousePosition = (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    activeTarget = getTargetFromPoint();
  };

  const updateCorners = () => {
    let desiredCorners = defaultCorners;

    if (activeTarget) {
      const rect = activeTarget.getBoundingClientRect();
      const borderWidth = 5;
      const cornerSize = 12;

      desiredCorners = [
        { x: rect.left - borderWidth - cursorX, y: rect.top - borderWidth - cursorY },
        { x: rect.right + borderWidth - cornerSize - cursorX, y: rect.top - borderWidth - cursorY },
        { x: rect.right + borderWidth - cornerSize - cursorX, y: rect.bottom + borderWidth - cornerSize - cursorY },
        { x: rect.left - borderWidth - cursorX, y: rect.bottom + borderWidth - cornerSize - cursorY }
      ];
    }

    const strength = activeTarget ? 0.28 : 0.18;
    cornerPositions.forEach((corner, index) => {
      corner.x = lerp(corner.x, desiredCorners[index].x, strength);
      corner.y = lerp(corner.y, desiredCorners[index].y, strength);
      corners[index].style.transform = `translate(${corner.x}px, ${corner.y}px)`;
    });
  };

  const render = (time) => {
    const delta = Math.min((time - lastTime) / 1000, 0.04);
    lastTime = time;

    activeTarget = getTargetFromPoint();
    cursorX = lerp(cursorX, mouseX, 0.34);
    cursorY = lerp(cursorY, mouseY, 0.34);

    if (activeTarget) {
      rotation = lerp(rotation, 0, 0.22);
      wrapper.classList.add('is-targeting');
    } else {
      rotation += (360 / 2) * delta;
      wrapper.classList.remove('is-targeting');
    }

    updateCorners();
    wrapper.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) rotate(${rotation}deg)`;
    dot.style.transform = `translate(-50%, -50%) scale(${isPressed ? 0.72 : 1})`;

    window.requestAnimationFrame(render);
  };

  window.addEventListener('pointermove', setMousePosition, { passive: true });
  window.addEventListener('pointerdown', () => {
    isPressed = true;
    wrapper.classList.add('is-pressed');
  });
  window.addEventListener('pointerup', () => {
    isPressed = false;
    wrapper.classList.remove('is-pressed');
  });
  window.addEventListener('blur', () => {
    activeTarget = null;
    isPressed = false;
  });

  window.requestAnimationFrame(render);
}());
