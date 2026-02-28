import * as THREE from 'three';

/**
 * SolarSystem Background Animation
 * Encapsulates all Three.js logic.
 */
class SolarSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.prefersReducedMotion =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.isSmallScreen =
            window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
        this.MAX_FPS = this.isSmallScreen ? 30 : 45;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });

        this.world = new THREE.Group();
        this.planets = [];
        this.mouse = { x: 0, y: 0 };
        this.lastRender = 0;
        this.isVisible = true;

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.createStarfield();
        this.createSun();
        this.createPlanets();
        this.setupEvents();

        if (this.prefersReducedMotion) {
            this.renderer.render(this.scene, this.camera);
        } else {
            this.animate(performance.now());
        }
    }

    setupRenderer() {
        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            this.isSmallScreen ? 1.25 : 1.5
        );
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x000000, 0);
    }

    setupCamera() {
        this.camera.position.set(0, 25, 200);
        this.scene.add(this.world);
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0x0a0a10, 0.5));
        const sunLight = new THREE.PointLight(0xfff0d6, 2.8, 4000, 2);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);

        const rimLight = new THREE.PointLight(0x00d4d4, 0.15, 3000);
        rimLight.position.set(-200, 100, -150);
        this.scene.add(rimLight);
    }

    createStarfield() {
        const makeStars = (count, rMin, rMax, size, opacity) => {
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const col = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const r = rMin + Math.random() * (rMax - rMin);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
                pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
                pos[i * 3 + 2] = Math.cos(phi) * r;

                const useWarm = Math.random() < 0.8;
                const hex = useWarm ? 0xffb86b : 0x00d4d4;
                const c = new THREE.Color(hex);
                col[i * 3] = c.r;
                col[i * 3 + 1] = c.g;
                col[i * 3 + 2] = c.b;
            }

            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

            const mat = new THREE.PointsMaterial({
                size,
                vertexColors: true,
                transparent: true,
                opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            return new THREE.Points(geo, mat);
        };

        const starsFar = makeStars(
            this.isSmallScreen ? 800 : 1200,
            300,
            1500,
            0.8,
            0.85
        );
        const starsNear = makeStars(
            this.isSmallScreen ? 420 : 700,
            80,
            300,
            1.2,
            0.95
        );
        this.starsFar = starsFar;
        this.starsNear = starsNear;
        this.world.add(starsFar, starsNear);
    }

    createSun() {
        const sunGeo = new THREE.SphereGeometry(14, 40, 40);
        const sunMat = new THREE.MeshStandardMaterial({
            color: 0xffb86b,
            emissive: 0xff7a00,
            emissiveIntensity: 3.4,
            roughness: 0.04,
            metalness: 0.1,
        });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.world.add(this.sun);

        // Glow
        const addGlow = (size, color, opacity) => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(size, 32, 32),
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            this.world.add(mesh);
            return mesh;
        };
        addGlow(20, 0xff8a4a, 0.16);
        addGlow(30, 0xffd8a6, 0.08);

        // Flare
        const createFlare = () => {
            const cvs = document.createElement("canvas");
            cvs.width = cvs.height = 512;
            const ctx = cvs.getContext("2d");
            const g = ctx.createRadialGradient(256, 256, 8, 256, 256, 256);
            g.addColorStop(0, "#fff8ec");
            g.addColorStop(0.5, "#ff9a3b");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 512, 512);

            const tex = new THREE.CanvasTexture(cvs);
            const mat = new THREE.SpriteMaterial({
                map: tex,
                color: 0xffffff,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.94,
                depthWrite: false,
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(300, 300, 1);
            return sprite;
        };
        this.sunSprite = createFlare();
        this.world.add(this.sunSprite);
    }

    createPlanets() {
        const COLORS = {
            mercury: 0x8a8a8a,
            venus: 0xffb86b,
            earth: 0x3fb4ff,
            mars: 0xff8a4a,
            jupiter: 0xffd8a6,
            saturn: 0xffe1b3,
            moon: 0xcccccc,
        };

        const specs = [
            { name: "Mercury", d: 26, s: 1.2, c: COLORS.mercury, sp: 1.3 },
            { name: "Venus", d: 38, s: 1.9, c: COLORS.venus, sp: 0.9 },
            { name: "Earth", d: 52, s: 2.0, c: COLORS.earth, sp: 0.6, moon: true },
            { name: "Mars", d: 68, s: 1.4, c: COLORS.mars, sp: 0.45 },
            { name: "Jupiter", d: 92, s: 6.0, c: COLORS.jupiter, sp: 0.2 },
            {
                name: "Saturn",
                d: 118,
                s: 5.2,
                c: COLORS.saturn,
                sp: 0.12,
                ring: true,
            },
        ];

        const orbitsGroup = new THREE.Group();

        specs.forEach((spec, i) => {
            // Planet
            const geo = new THREE.SphereGeometry(spec.s, 24, 24);
            const mat = new THREE.MeshStandardMaterial({
                color: spec.c,
                emissive: spec.c,
                emissiveIntensity: 0.3,
                roughness: 0.7,
                metalness: 0.05,
            });
            const mesh = new THREE.Mesh(geo, mat);

            mesh.userData = {
                distance: spec.d + (Math.random() - 0.5) * 4,
                speed: spec.sp * (0.8 + Math.random() * 0.5),
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
            this.world.add(mesh);

            // Ring
            if (spec.ring) {
                const ringGeo = new THREE.RingGeometry(spec.s * 1.5, spec.s * 2.8, 48);
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

            // Moon
            if (spec.moon) {
                const moonGeo = new THREE.SphereGeometry(0.5, 12, 12);
                const moonMat = new THREE.MeshStandardMaterial({
                    color: COLORS.moon,
                    roughness: 0.85,
                    metalness: 0.02,
                });
                const moon = new THREE.Mesh(moonGeo, moonMat);
                moon.userData = {
                    orbitRadius: spec.s * 3.5,
                    orbitSpeed: 2.0 + Math.random() * 0.5,
                    orbitPhase: Math.random() * Math.PI * 2,
                };
                mesh.add(moon);
                mesh.userData.moon = moon;
            }

            this.planets.push(mesh);

            // Orbit Line
            const points = [];
            for (let j = 0; j <= 96; j++) {
                const ang = (j / 96) * Math.PI * 2;
                points.push(
                    new THREE.Vector3(
                        Math.cos(ang) * spec.d,
                        0,
                        Math.sin(ang) * spec.d
                    )
                );
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x444444,
                transparent: true,
                opacity: 0.05,
            });
            orbitsGroup.add(new THREE.Line(lineGeo, lineMat));
        });

        this.world.add(orbitsGroup);
    }

    setupEvents() {
        window.addEventListener(
            "mousemove",
            (e) => {
                const rect = this.renderer.domElement.getBoundingClientRect();
                this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
            },
            { passive: true }
        );

        document.addEventListener("visibilitychange", () => {
            this.isVisible = document.visibilityState === "visible";
            if (this.isVisible) this.lastRender = 0;
        });

        window.addEventListener(
            "resize",
            () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                const nextPixelRatio = Math.min(
                    window.devicePixelRatio || 1,
                    this.isSmallScreen ? 1.25 : 1.5
                );
                this.renderer.setPixelRatio(nextPixelRatio);
                this.renderer.setSize(window.innerWidth, window.innerHeight, false);
            },
            { passive: true }
        );
    }

    animate(now) {
        requestAnimationFrame((t) => this.animate(t));
        if (!this.isVisible) return;

        const t = now * 0.001;
        if (t - this.lastRender < 1 / this.MAX_FPS) return;
        this.lastRender = t;

        // Sun Pulse
        const sunPulse = 1 + Math.sin(t * 1.8) * 0.05 + Math.sin(t * 4.2) * 0.02;
        this.sun.scale.setScalar(sunPulse);
        this.sun.material.emissiveIntensity = 3.2 + Math.sin(t * 2.3) * 0.4;
        this.sunSprite.material.opacity = THREE.MathUtils.lerp(
            this.sunSprite.material.opacity,
            0.92 + Math.sin(t * 1.1) * 0.06,
            0.05
        );

        // Planets
        this.planets.forEach((p, i) => {
            const ud = p.userData;
            const orbitAngle = t * ud.speed + ud.phase;
            p.position.x = Math.cos(orbitAngle) * ud.distance;
            p.position.z = Math.sin(orbitAngle) * ud.distance;
            p.position.y = Math.sin(t * 0.4 + i * 0.5) * 2.5;

            p.rotation.y += 0.008 + (i % 3) * 0.0012;
            p.rotation.x += 0.003 + (i % 5) * 0.0008;

            p.material.emissiveIntensity =
                0.25 + Math.abs(Math.sin(t * (0.9 + i * 0.08) + i)) * 0.35;

            if (ud.moon) {
                const ma = t * ud.moon.userData.orbitSpeed + ud.moon.userData.orbitPhase;
                ud.moon.position.x = Math.cos(ma) * ud.moon.userData.orbitRadius;
                ud.moon.position.z = Math.sin(ma) * ud.moon.userData.orbitRadius;
                ud.moon.rotation.y += 0.015;
            }
        });

        // Stars & Camera
        this.starsFar.rotation.y += 0.00012;
        this.starsNear.rotation.y += 0.00025;

        const targetX = this.mouse.x * 50;
        const targetY = this.mouse.y * 18;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.04;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.04;
        this.camera.lookAt(new THREE.Vector3(0, 5, 0));

        this.renderer.render(this.scene, this.camera);
    }
}

