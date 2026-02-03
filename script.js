const revealEls = document.querySelectorAll(".reveal");
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) e.target.classList.add("show");
          }
        },
        { threshold: 0.12 },
      );
      revealEls.forEach((el) => io.observe(el));

      document.getElementById("year").textContent = new Date().getFullYear();

      const YOUR_EMAIL = "contact@ashokgiri.com.np";

      document.getElementById("contactForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();

        const body = `Name: ${name}
Email: ${email}

Message:
${message}`;

        const mailto = `mailto:${encodeURIComponent(YOUR_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
      });

      const nav = document.querySelector(".nav");
      let lastScrollY = window.scrollY;
      let navHidden = false;

      const shouldUseScrollHide = () => window.innerWidth <= 720;

      const updateNavVisibility = () => {
        if (!nav) return;
        const currentY = window.scrollY;
        const scrollingDown = currentY > lastScrollY;
        const pastThreshold = currentY > 80;

        if (shouldUseScrollHide() && scrollingDown && pastThreshold) {
          if (!navHidden) {
            nav.classList.add("is-hidden");
            navHidden = true;
          }
        } else {
          if (navHidden) {
            nav.classList.remove("is-hidden");
            navHidden = false;
          }
        }

        lastScrollY = currentY;
      };

      window.addEventListener("scroll", updateNavVisibility, { passive: true });
      window.addEventListener("resize", () => {
        if (!shouldUseScrollHide() && navHidden) {
          nav.classList.remove("is-hidden");
          navHidden = false;
        }
        lastScrollY = window.scrollY;
      });

      const backToTop = document.getElementById("backToTop");
      let scrollTimer = null;

      const updateBackToTop = (isScrolling) => {
        if (!backToTop) return;
        const nearBottom =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 120;
        if (nearBottom && !isScrolling) {
          backToTop.classList.add("is-visible");
        } else {
          backToTop.classList.remove("is-visible");
        }
      };

      window.addEventListener(
        "scroll",
        () => {
          updateBackToTop(true);
          if (scrollTimer) window.clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(() => updateBackToTop(false), 160);
        },
        { passive: true },
      );

      updateBackToTop(false);

      const skeleton = document.getElementById("skeleton");
      window.addEventListener("load", () => {
        if (!skeleton) return;
        window.setTimeout(() => {
          skeleton.classList.add("hidden");
          window.setTimeout(() => skeleton.remove(), 450);
        }, 450);
      });
