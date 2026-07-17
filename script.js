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

function waitNextFrames(n = 2) {
    return new Promise((resolve) => {
        let count = 0;
        const step = () => {
            count += 1;
            if (count >= n) resolve();
            else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}

async function revealAppShell() {
    const fontReady =
        document.fonts && typeof document.fonts.ready !== "undefined"
            ? document.fonts.ready
            : Promise.resolve();

    await Promise.race([
        Promise.all([fontReady.catch(() => { }), waitNextFrames(2)]),
        new Promise((r) => setTimeout(r, 2800)),
    ]);

    document.body.classList.add("is-app-ready");
    const sk = document.getElementById("page-skeleton");
    if (sk) {
        sk.setAttribute("aria-busy", "false");
        sk.setAttribute("aria-hidden", "true");
    }
}

/**
 * Main contact form (Contact tab). Instant UI: reset + success, then confirms in background.
 */
class MainContactForm {
    constructor() {
        this.form = document.getElementById("main-contact-form");
        this.statusEl = document.getElementById("main-contact-status");
        this._inFlight = false;
        this._statusTimer = 0;

        if (!this.form) return;

        this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    showStatus(message, type) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
        this.statusEl.className = type
            ? `main-contact-form__status ${type}`
            : "main-contact-form__status";

        if (type === "success") {
            window.clearTimeout(this._statusTimer);
            this._statusTimer = window.setTimeout(() => {
                this.statusEl.textContent = "";
                this.statusEl.className = "main-contact-form__status";
            }, 5000);
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        if (this._inFlight) return;
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        const formData = new FormData(this.form);
        const payload = {
            name: String(formData.get("name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            subject: String(formData.get("subject") || "").trim(),
            message: String(formData.get("message") || "").trim(),
        };

        this._inFlight = true;
        this.showStatus("", "");
        this.form.reset();
        this.showStatus("Message sent. Thank you!", "success");

        fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(
                        data.error || "Could not confirm delivery. Try again or email ashokgiri.dev@gmail.com."
                    );
                }
            })
            .catch((err) => {
                this.showStatus(
                    err.message ||
                    "Could not confirm delivery. Try again or email ashokgiri.dev@gmail.com.",
                    "error"
                );
            })
            .finally(() => {
                this._inFlight = false;
            });
    }
}

/**
 * Tab navigation: Projects, Education, Contact.
 */
class TabNavigation {
    constructor() {
        this.tabs = document.querySelectorAll(".nav-tab");
        this.sections = document.querySelectorAll(".content-section");

        if (!this.tabs.length || !this.sections.length) return;

        this.tabs.forEach((tab) => {
            tab.addEventListener("click", () => this.switchTab(tab));
        });
    }

    switchTo(sectionName) {
        const tab = [...this.tabs].find((t) => t.dataset.section === sectionName);
        if (tab) this.switchTab(tab);
    }

    switchTab(clickedTab) {
        const targetSection = clickedTab.dataset.section;

        this.tabs.forEach((tab) => tab.classList.remove("active"));
        clickedTab.classList.add("active");
        this.sections.forEach((section) => section.classList.remove("active"));

        const targetElement = document.getElementById(`${targetSection}-section`);
        if (targetElement) targetElement.classList.add("active");
    }
}

function wireGoToContact(tabNav) {
    document.getElementById("go-to-contact")?.addEventListener("click", () => {
        tabNav.switchTo("contact");
        document.getElementById("contact-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    });
}

function rotateProfileGif() {
    const gifs = [
        "/images/coding.gif",
        "/images/coding1.gif",
        "/images/coding2.gif",
        "/images/coding3.gif",
        "/images/coding4.gif",
    ];

    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    const profileImg = document.querySelector(".profile-img");

    if (profileImg) {
        profileImg.src = randomGif;
    }
}

function initCertModal() {
    const modal = document.getElementById("cert-modal");
    if (!modal) return;
    const title = document.getElementById("cert-modal-title");
    const issuer = document.getElementById("cert-modal-issuer");
    const img = document.getElementById("cert-modal-img");
    const body = modal.querySelector(".cert-modal__body");
    const closeBtn = modal.querySelector(".cert-modal__close");
    const backdrop = modal.querySelector(".cert-modal__backdrop");

    function open(certCard) {
        const file = certCard.dataset.certFile;
        if (file && file.endsWith(".pdf")) {
            window.open(file, "_blank");
            return;
        }
        title.textContent = certCard.dataset.certTitle || "";
        issuer.textContent = [certCard.dataset.certIssuer, certCard.dataset.certDate].filter(Boolean).join(" — ");
        img.src = certCard.dataset.certImg || "";
        img.alt = certCard.dataset.certTitle || "Certificate";
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function close() {
        modal.hidden = true;
        document.body.style.overflow = "";
    }

    document.querySelectorAll(".cert-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            open(btn.closest(".cert-card"));
        });
    });

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.hidden) close();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const tabNav = new TabNavigation();
    new SolarSystem("bg-canvas");
    new MainContactForm();
    wireGoToContact(tabNav);
    rotateProfileGif();
    initCertModal();

    revealAppShell().catch(() => {
        document.body.classList.add("is-app-ready");
    });
});