/**
 * ContactForm UI Logic
 * Handles modal, form submission, and validation.
 */
class ContactForm {
    constructor() {
        this.modal = document.getElementById("message-modal");
        this.openBtn = document.getElementById("open-message");
        this.form = document.getElementById("message-form");

        if (!this.modal || !this.openBtn || !this.form) return;

        this.submitBtn = this.form.querySelector('button[type="submit"]');
        this.inputs = {
            name: document.getElementById("message-name"),
            email: document.getElementById("message-email"),
            message: document.getElementById("message-body"),
        };

        this.init();
    }

    init() {
        this.openBtn.addEventListener("click", () => this.open());

        const closeTargets = this.modal.querySelectorAll("[data-close]");
        closeTargets.forEach((t) => t.addEventListener("click", () => this.close()));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.modal.classList.contains("is-open")) {
                this.close();
            }
        });

        this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    open() {
        this.modal.classList.add("is-open");
        this.modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        if (this.inputs.name) this.inputs.name.focus();
    }

    close() {
        this.modal.classList.remove("is-open");
        this.modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    setLoading(isLoading) {
        if (!this.submitBtn) return;
        this.submitBtn.disabled = isLoading;
        this.submitBtn.textContent = isLoading ? "Sending..." : "Send Message";
        this.submitBtn.style.opacity = isLoading ? "0.7" : "1";
        this.submitBtn.style.cursor = isLoading ? "wait" : "pointer";
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.setLoading(true);

        const payload = {
            name: this.inputs.name?.value.trim(),
            email: this.inputs.email?.value.trim(),
            subject: `Portfolio message from ${this.inputs.name?.value.trim()}`,
            message: this.inputs.message?.value.trim(),
        };

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send message.");
            }

            alert("Message sent successfully!");
            this.form.reset();
            this.close();
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            this.setLoading(false);
        }
    }
}

