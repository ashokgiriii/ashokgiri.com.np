// Basic page reveal utilities
(function () {
    const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    // add reveal class after small delay
    window.addEventListener("load", () => {
        if (prefersReduced) return;
        document
            .querySelectorAll(
                "header, .hero, section, footer, .panel, .project, .skill"
            )
            .forEach((el, i) => {
                el.style.transition =
                    "transform .9s cubic-bezier(.09,.9,.22,1), opacity .9s ease";
                el.style.transform = "translateY(18px)";
                el.style.opacity = "0";
                setTimeout(() => {
                    el.style.transform = "";
                    el.style.opacity = "";
                }, 80 + i * 60);
            });
    });
})();

// Three.js background: stars + sun + planets
(function () {
    const canvas = document.getElementById("bg-canvas");
    // set the canvas to cover screen (CSS applied below)
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // transparent

    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        3000
    );
    camera.position.set(0, 18, 140);
    const cameraTarget = new THREE.Vector3(0, 6, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0x111217, 0.6));
    const sunLight = new THREE.PointLight(0xffc97b, 2.6, 2000, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    const rimLight = new THREE.PointLight(0x00d4d4, 0.18, 2000);
    rimLight.position.set(-160, 80, -120);
    scene.add(rimLight);

    // Starfield (multi sized layers for depth)
    function makeStars(
        count,
        spread,
        size,
        colorRange = [0xffc07a, 0x18e6c6]
    ) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 60 + Math.random() * spread;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
            pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
            pos[i * 3 + 2] = Math.cos(phi) * r;
            const t = Math.random();
            const c = new THREE.Color().setHex(
                Math.random() < 0.18 ? colorRange[1] : colorRange[0]
            );
            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        return new THREE.Points(
            geo,
            new THREE.PointsMaterial({
                size,
                vertexColors: true,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
    }
    const starsFar = makeStars(1400, 900, 0.9, [0xff6b35, 0x00d4d4]);
    const starsNear = makeStars(900, 420, 1.4, [0xff6b35, 0x00d4d4]);
    starsFar.material.opacity = 0.95;
    starsNear.material.opacity = 0.98;
    scene.add(starsFar, starsNear);

    // Sun (emissive sphere)
    const sunMat = new THREE.MeshStandardMaterial({
        color: 0xff6b35, // accent-1
        emissive: 0xff8a56,
        emissiveIntensity: 3.2,
        roughness: 0.05,
        metalness: 0.15,
    });
    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(8.6, 64, 64),
        sunMat
    );
    scene.add(sun);

    // subtle glow shells around sun (meshbasic additive)
    const glowA = new THREE.Mesh(
        new THREE.SphereGeometry(12, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0xff8a4a,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const glowB = new THREE.Mesh(
        new THREE.SphereGeometry(20, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0xffcaa0,
            transparent: true,
            opacity: 0.07,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    scene.add(glowA, glowB);

    // Planets array
    const planets = [];
    const planetSpecs = [
        { r: 18, size: 1.6, color: 0xff8a4a, speed: 0.45 }, // warm
        { r: 30, size: 2.1, color: 0xffcaa0, speed: 0.28 }, // warm pale
        { r: 44, size: 1.1, color: 0x00d4d4, speed: 0.18 }, // teal accent
        { r: 62, size: 2.6, color: 0xffe6cc, speed: 0.12 }, // pale warm
    ];
    planetSpecs.forEach((p, i) => {
        const g = new THREE.SphereGeometry(p.size, 32, 32);
        const m = new THREE.MeshStandardMaterial({
            color: p.color,
            emissive: p.color,
            emissiveIntensity: 0.65,
            roughness: 0.5,
            metalness: 0.25,
        });
        const mesh = new THREE.Mesh(g, m);
        mesh.userData = {
            radius: p.r + (Math.random() - 0.5) * 4,
            speed: p.speed + Math.random() * 0.18,
            phase: Math.random() * Math.PI * 2,
            idx: i,
        };
        const ang = Math.random() * Math.PI * 2;
        mesh.position.set(
            Math.cos(ang) * mesh.userData.radius,
            (Math.random() - 0.5) * 5,
            Math.sin(ang) * mesh.userData.radius
        );
        mesh.scale.setScalar(0.9 + Math.random() * 1.3);
        scene.add(mesh);
        planets.push(mesh);
    });

    // lightweight sprite flare for sun using canvas texture
    function createSprite(size, colorA, colorB, opacity = 0.9) {
        const cvs = document.createElement("canvas");
        cvs.width = cvs.height = 512;
        const ctx = cvs.getContext("2d");
        const g = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
        g.addColorStop(0, colorA);
        g.addColorStop(0.6, colorB);
        g.addColorStop(1, "rgba(0,0,0,0)");
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
        const s = new THREE.Sprite(mat);
        s.scale.set(size, size, 1);
        return s;
    }
    const sunSprite = createSprite(180, "#fff6ec", "#ff8a4a", 0.95);
    scene.add(sunSprite);

    // mouse interaction / camera parallax
    const mouse = { x: 0, y: 0 };
    window.addEventListener(
        "mousemove",
        (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        },
        { passive: true }
    );

    // Animation loop with damping
    const clock = new THREE.Clock();
    let last = 0;
    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const dt = t - last;
        last = t;

        // Sun subtle pulse
        const pulse = 1 + Math.sin(t * 1.9) * 0.06 + Math.sin(t * 4.5) * 0.02;
        sun.scale.setScalar(pulse);
        sun.material.emissiveIntensity = 2.6 + Math.sin(t * 2.5) * 0.5;
        sunSprite.material.opacity = THREE.MathUtils.lerp(
            sunSprite.material.opacity,
            0.95 + Math.sin(t * 1.2) * 0.06,
            0.04
        );

        // Planets orbit
        planets.forEach((o, i) => {
            const ud = o.userData;
            const ang = t * ud.speed + ud.phase;
            o.position.x = Math.cos(ang) * ud.radius;
            o.position.z = Math.sin(ang) * ud.radius;
            o.position.y = Math.sin(t * 0.6 + i) * 2.2;
            o.rotation.x += 0.008 + (i % 3) * 0.0015;
            o.rotation.y += 0.006 + (i % 5) * 0.0013;
            o.material.emissiveIntensity =
                0.8 + Math.abs(Math.sin(t * (1.2 + i * 0.05) + i)) * 0.9;
        });

        // Star slow drift
        starsFar.rotation.y += 0.0006;
        starsNear.rotation.y += 0.0011;

        // Camera smoothing toward mouse
        const targetX = mouse.x * 32;
        const targetY = mouse.y * 12;
        camera.position.x += (targetX - camera.position.x) * 0.04;
        camera.position.y += (targetY - camera.position.y) * 0.04;
        camera.lookAt(cameraTarget);

        renderer.render(scene, camera);
    }
    animate();

    // Resize handling
    window.addEventListener(
        "resize",
        () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        },
        { passive: true }
    );

    // Prefer reduced motion: pause animations if user prefers reduced motion
    if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        renderer.setAnimationLoop(null);
    }
})();