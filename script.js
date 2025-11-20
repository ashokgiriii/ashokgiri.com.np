(function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 25, 200);

    // World group for easy control
    const world = new THREE.Group();
    scene.add(world);

    // Lights
    scene.add(new THREE.AmbientLight(0x0a0a10, 0.5));
    const sunLight = new THREE.PointLight(0xfff0d6, 2.8, 4000, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    const rimLight = new THREE.PointLight(0x00d4d4, 0.15, 3000);
    rimLight.position.set(-200, 100, -150);
    scene.add(rimLight);

    // Color palette
    const COLORS = {
        sun: 0xffb86b,
        mercury: 0x8a8a8a,
        venus: 0xffb86b,
        earth: 0x3fb4ff,
        mars: 0xff8a4a,
        jupiter: 0xffd8a6,
        saturn: 0xffe1b3,
        moon: 0xcccccc,
    };

    // === Starfield (two layers) ===
    function makeStarfield(count, radiusMin, radiusMax, size, opacity = 0.9) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const r = radiusMin + Math.random() * (radiusMax - radiusMin);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
            pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
            pos[i * 3 + 2] = Math.cos(phi) * r;

            // 80% warm gold, 20% cool teal
            const useWarm = Math.random() < 0.8;
            const hexColor = useWarm ? 0xffb86b : 0x00d4d4;
            const c = new THREE.Color(hexColor);
            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

        const mat = new THREE.PointsMaterial({
            size,
            vertexColors: true,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        return new THREE.Points(geo, mat);
    }

    const starsFar = makeStarfield(1400, 300, 1500, 0.8, 0.85);
    const starsNear = makeStarfield(800, 80, 300, 1.4, 0.95);
    world.add(starsFar, starsNear);

    // === Sun with glow ===
    const sunGeo = new THREE.SphereGeometry(14, 64, 64);
    const sunMat = new THREE.MeshStandardMaterial({
        color: COLORS.sun,
        emissive: 0xff7a00,
        emissiveIntensity: 3.4,
        roughness: 0.04,
        metalness: 0.1,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    world.add(sun);

    // Additive glow shells
    const addGlowShell = (size, color, opacity) =>
        new THREE.Mesh(
            new THREE.SphereGeometry(size, 32, 32),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );

    const glow1 = addGlowShell(20, 0xff8a4a, 0.16);
    const glow2 = addGlowShell(30, 0xffd8a6, 0.08);
    world.add(glow1, glow2);

    // Sun sprite flare
    function createSpriteFlare(size, colorInner, colorOuter, opacity = 0.92) {
        const cvs = document.createElement('canvas');
        cvs.width = cvs.height = 512;
        const ctx = cvs.getContext('2d');
        const g = ctx.createRadialGradient(256, 256, 8, 256, 256, 256);
        g.addColorStop(0, colorInner);
        g.addColorStop(0.5, colorOuter);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);

        const tex = new THREE.CanvasTexture(cvs);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(size, size, 1);
        return sprite;
    }

    const sunSprite = createSpriteFlare(300, '#fff8ec', '#ff9a3b', 0.94);
    world.add(sunSprite);

    // === Planets ===
    const planets = [];
    const planetSpecs = [
        { name: 'Mercury', distance: 26, size: 1.2, color: COLORS.mercury, speed: 1.3 },
        { name: 'Venus', distance: 38, size: 1.9, color: COLORS.venus, speed: 0.9 },
        { name: 'Earth', distance: 52, size: 2.0, color: COLORS.earth, speed: 0.6, moon: true },
        { name: 'Mars', distance: 68, size: 1.4, color: COLORS.mars, speed: 0.45 },
        { name: 'Jupiter', distance: 92, size: 6.0, color: COLORS.jupiter, speed: 0.2, ring: false },
        { name: 'Saturn', distance: 118, size: 5.2, color: COLORS.saturn, speed: 0.12, ring: true },
    ];

    planetSpecs.forEach((spec, idx) => {
        const geo = new THREE.SphereGeometry(spec.size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: spec.color,
            emissive: spec.color,
            emissiveIntensity: 0.3,
            roughness: 0.7,
            metalness: 0.05,
        });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.userData = {
            distance: spec.distance + (Math.random() - 0.5) * 4,
            speed: spec.speed * (0.8 + Math.random() * 0.5),
            phase: Math.random() * Math.PI * 2,
            name: spec.name,
        };

        const angle = Math.random() * Math.PI * 2;
        mesh.position.set(
            Math.cos(angle) * mesh.userData.distance,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * mesh.userData.distance
        );
        mesh.scale.setScalar(0.95 + Math.random() * 0.3);
        world.add(mesh);

        // Optional ring (Saturn)
        if (spec.ring) {
            const ringGeo = new THREE.RingGeometry(spec.size * 1.5, spec.size * 2.8, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffd8a6,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2.4;
            mesh.add(ring);
        }

        // Optional moon (Earth's moon)
        if (spec.moon) {
            const moonGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({
                color: COLORS.moon,
                roughness: 0.85,
                metalness: 0.02,
            });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            moon.userData = {
                orbitRadius: spec.size * 3.5,
                orbitSpeed: 2.0 + Math.random() * 0.5,
                orbitPhase: Math.random() * Math.PI * 2,
            };
            mesh.add(moon);
            mesh.userData.moon = moon;
        }

        planets.push(mesh);
    });

    // === Subtle orbit guide lines (optional, very faint) ===
    const orbitsGroup = new THREE.Group();
    planetSpecs.forEach(spec => {
        const points = [];
        for (let i = 0; i <= 128; i++) {
            const angle = (i / 128) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * spec.distance, 0, Math.sin(angle) * spec.distance));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.05 });
        const line = new THREE.Line(geo, mat);
        orbitsGroup.add(line);
    });
    world.add(orbitsGroup);

    // === Mouse interaction ===
    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }, { passive: true });

    // === Animation loop ===
    const clock = new THREE.Clock();
    let lastTime = 0;

    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const dt = t - lastTime;
        lastTime = t;

        // Sun pulse
        const sunPulse = 1 + Math.sin(t * 1.8) * 0.05 + Math.sin(t * 4.2) * 0.02;
        sun.scale.setScalar(sunPulse);
        sun.material.emissiveIntensity = 3.2 + Math.sin(t * 2.3) * 0.4;
        sunSprite.material.opacity = THREE.MathUtils.lerp(
            sunSprite.material.opacity,
            0.92 + Math.sin(t * 1.1) * 0.06,
            0.05
        );

        // Planets orbit
        planets.forEach((p, i) => {
            const ud = p.userData;
            const orbitAngle = t * ud.speed + ud.phase;
            p.position.x = Math.cos(orbitAngle) * ud.distance;
            p.position.z = Math.sin(orbitAngle) * ud.distance;
            p.position.y = Math.sin(t * 0.4 + i * 0.5) * 2.5;

            // Rotate planets
            p.rotation.y += 0.008 + (i % 3) * 0.0012;
            p.rotation.x += 0.003 + (i % 5) * 0.0008;

            // Planet emissive breathing
            p.material.emissiveIntensity = 0.25 + Math.abs(Math.sin(t * (0.9 + i * 0.08) + i)) * 0.35;

            // Moon orbit (if exists)
            if (ud.moon) {
                const moonOrbitAngle = t * ud.moon.userData.orbitSpeed + ud.moon.userData.orbitPhase;
                ud.moon.position.x = Math.cos(moonOrbitAngle) * ud.moon.userData.orbitRadius;
                ud.moon.position.z = Math.sin(moonOrbitAngle) * ud.moon.userData.orbitRadius;
                ud.moon.rotation.y += 0.015;
            }
        });

        // Starfield drift
        starsFar.rotation.y += 0.00012;
        starsNear.rotation.y += 0.00025;

        // Camera smooth follow mouse
        const targetX = mouse.x * 50;
        const targetY = mouse.y * 18;
        camera.position.x += (targetX - camera.position.x) * 0.04;
        camera.position.y += (targetY - camera.position.y) * 0.04;
        camera.lookAt(new THREE.Vector3(0, 5, 0));

        renderer.render(scene, camera);
    }

    animate();

    // === Resize handler ===
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, { passive: true });

    // === Respect reduced motion preference ===
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        renderer.setAnimationLoop(null);
    }
})();