/**
 * SidebarContactForm
 * Handles the sidebar contact form submission.
 */
class SidebarContactForm {
    constructor() {
        this.form = document.getElementById("sidebar-contact-form");
        this.statusEl = document.getElementById("form-status");
        this.submitBtn = this.form?.querySelector('button[type="submit"]');

        if (!this.form) return;

        this.init();
    }

    init() {
        this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    setLoading(isLoading) {
        if (!this.submitBtn) return;
        this.submitBtn.disabled = isLoading;
        this.submitBtn.textContent = isLoading ? "Sending..." : "Send Message";
    }

    showStatus(message, type) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
        this.statusEl.className = `sidebar-form__status ${type}`;

        // Clear success message after 2 seconds
        if (type === "success") {
            setTimeout(() => {
                this.statusEl.textContent = "";
                this.statusEl.className = "sidebar-form__status";
            }, 2000);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.setLoading(true);
        this.showStatus("", "");

        const formData = new FormData(this.form);
        const payload = {
            name: formData.get("name")?.trim(),
            email: formData.get("email")?.trim(),
            subject: `Portfolio message from ${formData.get("name")?.trim()}`,
            message: formData.get("message")?.trim(),
        };

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send message.");
            }

            this.showStatus("Message sent successfully!", "success");
            this.form.reset();
        } catch (err) {
            this.showStatus(`Error: ${err.message}`, "error");
        } finally {
            this.setLoading(false);
        }
    }
}

/**
 * Tab Navigation
 * Handles switching between Projects, Certificates, and Education sections.
 */
class TabNavigation {
    constructor() {
        this.tabs = document.querySelectorAll(".nav-tab");
        this.sections = document.querySelectorAll(".content-section");

        if (!this.tabs.length || !this.sections.length) return;

        this.init();
    }

    init() {
        this.tabs.forEach((tab) => {
            tab.addEventListener("click", () => this.switchTab(tab));
        });
    }

    switchTab(clickedTab) {
        const targetSection = clickedTab.dataset.section;

        // Remove active class from all tabs
        this.tabs.forEach((tab) => tab.classList.remove("active"));

        // Add active class to clicked tab
        clickedTab.classList.add("active");

        // Hide all sections
        this.sections.forEach((section) => section.classList.remove("active"));

        // Show target section
        const targetElement = document.getElementById(`${targetSection}-section`);
        if (targetElement) {
            targetElement.classList.add("active");
        }
    }
}

// Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    new SolarSystem("bg-canvas");
    new ContactForm();
    new SidebarContactForm();
    new TabNavigation();
});
