/* ==========================================================================
   JavaScript Presentation Engine for ROOCH Holding
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // DOM Element Selectors
  const slidesContainer = document.getElementById('slidesContainer');
  let slides = document.querySelectorAll('.slide');
  const sidebar = document.getElementById('sidebar');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressDotsContainer = document.getElementById('progressDots');
  const progressLineBar = document.getElementById('progressLineBar');
  const sectionIndicator = document.getElementById('sectionIndicator');
  let navItems = document.querySelectorAll('.nav-item');
  let currentSlideIndex = 0;
  let isTitleSlideActive = true;
  let totalSlides = slides.length;

  function initSidebarNavigation() {
    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer && window.PresentationConfig) {
      navLinksContainer.innerHTML = '';
      window.PresentationConfig.slides.forEach((slide, index) => {
        const li = document.createElement('li');
        li.className = index === currentSlideIndex ? 'nav-item active' : 'nav-item';
        li.setAttribute('data-slide', index);
        li.innerHTML = `<span class="nav-num">${(index + 1).toString().padStart(2, '0')}</span><span class="nav-text">${slide.title}</span>`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          goToSlide(index);
          if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebar.classList.add('hidden');
          }
        });
        navLinksContainer.appendChild(li);
      });
      navItems = document.querySelectorAll('.nav-item');
    }
  }
  initSidebarNavigation();

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  
  let isLightMode = localStorage.getItem('theme') === 'light';
  if (isLightMode) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      isLightMode = !isLightMode;
      if (isLightMode) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  }
  
  // Slide names for section indicator heading mapping
  const slideSections = window.PresentationConfig ? window.PresentationConfig.slides.map(s => s.section) : [];

  /* ==========================================================================
     Navigation Engine
     ========================================================================== */

  // Initialize Progress Dots
  function initProgressDots() {
    progressDotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      progressDotsContainer.appendChild(dot);
    }
  }

  function hydrateDeferredImages(slideIndex, isActive = false) {
    const slide = slides[slideIndex];
    if (!slide) return;

    slide.querySelectorAll('img[data-src]').forEach((image, imageIndex) => {
      if (!image.getAttribute('src')) {
        image.setAttribute('src', image.dataset.src);
      }
      image.loading = isActive ? 'eager' : 'lazy';
      image.decoding = 'async';
      if (isActive && imageIndex === 0) {
        image.setAttribute('fetchpriority', 'high');
      }
      image.dataset.loaded = 'true';
    });
  }

  // Core Slide Transition Function
  function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    
    currentSlideIndex = index;
    isTitleSlideActive = (index === 0);
    
    // Slide container translateX offset translation
    slidesContainer.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    
    // Update Slide active classes (for animations trigger & video play/pause control)
    slides.forEach((slide, idx) => {
      const videos = slide.querySelectorAll('video');
      if (idx === currentSlideIndex) {
        slide.classList.add('active');
        slide.classList.add('is-active');
        videos.forEach(v => {
          v.play().catch(err => console.log('Video autoplay deferred:', err));
        });
      } else {
        slide.classList.remove('active');
        slide.classList.remove('is-active');
        videos.forEach(v => {
          v.pause();
        });
      }
    });

    // Update video presentation embed state
    const activeSlide = slides[currentSlideIndex];
    const videoEmbed = document.getElementById("presentationVideoEmbed");
    if (videoEmbed) {
      const isVideo = activeSlide && activeSlide.classList.contains("video-slide");
      const defaultUrl = "https://drive.google.com/file/d/1qkeE5kPh6L4RRLE-_LyiFysJ5LogNIo7/preview";
      const embedUrl = (window.OSavePresentation && window.OSavePresentation.videoEmbedUrl) ? window.OSavePresentation.videoEmbedUrl : defaultUrl;
      if (isVideo) {
        if (!videoEmbed.src || videoEmbed.src.includes("about:blank")) {
          videoEmbed.src = embedUrl;
        }
        videoEmbed.hidden = false;
      } else {
        if (videoEmbed.src && !videoEmbed.src.includes("about:blank")) {
          videoEmbed.src = "about:blank";
        }
      }
    }

    // Update Progress Line indicator (from 0 to 100%)
    const progressPercent = (currentSlideIndex / (totalSlides - 1)) * 100;
    progressLineBar.style.width = `${progressPercent}%`;

    // Update Section Indicator Text
    sectionIndicator.textContent = slideSections[currentSlideIndex] || "ROOCH HOLDING INC.";

    // Update Footer Buttons disabled state
    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === totalSlides - 1;

    // Update Progress Dots active state
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
      if (idx === currentSlideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update Sidebar Item Active state
    navItems.forEach((item, idx) => {
      if (idx === currentSlideIndex) {
        item.classList.add('active');
        // Scroll sidebar navigation item into view smoothly if overflowed
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });

    // Trigger Slide-Specific Features (like counting animation)
    triggerSlideScripts(currentSlideIndex);

    // Load the active slide immediately and warm the adjacent slide without
    // making all presentation images compete during initial page startup.
    hydrateDeferredImages(currentSlideIndex, true);
    hydrateDeferredImages(currentSlideIndex - 1);
    hydrateDeferredImages(currentSlideIndex + 1);
  }

  // Button Click Listeners
  prevBtn.addEventListener('click', () => {
    goToSlide(currentSlideIndex - 1);
  });

  nextBtn.addEventListener('click', () => {
    goToSlide(currentSlideIndex + 1);
  });

  // Sidebar link clicks
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const slideIndex = parseInt(item.getAttribute('data-slide'), 10);
      goToSlide(slideIndex);
      // On mobile screens, collapse sidebar after selection
      if (window.innerWidth <= 768) {
        sidebar.classList.add('hidden');
        window.dispatchEvent(new Event('resize'));
      }
    });
  });

  /* ==========================================================================
     Keyboard & Accessibility Controls
     ========================================================================== */

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') {
      // Space/Enter/PageDown advances slide, check first that user is not focusing form elements
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        goToSlide(currentSlideIndex + 1);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        goToSlide(currentSlideIndex - 1);
      }
    }
  });

  /* ==========================================================================
     Touch Navigation Swipe Support (Mobile UI)
     ========================================================================== */

  let touchStartX = 0;
  let touchEndX = 0;

  slidesContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  slidesContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50; // Min px swipe distance
    if (touchStartX - touchEndX > swipeThreshold) {
      // Swipe left -> Next Slide
      goToSlide(currentSlideIndex + 1);
    } else if (touchEndX - touchStartX > swipeThreshold) {
      // Swipe right -> Prev Slide
      goToSlide(currentSlideIndex - 1);
    }
  }

  /* ==========================================================================
     Sidebar Responsive Toggling
     ========================================================================== */

  menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    window.dispatchEvent(new Event('resize'));
  });

  closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    window.dispatchEvent(new Event('resize'));
  });

  // Listen to sidebar transition end to ensure final layout recalculations
  sidebar.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'margin-left' || e.propertyName === 'width') {
      window.dispatchEvent(new Event('resize'));
    }
  });

  // Hide sidebar by default on mobile, show on desktop
  function checkWidth() {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('hidden');
    } else {
      sidebar.classList.remove('hidden');
    }
  }

  window.addEventListener('resize', checkWidth);

  /* ==========================================================================
     Gallery Tabs Handler (Hanvins Construction Projects)
     ========================================================================== */

  /* ==========================================================================
     Slide 2 Corporate Structure Hover Synergy
     ========================================================================== */
  const corporateData = {
    rooch: {
      title: "Group Oversight",
      subtitle: "Strategic Direction & Core Governance",
      desc: "ROOCH Holding Inc. serves as the foundational parent entity, providing strategic corporate governance, key capital allocation, and group-wide operational synergy.",
      bullets: [
        { icon: "🛡️", title: "Strategic Capitalization", text: "Empowering fast-growing subsidiaries with the robust financial resources and scaling pathways to dominate local markets." },
        { icon: "📈", title: "Diversified Synergy", text: "Balancing operational risk and compound growth across civil construction, retail FMCG logistics, and enterprise software suites." }
      ]
    },
    hanvins: {
      title: "Hanvins Construction",
      subtitle: "Civil Infrastructure & Public Works",
      desc: "Delivering robust infrastructure, public highway connections, commercial plazas, and municipal development designs across regions.",
      bullets: [
        { icon: "🏗️", title: "Large-Scale Portfolio", text: "₱250M+ active project pipeline encompassing private commercial builds and municipal civil works." },
        { icon: "💰", title: "Banking Partner Funding Expansion", text: "Requesting ₱153M in capital upgrades for fleet expansion and batching plant acquisition." }
      ]
    },
    vertex: {
      title: "Vertex Technologies",
      subtitle: "Enterprise Software & Cloud Platforms",
      desc: "Creators of enterprise ERP software, eLGU digitization systems, Dealerover SaaS portals, and customized municipal database architectures.",
      bullets: [
        { icon: "💻", title: "eLGU Digitization", text: "Active across 50+ municipal portals, digitizing tax clearance, permit approvals, and public records." },
        { icon: "⚙️", title: "Dealerover SaaS", text: "Automating heavy machinery dealer operations, equipment leasing schedules, and parts inventories." }
      ]
    },

    men2solutions: {
      title: "MEN2 Solutions",
      subtitle: "Manpower Sourcing & Talent Acquisition",
      desc: "Specialized corporate staffing and labor supply provider, sourcing high-caliber professionals, skilled industrial workers, and operational personnel across group subsidiaries.",
      bullets: [
        { icon: "👥", title: "Strategic Staffing", text: "Managing group-wide staffing needs, recruitment drives, and human resource scaling pathways." },
        { icon: "🛠️", title: "Labor Allocation", text: "Providing immediate skilled labor support to construction (Hanvins) and logistics (MEN2) operations." }
      ]
    },

    men2dagupan: {
      title: "MEN2 Dagupan",
      subtitle: "North Luzon Logistics & Supply",
      desc: "Primary northern logistics hub, coordinating regional FMCG distribution pipelines and Mama Pina's food cargo dispatch.",
      bullets: [
        { icon: "🚛", title: "North Supply Authority", text: "₱45M+ annual volume, servicing major outlets across Region 1, 2, and CAR." },
        { icon: "📦", title: "Mama Pina's Synergy", text: "Direct distribution integration with Pangasinan noodle processing units." }
      ]
    },
    men2marikina: {
      title: "MEN2 Marikina",
      subtitle: "NCR & South Luzon Logistics",
      desc: "Southern distribution anchor, managing regional warehouse dispatch and automated retail replenishment.",
      bullets: [
        { icon: "🏭", title: "NCR Replenishment", text: "₱68M+ annual volume, servicing Metro Manila and Calabarzon retail networks." },
        { icon: "⚡", title: "Dealerover Sync", text: "Real-time middleware routing schedules trigger rapid deliveries." }
      ]
    },
    mamapina: {
      title: "Mama Pina's Food Brand",
      subtitle: "Traditional Recipes & Consumer Foods",
      desc: "Beloved traditional food brand celebrated for local recipes, high-quality noodle products, and high customer retention. Directly integrated with MEN2 logistics.",
      bullets: [
        { icon: "🍜", title: "Consumer Favorite", text: "Famous for traditional quality noodles, generating high customer loyalty and brand retention." },
        { icon: "🌾", title: "Integrated Distribution", text: "Directly synchronized with MEN2 logistics network to supply local supermarkets and O!Save discount stores." }
      ]
    },

    jcbs: {
      title: "JCBS",
      subtitle: "Industrial Business & Engineering",
      desc: "Specialized service division focused on industrial plant services, boiler/extruder operations, heavy machinery uptime, and key partnerships to scale manufacturing infrastructure.",
      bullets: [
        { icon: "🏗️", title: "Industrial Services", text: "Uptime management for boilers, extruders, and facility manufacturing lines." },
        { icon: "⚓", title: "Logistics Partnerships", text: "Successfully integrated fuel logistics and compliance with Sea Oil Philippines Inc." }
      ]
    }
  };
  const flowCards = document.querySelectorAll('.interactive-flow-card');
  const companyModal = document.getElementById('companyDetailsModal');
  const closeCompanyModalBtn = document.getElementById('closeCompanyModal');

  // PDF Viewer Modal elements
  const pdfViewerModal = document.getElementById('pdfViewerModal');
  const pdfViewerContent = pdfViewerModal ? pdfViewerModal.querySelector('.glass-card') : null;
  const pdfViewerIframe = document.getElementById('pdfViewerIframe');
  const pdfViewerTitle = document.getElementById('pdfViewerTitle');
  const closePdfModalBtn = document.getElementById('closePdfModal');

  if (flowCards && companyModal && closeCompanyModalBtn) {
    const modalContent = companyModal.querySelector('.modal-content-box');
    const subtitleEl = document.getElementById('modalCompanySubtitle');
    const titleEl = document.getElementById('modalCompanyTitle');
    const descEl = document.getElementById('modalCompanyDesc');
    const bulletsEl = document.getElementById('modalCompanyBullets');
    const papersContainer = document.getElementById('modalCompanyPapersContainer');
    const papersNoteEl = document.getElementById('modalCompanyPapersNote');
    const papersListEl = document.getElementById('modalCompanyPapersList');

    function openCompanyModal(companyKey) {
      const data = corporateData[companyKey];
      if (!data) return;

      // Populate textual information
      subtitleEl.textContent = data.subtitle || "ROOCH HOLDING INC.";
      titleEl.textContent = data.title;
      descEl.textContent = data.desc;

      // Generate bullets list
      let bulletsHtml = '';
      data.bullets.forEach(b => {
        bulletsHtml += `
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="font-size: 20px; width: 36px; height: 36px; border-radius: 8px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #38bdf8;">${b.icon}</div>
            <div>
              <strong style="font-size: 13px; color: white; display: block; margin-bottom: 1px;">${b.title}</strong>
              <p style="margin: 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.35;">${b.text}</p>
            </div>
          </div>
        `;
      });
      bulletsEl.innerHTML = bulletsHtml;

      // Determine papers list based on company key
      let papers = [];
      let papersNote = '';
      if (companyKey === 'rooch') {
        papers = [
          { name: "Articles of Incorporation", path: "Presentation_Assets/Company Papers/ROOCH/Rooch-Artices-of-Incorporation.pdf" },
          { name: "By-Laws", path: "Presentation_Assets/Company Papers/ROOCH/Rooch-ByLaws.pdf" },
          { name: "Certificate of Authentication", path: "Presentation_Assets/Company Papers/ROOCH/Rooch-Certificate-of-Authentication.pdf" },
          { name: "Certificate of Incorporation", path: "Presentation_Assets/Company Papers/ROOCH/Rooch-Certificate-of-Incorporation.pdf" }
        ];
      } else if (companyKey === 'vertex') {
        papers = [
          { name: "Vertex Technologies Permits", path: "Presentation_Assets/Company Papers/Vertex Technologies Corporation PERMITS.pdf" }
        ];
      } else if (companyKey === 'hanvins') {
        papers = [
          { name: "Hanvins Construction Permits", path: "Presentation_Assets/Company Papers/Hanvins Construction PERMITS.pdf" }
        ];
      } else if (companyKey === 'jcbs') {
        papers = [
          { name: "JCBS Permits", path: "Presentation_Assets/Company Papers/JCBS PERMITS.pdf" }
        ];
      } else if (['men2dagupan', 'men2marikina'].includes(companyKey)) {
        papers = [
          { name: "Business Permit 2026", path: "Presentation_Assets/Company Papers/MEN2/BUSINESS PERMIT 2026.pdf" },
          { name: "Amended Articles of Incorporation", path: "Presentation_Assets/Company Papers/MEN2/MEN2 CORP AMENDED ARTICLES OF INCORPORATION (JUNE 29, 2021).pdf" },
          { name: "Certificate of Incorporation (2022)", path: "Presentation_Assets/Company Papers/MEN2/MEN2 CORP CERTIFICATE OF INCORPORATION (SEPTEMBER 5, 2022).pdf" },
          { name: "Certificate of Incorporation", path: "Presentation_Assets/Company Papers/MEN2/MEN2 CORP CERTIFICATE OF INCORPORATION.pdf" },
          { name: "Updated COR", path: "Presentation_Assets/Company Papers/MEN2/MEN2 CORP UPDATED COR.pdf" },
          { name: "SEC CTC Certificate", path: "Presentation_Assets/Company Papers/MEN2/SEC (CERTIFICATE OF INCORPORATION) CERTIFIED TRUE COPY.pdf" },
          { name: "SEC CTC", path: "Presentation_Assets/Company Papers/MEN2/SEC- CERTIFIED TRUE COPY.pdf" },
          { name: "Marketing & Distribution Permits", path: "Presentation_Assets/Company Papers/Men2 Marketing & Distribution Corporation PERMITS.pdf" }
        ];
      }

      papersNoteEl.textContent = papersNote;
      papersNoteEl.style.display = papersNote ? 'block' : 'none';

      if (papers.length > 0) {
        let papersListHtml = '';
        papers.forEach(p => {
          papersListHtml += `
            <div class="view-pdf-btn" data-pdf="${p.path}" data-name="${p.name}" style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #38bdf8; cursor: pointer; padding: 4.5px 7px; border-radius: 4px; background: rgba(56,189,248,0.04); border: 1px solid rgba(56,189,248,0.1); transition: all 0.2s ease; width: 100%; box-sizing: border-box;" onmouseover="this.style.background='rgba(56,189,248,0.09)'; this.style.borderColor='rgba(56,189,248,0.25)';" onmouseout="this.style.background='rgba(56,189,248,0.04)'; this.style.borderColor='rgba(56,189,248,0.1)';">
              <span style="font-size: 12px; line-height: 1;">📄</span>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1; text-align: left;">${p.name}</span>
            </div>
          `;
        });
        papersListEl.innerHTML = papersListHtml;
        papersContainer.style.display = 'flex';
      } else {
        papersListEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: var(--text-muted); padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.015); border: 1px dashed rgba(255,255,255,0.08); width: 100%; box-sizing: border-box; font-style: italic;">
            <span>📁</span>
            <span>No documents on file yet (N/A)</span>
          </div>
        `;
        papersContainer.style.display = 'flex';
      }

      // Open animations
      companyModal.style.display = 'flex';
      // Force layout reflow
      void companyModal.offsetWidth;
      companyModal.style.opacity = '1';
      if (modalContent) {
        modalContent.style.transform = 'scale(1) translateY(0)';
      }
    }

    function closeCompanyDetailsModal() {
      companyModal.style.opacity = '0';
      if (modalContent) {
        modalContent.style.transform = 'scale(0.9) translateY(20px)';
      }
      setTimeout(() => {
        companyModal.style.display = 'none';
      }, 300);
    }

    flowCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const companyKey = card.getAttribute('data-company');
        openCompanyModal(companyKey);
      });
    });

    closeCompanyModalBtn.addEventListener('click', closeCompanyDetailsModal);

    // Backdrop click close
    companyModal.addEventListener('click', (e) => {
      if (e.target === companyModal) {
        closeCompanyDetailsModal();
      }
    });

    // PDF Viewer functions
    function openPdfViewer(path, name) {
      if (!pdfViewerModal || !pdfViewerIframe) return;
      pdfViewerTitle.textContent = name;
      pdfViewerIframe.src = path;
      
      const fallback = document.getElementById('pdfFallbackLink');
      if (fallback) fallback.href = path;

      pdfViewerModal.style.display = 'flex';
      void pdfViewerModal.offsetWidth;
      pdfViewerModal.style.opacity = '1';
      if (pdfViewerContent) {
        pdfViewerContent.style.transform = 'scale(1)';
      }
    }

    function closePdfViewer() {
      if (!pdfViewerModal || !pdfViewerIframe) return;
      pdfViewerModal.style.opacity = '0';
      if (pdfViewerContent) {
        pdfViewerContent.style.transform = 'scale(0.95)';
      }
      setTimeout(() => {
        pdfViewerModal.style.display = 'none';
        pdfViewerIframe.src = ''; // Clear src to stop parsing in background
      }, 300);
    }

    if (closePdfModalBtn) {
      closePdfModalBtn.addEventListener('click', closePdfViewer);
    }

    if (pdfViewerModal) {
      pdfViewerModal.addEventListener('click', (e) => {
        if (e.target === pdfViewerModal) {
          closePdfViewer();
        }
      });
    }

    // Global Event Delegation for any view-pdf-btn click
    document.addEventListener('click', (e) => {
      const pdfBtn = e.target.closest('.view-pdf-btn');
      if (pdfBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pdfPath = pdfBtn.getAttribute('data-pdf');
        const pdfName = pdfBtn.getAttribute('data-name');
        openPdfViewer(pdfPath, pdfName);
      }
    });
  }

  /* ==========================================================================
     Slide Specific Animation Triggers
     ========================================================================== */

  function triggerSlideScripts(slideIndex) {
    // Slide 5: Group Savings & Sales (Index 4)
    if (window.PresentationConfig.slides[slideIndex].file.includes("slide_05_savings")) {
      animateCounter('solarSavings', 267800, 'Php ', '');
      animateCounter('evSavings', 737365, 'Php ', '');
      animateCounter('totalSales', 120, 'Php ', 'M');
      
      // Trigger bar chart entry animations
      const bars = document.querySelectorAll('.bar');
      bars.forEach((bar) => {
        const heightVal = bar.style.height;
        bar.style.height = '0px';
        setTimeout(() => {
          bar.style.height = heightVal;
        }, 100);
      });
    }
    
    // O!Save Capital Request
    if (window.PresentationConfig.slides[slideIndex].file.includes("slide_06_capital")) {
      animateCounter('totalRequestVal', 215000000, 'Php ', '');
    }

    // O!Save Demand Impact slides
    const demandSlideFile = window.PresentationConfig.slides[slideIndex].file;
    if (demandSlideFile.includes("slide_09_demand") || demandSlideFile.includes("slide_09b_demand_pancit")) {
      const dbars = document.querySelectorAll('.d-bar');
      dbars.forEach((bar) => {
        const heightVal = bar.getAttribute('data-height');
        bar.style.height = '0%';
        setTimeout(() => {
          bar.style.height = heightVal;
        }, 100);
      });
    }
  }

  // Number Counter Animation Helper
  function animateCounter(elementId, targetValue, prefix = '', suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;

    let start = 0;
    const duration = 1200; // ms
    const startTime = performance.now();

    function updateNumber(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(start + (targetValue - start) * easeProgress);

      // Formatting currency comma separating
      if (suffix === 'M') {
        el.textContent = `${prefix}${currentValue}${suffix}`;
      } else {
        el.textContent = `${prefix}${currentValue.toLocaleString()}${suffix}`;
      }

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }

    requestAnimationFrame(updateNumber);
  }

  // Lightbox Modal Logic
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const closeLightbox = document.getElementById('closeLightbox');

  if (lightbox && lightboxImg && lightboxCaption && closeLightbox) {
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.img-box img, .upgrade-thumb img, .chart-visualization img, .flex-center img, .gallery-preview-box img');
      if (img) {
        lightbox.style.display = 'block';
        lightboxImg.src = img.dataset.fullSrc || img.src;
        lightboxCaption.textContent = img.alt || img.getAttribute('title') || 'Visual Asset';
      }
    });

    closeLightbox.addEventListener('click', () => {
      lightbox.style.display = 'none';
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxImg) {
        lightbox.style.display = 'none';
      }
    });
  }

  // Vertex Gallery Switcher Logic
  const vertexTabs = document.querySelectorAll('.vertex-tab');
  const galleryThumbsRow = document.getElementById('galleryThumbsRow');
  const galleryMainImg = document.getElementById('galleryMainImg');
  const galleryTitle = document.getElementById('galleryTitle');
  const vertexMetricText = document.getElementById('vertexMetricText');

  const vertexGalleryData = {
    erp: {
      metric: "VOS ERP: Active in 5 corporate subsidiaries. Handles over Php 250M of consolidated transactions annually.",
      images: [
        { src: "Presentation_Assets/Vertex/voss_erp_dashboard.png", thumbnail: "assets/optimized/technology/voss-erp-dashboard.jpg", title: "VOS ERP Suite - Administration Dashboard", desc: "VOS ERP serves as the enterprise core, providing automated ledgers, capex planning, real-time inventory matching, and payroll integration." },
        { src: "Presentation_Assets/Vertex/voss_erp_ledger.png", thumbnail: "assets/optimized/technology/voss-erp-ledger.jpg", title: "VOS ERP Suite - General Ledger Module", desc: "Automated general ledger tracking and reporting, syncing accounts payable/receivable across holding operations." },
        { src: "Presentation_Assets/Vertex/voss_erp_inventory.png", thumbnail: "assets/optimized/technology/voss-erp-inventory.jpg", title: "VOS ERP Suite - Stock & Inventory Ledger", desc: "Real-time multi-warehouse inventory management, handling SKU tracking and cross-branch stock transfers." }
      ]
    },
    dealer: {
      metric: "Dealerover Sync: Integrated with MEN2 distribution hubs. Over 1,200 active dealer subscribers synced.",
      images: [
        { src: "Presentation_Assets/Vertex/vosdealer_main_dashboard.jpg", thumbnail: "assets/optimized/technology/vosdealer-main-dashboard.jpg", title: "Dealerover - Main SCM Dashboard", desc: "Main portal for Supply Chain Management, coordinating branch replenishment orders and stock logistics." },
        { src: "Presentation_Assets/Vertex/vosdealer_crm_dashboard.jpg", thumbnail: "assets/optimized/technology/vosdealer-crm-dashboard.jpg", title: "Dealerover - Customer CRM Portal", desc: "CRM interface for dealer registrations, distributor order tracking, and field client profiling." },
        { src: "Presentation_Assets/Vertex/vosdealer_scm_approval.jpg", thumbnail: "assets/optimized/technology/vosdealer-scm-approval.jpg", title: "Dealerover - Purchase Order Approvals", desc: "Authorized approval workflow for procurement, stock transfers, and distributor billing." }
      ]
    },
    elgu: {
      metric: "eLGU Municipal Portals: Live in Mapandan, Pangasinan. Decreased business permit processing times by 75%.",
      images: [
        { src: "Presentation_Assets/Vertex/elgu_mapandan_portal.jpg", thumbnail: "assets/optimized/technology/elgu-mapandan-portal.jpg", title: "eLGU - Municipal Portal Homepage", desc: "Citizen-facing portal for Bayan ng Mapandan, enabling online business permits, tax processing, and local clearances." },
        { src: "Presentation_Assets/Vertex/elgu_admin_view.jpg", thumbnail: "assets/optimized/technology/elgu-admin-view.jpg", title: "eLGU - Administration Point-of-View", desc: "Backoffice admin system for municipal assessors to review tax filings, business licenses, and civil registry requests." },
        { src: "Presentation_Assets/Vertex/LGU Digitalization/4bff27fa-338e-439f-a76b-ecbd690e404d.jpg", thumbnail: "assets/optimized/technology/elgu-services.jpg", title: "eLGU - Digital Services List", desc: "List of active digital services available on the portal, including building zoning permits, clearances, and local licensing." }
      ]
    },
    sfa: {
      metric: "SFA Mobile: Deployed to 80+ field logistics agents. Automates booking, inventory audits, and daily cash collection reconciliation.",
      images: [
        { src: "Presentation_Assets/Vertex/sfa_booking_list.jpg", thumbnail: "assets/optimized/technology/sfa-booking-list.jpg", title: "SFA - Mobile Distributor Booking App", desc: "Mobile Sales Force Automation app used by field agents to log distributor orders and track dealer inventory in real-time." },
        { src: "Presentation_Assets/Vertex/sfa_site_sales_summary.jpg", thumbnail: "assets/optimized/technology/sfa-site-sales-summary.jpg", title: "SFA - Site Sales Performance Summary", desc: "Mobile summary dashboard showing daily sales achievements, customer logs, and delivery booking statuses." },
        { src: "Presentation_Assets/Vertex/SFA Booking/Screenshot_20260328-102311.jpg", thumbnail: "assets/optimized/technology/sfa-checkout.jpg", title: "SFA Mobile - Real-time Checkout", desc: "Real-time order checkout interface showing product list, quantity selections, and automated shipping schedules." }
      ]
    }
  };

  function loadVertexTab(tabKey) {
    const data = vertexGalleryData[tabKey];
    if (!data) return;

    // Update metric text
    if (vertexMetricText) vertexMetricText.textContent = data.metric;

    // Clear and build thumbs row
    if (galleryThumbsRow) {
      galleryThumbsRow.innerHTML = '';
      data.images.forEach((imgData, index) => {
        const thumb = document.createElement('div');
        thumb.className = `gal-thumb ${index === 0 ? 'active' : ''}`;
        thumb.setAttribute('data-img', imgData.src);
        thumb.setAttribute('data-title', imgData.title);
        thumb.setAttribute('data-desc', imgData.desc);
        
        const img = document.createElement('img');
        img.src = imgData.thumbnail || imgData.src;
        img.alt = imgData.title;
        img.loading = "lazy";
        img.decoding = "async";
        
        thumb.appendChild(img);
        galleryThumbsRow.appendChild(thumb);
      });
    }

    // Load first image as main
    if (data.images.length > 0) {
      setMainImage(data.images[0].src, data.images[0].title, data.images[0].desc);
    }
  }

  function setMainImage(src, title, desc) {
    if (galleryMainImg) {
      const ownerSlide = galleryMainImg.closest('.slide');
      const shouldLoad = !ownerSlide || ownerSlide.classList.contains('is-active');
      if (shouldLoad) {
        galleryMainImg.src = src;
        galleryMainImg.removeAttribute('data-src');
      } else {
        galleryMainImg.dataset.src = src;
        galleryMainImg.removeAttribute('src');
      }
      galleryMainImg.alt = title;
      galleryMainImg.setAttribute('title', desc);
    }
    if (galleryTitle) galleryTitle.textContent = title;
  }

  // Handle thumbnail clicks dynamically
  if (galleryThumbsRow) {
    galleryThumbsRow.addEventListener('click', (e) => {
      const thumb = e.target.closest('.gal-thumb');
      if (thumb) {
        document.querySelectorAll('.gal-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const src = thumb.getAttribute('data-img');
        const title = thumb.getAttribute('data-title');
        const desc = thumb.getAttribute('data-desc');
        setMainImage(src, title, desc);
      }
    });
  }

  // Initialize first tab
  if (vertexTabs.length > 0) {
    loadVertexTab('erp');
  }

  // Unified robust click handler using event delegation for tabs
  document.addEventListener('click', (e) => {
    // 1. Slide 11: Prezi Card Zoom Nodes
    const cardNode = e.target.closest('.prezi-card-node:not(.hanvin-card-node)');
    if (cardNode) {
      e.preventDefault();
      const target = cardNode.getAttribute('data-target');
      const container = document.getElementById('preziContainer');
      const exitBtn = document.getElementById('exitPreziBtn');
      if (container && exitBtn) {
        container.classList.remove('active-vertex');
        container.classList.add(`active-${target}`);
        exitBtn.style.display = 'flex';
      }
      return;
    }

    // 3. Slide 11: Prezi Exit Zoom Button
    const exitPrezi = e.target.closest('#exitPreziBtn');
    if (exitPrezi) {
      e.preventDefault();
      const container = document.getElementById('preziContainer');
      if (container) {
        container.classList.remove('active-vertex');
      }
      exitPrezi.style.display = 'none';
      return;
    }

    // 2. Vertex Inner Product Tabs Switcher
    const vTab = e.target.closest('.vertex-tab');
    if (vTab) {
      e.preventDefault();
      const target = vTab.getAttribute('data-target');
      const vTabs = document.querySelectorAll('.vertex-tab');
      if (vTabs.length > 0) {
        vTabs.forEach(t => t.classList.remove('active'));
        vTab.classList.add('active');
        loadVertexTab(target);
      }
      return;
    }
  });

  // Present Fullscreen API & Fallback present-mode Toggle
  const presentBtn = document.getElementById('presentBtn');
  const exitPresentBtn = document.getElementById('exitPresentBtn');

  function enterPresentMode() {
    document.body.classList.add('present-mode');
    // Try browser fullscreen
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`HTML5 fullscreen request bypassed/blocked: ${err.message}`);
    });
  }

  function exitPresentMode() {
    document.body.classList.remove('present-mode');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {});
    }
  }

  if (presentBtn) {
    presentBtn.addEventListener('click', () => {
      if (!document.body.classList.contains('present-mode')) {
        enterPresentMode();
      } else {
        exitPresentMode();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        document.body.classList.add('present-mode');
        presentBtn.innerHTML = '❌ Exit Fullscreen';
      } else {
        presentBtn.innerHTML = '📺 Present Fullscreen';
      }
    });
  }

  if (exitPresentBtn) {
    exitPresentBtn.addEventListener('click', exitPresentMode);
  }

  // Escape key exits present-mode and Prezi zoom modes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      exitPresentMode();
      
      // Reset Slide 11 Prezi
      const container11 = document.getElementById('preziContainer');
      const exit11 = document.getElementById('exitPreziBtn');
      if (container11 && exit11) {
        container11.classList.remove('active-vertex');
        exit11.style.display = 'none';
      }
      
    }
  });

  /* ==========================================================================
     Three.js 3D WebGL Solar System (Title Slide)
     ========================================================================== */
  
  function initThreeSolarSystem() {
    if (typeof THREE === 'undefined') {
      setTimeout(initThreeSolarSystem, 100);
      return;
    }

    const container = document.getElementById('solarSystemContainer');
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    if (width === 0 || height === 0) {
      setTimeout(initThreeSolarSystem, 100);
      return;
    }

    // Create Scene, Camera, WebGLRenderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 7.5, 13);
    camera.lookAt(0, 0, 0);

    // Low-end PC optimization: disable antialiasing, cap pixel ratio at 1.0, and specify low-power GPU preference
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1.0);
    container.appendChild(renderer.domElement);

    // Objects Group
    const solarGroup = new THREE.Group();
    scene.add(solarGroup);

    // Central Sun (glowing mesh sphere - segment count reduced for performance)
    const sunGeometry = new THREE.SphereGeometry(1.1, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0ea5e9, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.18 
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    solarGroup.add(sunMesh);

    // Central Sun Glow Ring (segment count reduced for performance)
    const glowGeo = new THREE.RingGeometry(1.2, 1.25, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.rotation.x = Math.PI / 2;
    solarGroup.add(glowRing);

    const orbitMats = [];
    function create3DOrbit(radius) {
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12 });
      orbitMats.push(material);
      const line = new THREE.Line(geometry, material);
      solarGroup.add(line);
    }
    
    create3DOrbit(3.2); // Inner orbit
    create3DOrbit(5.0); // Middle orbit
    create3DOrbit(6.8); // Outer orbit

    // Planets configuration (radius, speed, size, color, HTML label id)
    const planets = [
      { id: 'lbl-hanvins', radius: 3.2, angle: 0, speed: 0.007, size: 0.22, color: 0x0ea5e9 },
      
      { id: 'lbl-vertex', radius: 5.0, angle: 0, speed: 0.005, size: 0.22, color: 0x38bdf8 },
      { id: 'lbl-men2solutions', radius: 5.0, angle: Math.PI, speed: 0.005, size: 0.20, color: 0xc084fc },
      
      { id: 'lbl-men2parent', radius: 6.8, angle: 0, speed: 0.0035, size: 0.24, color: 0xf97316 },
      { id: 'lbl-mamapina', radius: 6.8, angle: Math.PI, speed: 0.0035, size: 0.18, color: 0x7dd3fc }
    ];

    // Create 3D spheres for each planet (invisible coordinates anchors)
    planets.forEach(p => {
      const geometry = new THREE.SphereGeometry(p.size, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0.0
      });
      p.mesh = new THREE.Mesh(geometry, material);
      solarGroup.add(p.mesh);
    });

    // Create a sub-system group for MEN2 parent and its moons
    const men2Group = new THREE.Group();
    solarGroup.add(men2Group);

    // Create the moons inside the sub-system
    const moons = [
      { id: 'lbl-men2dagupan', radius: 1.15, angle: 0, speed: 0.022, size: 0.15, color: 0xf97316 },
      { id: 'lbl-men2marikina', radius: 1.15, angle: (Math.PI * 2) / 3, speed: 0.022, size: 0.15, color: 0x38bdf8 },
      { id: 'lbl-jcbs', radius: 1.15, angle: (Math.PI * 4) / 3, speed: 0.022, size: 0.15, color: 0xf97316 }
    ];

    // Moon 3D meshes (invisible anchors)
    moons.forEach(m => {
      const geometry = new THREE.SphereGeometry(m.size, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0.0
      });
      m.mesh = new THREE.Mesh(geometry, material);
      men2Group.add(m.mesh);
    });

    // Create a 3D orbit line for the moons around the MEN2 parent
    const moonOrbitPoints = [];
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      moonOrbitPoints.push(new THREE.Vector3(Math.cos(theta) * 1.15, 0, Math.sin(theta) * 1.15));
    }
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPoints);
    const moonOrbitMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.12 });
    const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    men2Group.add(moonOrbitLine);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x0ea5e9, 2.0, 40);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Sync WebGL colors with Light/Dark Mode
    const updateThreeTheme = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const cSky = isLight ? 0x0284c7 : 0x38bdf8;
      const cSkyD = isLight ? 0x0284c7 : 0x0ea5e9;
      const cOrg = isLight ? 0xea580c : 0xf97316;
      sunMaterial.color.setHex(cSkyD);
      glowMat.color.setHex(cSky);
      pointLight.color.setHex(cSkyD);
      moonOrbitMat.color.setHex(cOrg);
      orbitMats.forEach(m => m.color.setHex(cSky));
    };
    const observer = new MutationObserver(updateThreeTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    updateThreeTheme();

    const sunOverlay = document.getElementById('threeSunOverlay');

    // 2D Projection Update function with 3D Depth Scaling & Layer Overlap
    function updateOverlayPos(mesh, element, radius) {
      if (!element) return;
      const pos = new THREE.Vector3();
      mesh.getWorldPosition(pos);
      
      // Calculate depth scaling factor based on Z (goes from -radius to +radius)
      let scale = 1.0;
      let zIndex = 10; // Sun sits at zIndex 10
      if (radius) {
        const depthFactor = (pos.z + radius) / (2 * radius); // 0.0 (farthest) to 1.0 (closest)
        scale = 0.7 + depthFactor * 0.45; // scale from 0.7x to 1.15x
        zIndex = pos.z > 0 ? 20 : 8; // Bring in front of Sun (zIndex 20) or behind Sun (zIndex 8)
      }
      
      pos.project(camera);
      
      const x = (pos.x * 0.5 + 0.5) * width;
      const y = (pos.y * -0.5 + 0.5) * height;
      
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.transform = `translate(-50%, -50%) scale(${scale})`;
      element.style.zIndex = zIndex;
    }

    // Animation Render Loop (optimized to throttle WebGL draws at 30fps for low-end machines)
    let lastRenderTime = 0;
    const renderInterval = 1000 / 30; // 30 FPS

    function animate(currentTime) {
      requestAnimationFrame(animate);
      if (!isTitleSlideActive) return;

      const timeNow = currentTime || performance.now();
      const elapsed = timeNow - lastRenderTime;
      if (elapsed < renderInterval) return;
      lastRenderTime = timeNow - (elapsed % renderInterval);

      // Rotate planets
      planets.forEach(p => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius;
        p.mesh.rotation.y += 0.01;

        // Keep the sub-system group centered on the parent planet
        if (p.id === 'lbl-men2parent') {
          men2Group.position.copy(p.mesh.position);
        }
      });

      // Rotate moons inside their sub-system
      moons.forEach(m => {
        m.angle += m.speed;
        m.mesh.position.x = Math.cos(m.angle) * m.radius;
        m.mesh.position.z = Math.sin(m.angle) * m.radius;
      });

      // Slowly spin the solar system base
      solarGroup.rotation.y = Date.now() * 0.0001;

      // Cinematic Camera Sway (provides organic 3D movement & parallax automatically)
      const time = Date.now() * 0.00035;
      camera.position.x = Math.sin(time) * 1.8;
      camera.position.y = 7.0 + Math.cos(time * 0.75) * 0.5;
      camera.position.z = 13.0 + Math.sin(time * 0.45) * 1.0;
      camera.lookAt(0, 0, 0);

      // Render WebGL Frame
      renderer.render(scene, camera);

      // Project 3D positions to 2D HTML labels (passing radius for planet scale/z-index updates)
      updateOverlayPos(sunMesh, sunOverlay);
      planets.forEach(p => {
        updateOverlayPos(p.mesh, document.getElementById(p.id), p.radius);
      });
      moons.forEach(m => {
        updateOverlayPos(m.mesh, document.getElementById(m.id), 6.8);
      });

    }

    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
  }

  // Run Three.js Solar System Setup once layout is loaded
  // Moved to loadSlides() to ensure the container is present

  // Edge Click Navigation Zone listeners
  const clickZoneLeft = document.getElementById('clickZoneLeft');
  const clickZoneRight = document.getElementById('clickZoneRight');
  if (clickZoneLeft && clickZoneRight) {
    clickZoneLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentSlideIndex - 1);
    });
    clickZoneRight.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentSlideIndex + 1);
    });
  }

  /* ==========================================================================
     Slide 10 Telemetry Log Simulator
     ========================================================================== */
  const consoleLogPool = [
    { text: "ORDER #1904: Noodles sync -> Dagupan Hub", color: "#fb923c" },
    { text: "STOCK SYNC: O!Save Mapandan updated (+120 cases)", color: "#38bdf8" },
    { text: "ROUTING RUN: Automated route optimization finished", color: "#a5f3fc" },
    { text: "OIL PRODUCT STOCK: Marikina Hub -> O!Save South NCR", color: "#38bdf8" },
    { text: "FLEET STATS: Truck #08 registered at Pangasinan checkpoint", color: "#a5f3fc" },
    { text: "SAAS SYNC: Dealerover client terminal 12 connection OK", color: "#22c55e" },
    { text: "BULK DISPATCH: 140 crates of Mama Pina's dispatched", color: "#fb923c" },
    { text: "STOCK WARNING: Low oil inventory alert at Marikina Hub (resolved)", color: "#e11d48" },
    { text: "REPLENISH SYNC: O!Save Hanvin triggers batch requisition", color: "#a855f7" }
  ];

  function runTelemetrySimulator() {
    const consoleContainer = document.getElementById('logConsoleContainer');
    if (!consoleContainer) return;

    const logIdx = Math.floor(Math.random() * consoleLogPool.length);
    const logItem = consoleLogPool[logIdx];

    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;

    const row = document.createElement('div');
    row.style.opacity = '0';
    row.style.transform = 'translateY(-5px)';
    row.style.transition = 'all 0.3s ease';
    row.style.color = logItem.color;
    row.textContent = `${timeStr} ${logItem.text}`;

    consoleContainer.appendChild(row);

    setTimeout(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    }, 50);

    while (consoleContainer.children.length > 4) {
      consoleContainer.removeChild(consoleContainer.firstChild);
    }
  }

  // Poll simulator logs
  setInterval(runTelemetrySimulator, 2500);

  /* ==========================================================================
     Dynamic Slide Loading
     ========================================================================== */
  const slideNamesToLoad = window.PresentationConfig ? window.PresentationConfig.slides.map(s => s.file) : [];


  /* ==========================================================================
     Ported Interactive Handlers from Rooch Presentation
     ========================================================================== */
  const pad = (value) => String(value).padStart(2, "0");
  const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);
  const hexToRgba = (hex, alpha) => {
    const normalized = String(hex).replace("#", "");
    const expanded = normalized.length === 3 ? normalized.split("").map((character) => character + character).join("") : normalized;
    const value = Number.parseInt(expanded, 16);
    if (!Number.isFinite(value)) return `rgba(14, 165, 233, ${alpha})`;
    return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  };
  const formatDuration = (value) => String(value).replace(/^(\d+)d$/, "$1 days");

  function initRoochInteractiveHandlers() {
    const data = window.OSavePresentation;

    // 0. Video Presentation Setup
    const videoEmbed = document.getElementById("presentationVideoEmbed");
    const videoStatusTitle = document.getElementById("videoStatusTitle");
    const videoStatusDetail = document.getElementById("videoStatusDetail");
    const videoOpenLink = document.getElementById("videoOpenLink");
    const videoPlaceholder = document.getElementById("videoPlaceholder");
    const embedUrl = (data && data.videoEmbedUrl) ? data.videoEmbedUrl : "https://drive.google.com/file/d/1qkeE5kPh6L4RRLE-_LyiFysJ5LogNIo7/preview";
    if (videoEmbed && embedUrl) {
      videoEmbed.src = embedUrl;
      videoEmbed.hidden = false;
      if (videoPlaceholder) videoPlaceholder.hidden = true;
      if (videoOpenLink) {
        videoOpenLink.href = embedUrl;
        videoOpenLink.hidden = false;
      }
      if (videoStatusTitle) videoStatusTitle.textContent = "Presentation video ready";
      if (videoStatusDetail) videoStatusDetail.textContent = "Use player controls below, or open the video in Google Drive if playback is blocked.";
    }

    if (!data) return;

    // 1. Photo Lightbox & Gallery (Manufacturing Expansion Status)
    const photoLightbox = document.getElementById("photoLightbox");
    const photoLightboxClose = document.getElementById("photoLightboxClose");
    const photoLightboxImage = document.getElementById("photoLightboxImage");
    const photoLightboxPrevious = document.getElementById("photoLightboxPrevious");
    const photoLightboxNext = document.getElementById("photoLightboxNext");
    const manufacturingStatus = Array.isArray(data.manufacturingStatus) ? data.manufacturingStatus : [];
    let activePhotoGroup = 0;
    let activePhotoIndex = 0;
    let lastPhotoTrigger = null;

    function renderActivePhoto() {
      if (!photoLightboxImage || !manufacturingStatus[activePhotoGroup]) return;
      const group = manufacturingStatus[activePhotoGroup];
      const photo = group.photos[activePhotoIndex];
      if (photo) {
        photoLightboxImage.src = photo.src;
        photoLightboxImage.alt = `${photo.title} - ${group.title}`;
      }
    }

    function openPhoto(groupIndex, photoIndex, trigger) {
      if (!photoLightbox) return;
      activePhotoGroup = groupIndex;
      activePhotoIndex = photoIndex;
      lastPhotoTrigger = trigger;
      renderActivePhoto();
      if (typeof photoLightbox.showModal === "function") {
        photoLightbox.showModal();
      } else {
        photoLightbox.style.display = "block";
      }
      if (photoLightboxClose) photoLightboxClose.focus();
    }

    function movePhoto(direction) {
      if (!manufacturingStatus[activePhotoGroup]) return;
      const photos = manufacturingStatus[activePhotoGroup].photos;
      activePhotoIndex = (activePhotoIndex + direction + photos.length) % photos.length;
      renderActivePhoto();
    }

    const galleryTargets = {
      oil: { gallery: "expansionOilGallery", count: "expansionOilCount" },
      pancit: { gallery: "expansionPancitGallery", count: "expansionPancitCount" },
      logistics: { gallery: "expansionLogisticsGallery", count: "expansionLogisticsCount" }
    };

    manufacturingStatus.forEach((group, groupIndex) => {
      const target = galleryTargets[group.id];
      if (!target) return;
      const gallery = document.getElementById(target.gallery);
      const countEl = document.getElementById(target.count);
      if (!gallery) return;
      if (countEl) countEl.textContent = `${group.photos.length} photos`;
      gallery.innerHTML = "";
      group.photos.forEach((photo, photoIndex) => {
        const button = document.createElement("button");
        const image = document.createElement("img");
        button.type = "button";
        button.className = "expansion-photo";
        button.setAttribute("aria-label", `Expand ${photo.title}`);
        image.dataset.src = photo.thumbnail || photo.src;
        image.alt = photo.title;
        image.loading = "lazy";
        image.decoding = "async";
        button.append(image);
        button.addEventListener("click", () => openPhoto(groupIndex, photoIndex, button));
        gallery.appendChild(button);
      });
    });

    if (photoLightbox) {
      if (photoLightboxClose) photoLightboxClose.addEventListener("click", () => photoLightbox.close ? photoLightbox.close() : (photoLightbox.style.display = "none"));
      if (photoLightboxPrevious) photoLightboxPrevious.addEventListener("click", () => movePhoto(-1));
      if (photoLightboxNext) photoLightboxNext.addEventListener("click", () => movePhoto(1));
      photoLightbox.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        movePhoto(event.key === "ArrowRight" ? 1 : -1);
      });
      photoLightbox.addEventListener("click", (event) => {
        if (event.target === photoLightbox && photoLightbox.close) photoLightbox.close();
      });
      photoLightbox.addEventListener("close", () => {
        if (photoLightboxImage) photoLightboxImage.removeAttribute("src");
        if (lastPhotoTrigger) lastPhotoTrigger.focus();
        lastPhotoTrigger = null;
      });
    }

    // 2. Oil Demand Table & Chart
    if (data.oilDemand && document.getElementById("oilDemandTable")) {
      const maxOilDemand = Math.max(...data.oilDemand.map((item) => item.cases));
      const totalOilDemand = data.oilDemand.reduce((total, item) => total + item.cases, 0);
      document.getElementById("oilDemandTable").innerHTML = `${data.oilDemand.map((item) => `
        <tr>
          <td>${item.region}</td>
          <td>${formatNumber(item.cases)} cases</td>
        </tr>`).join("")}
        <tr class="oil-demand-total">
          <th scope="row">Total Monthly Demand</th>
          <th>${formatNumber(totalOilDemand)} cases</th>
        </tr>`;

      if (document.getElementById("oilDemandChart")) {
        document.getElementById("oilDemandChart").innerHTML = `
          <div class="demand-chart-plot">
            <span class="demand-chart-gridline demand-chart-gridline-top" aria-hidden="true"></span>
            <span class="demand-chart-gridline demand-chart-gridline-quarter" aria-hidden="true"></span>
            <span class="demand-chart-gridline demand-chart-gridline-half" aria-hidden="true"></span>
            <span class="demand-chart-gridline demand-chart-gridline-three-quarter" aria-hidden="true"></span>
            <div class="demand-bars">
              ${data.oilDemand.map((item) => `
                <div class="demand-bar-column" role="img" aria-label="${item.region}: ${formatNumber(item.cases)} cases per month" style="--bar-height:${(item.cases / maxOilDemand) * 100}%;--bar-color:${item.color}">
                  <span class="demand-bar-value">${item.cases >= 1000 ? `${(item.cases / 1000).toFixed(1)}K` : formatNumber(item.cases)}</span>
                  <i class="demand-bar-fill"></i>
                  <span class="demand-bar-label">${item.code}</span>
                </div>`).join("")}
            </div>
          </div>
          <p class="demand-chart-legend"><strong>Legend:</strong> ${data.oilDemand.map((item) => `${item.code}: ${item.region.split(",")[0]}`).join(" | ")}</p>`;
      }
    }

    // 3. Pancit Demand Table & Chart
    if (data.pancitDemand && document.getElementById("pancitDemandTable")) {
      const pancitRecurringDemand = data.pancitDemand.filter((item) => !item.isSample);
      const pancitRecurringCases = pancitRecurringDemand.reduce((total, item) => total + item.cases, 0);
      const pancitRecurringPieces = pancitRecurringDemand.reduce((total, item) => total + item.pieces, 0);
      const maxPancitDemand = Math.max(...pancitRecurringDemand.map((item) => item.cases));
      
      document.getElementById("pancitDemandTable").innerHTML = `${data.pancitDemand.map((item) => `
        <tr class="${item.isSample ? "pancit-sample-row" : ""}" style="border-bottom: 1px solid rgba(var(--rgb-glass),0.03);">
          <td style="padding: 10px 8px; color: var(--text-primary); font-weight: 600;"><span class="pancit-product-name">${item.product}</span><small>${item.size}</small>${item.isSample ? "<em>Initial sampling</em>" : ""}</td>
          <td style="padding: 10px 8px; text-align: right; color: var(--text-primary); font-weight: 700;">${formatNumber(item.cases)}</td>
          <td style="padding: 10px 8px; text-align: right; color: var(--text-primary); font-weight: 700;">${formatNumber(item.pieces)}</td>
        </tr>`).join("")}
        <tr class="table-total" style="border-top: 2px solid rgba(var(--rgb-glass),0.12); font-weight: 700;">
          <td style="padding: 12px 8px; color: var(--text-primary);">Recurring Total</td>
          <td style="padding: 12px 8px; text-align: right; color: var(--color-sky); font-weight: 800;">${formatNumber(pancitRecurringCases)}</td>
          <td style="padding: 12px 8px; text-align: right; color: var(--color-sky); font-weight: 800;">${formatNumber(pancitRecurringPieces)}</td>
        </tr>`;

      if (document.getElementById("pancitDemandChart")) {
        const colWidth = data.pancitDemand.length <= 2 ? "38%" : "30%";
        document.getElementById("pancitDemandChart").innerHTML = `
          <div class="demand-bars" style="display: flex; align-items: flex-end; justify-content: space-around; height: 210px; padding-bottom: 10px; border-bottom: 1px solid rgba(var(--rgb-glass),0.08); position: relative; margin-bottom: 12px;">
            <div style="position: absolute; width: 100%; border-top: 1px dashed rgba(var(--rgb-glass),0.05); top: 0;"></div>
            <div style="position: absolute; width: 100%; border-top: 1px dashed rgba(var(--rgb-glass),0.05); top: 25%;"></div>
            <div style="position: absolute; width: 100%; border-top: 1px dashed rgba(var(--rgb-glass),0.05); top: 50%;"></div>
            <div style="position: absolute; width: 100%; border-top: 1px dashed rgba(var(--rgb-glass),0.05); top: 75%;"></div>
            ${data.pancitDemand.map((item) => {
              const barHeight = Math.max(item.isSample ? 1 : (item.cases / maxPancitDemand) * 100, 1);
              return `
                <div class="demand-bar-col ${item.isSample ? "is-sample" : ""}" role="img" aria-label="${item.product} ${item.size}: ${formatNumber(item.cases)} cases per month" style="display: flex; flex-direction: column; align-items: center; width: ${colWidth}; height: 100%; justify-content: flex-end; position: relative; z-index: 2; color: ${item.color};">
                  <span class="bar-val-popup" style="font-size: 9px; font-weight: 800; margin-bottom: 8px;">${item.cases >= 1000 ? `${Math.round(item.cases / 1000)}K` : formatNumber(item.cases)}</span>
                  <div class="d-bar" data-height="${barHeight}%" style="width: 100%; height: 0%; background: linear-gradient(180deg, ${hexToRgba(item.color, 0.85)} 0%, ${hexToRgba(item.color, 0.1)} 100%); border-top: 3px solid ${item.color}; border-radius: 6px 6px 0 0; box-shadow: 0 0 15px ${hexToRgba(item.color, 0.35)};"></div>
                  <span class="bar-lbl-under" style="font-size: 9px; color: var(--text-secondary); margin-top: 10px; font-weight: 700;">${item.product} ${item.size}</span>
                </div>`;
            }).join("")}
          </div>
          <div style="font-size: 9.5px; color: var(--text-muted); text-align: left; line-height: 1.4;"><strong>Legend:</strong> ${data.pancitDemand.map((item) => `${item.product} ${item.size}: ${item.cases >= 1000 ? `${Math.round(item.cases / 1000)}K` : formatNumber(item.cases)}${item.isSample ? " sample" : ""}`).join(" | ")}</div>`;
      }

      const recurringPiecesEl = document.getElementById("pancitRecurringPieces");
      if (recurringPiecesEl) recurringPiecesEl.textContent = `${formatNumber(pancitRecurringPieces)}`;

      const warehousesEl = document.getElementById("pancitWarehouses");
      if (warehousesEl && data.pancitWarehouses) {
        warehousesEl.innerHTML = data.pancitWarehouses.map(([code, name, cases]) => `
          <div class="pancit-warehouse-row" role="img" aria-label="${name}: ${formatNumber(cases)} cases per month"><strong>${code}</strong><span>${name}</span><small>${formatNumber(cases)} cases / month</small></div>`).join("");
      }
    }

    // 4. Oil Capacity Simulator
    if (data.oilCapacity && document.getElementById("oilCapacityTabs")) {
      const OIL_RATES = {
        p350: { fixedCurrDay: 12600, fixedCurrNight: 7200, expHourly: 7200 },
        p1L:  { fixedCurrDay: 4800,  fixedCurrNight: 3600, expHourly: 1800 },
        c1L:  { fixedCurrDay: 4800,  fixedCurrNight: 3600, expHourly: 1800 }
      };
      const OIL_KEYS = ["p350","p1L","c1L"];
      const capacityTabs = [];
      let selectedOilIndex = 0;

      function computeScenario(ratesObj, skuDays, hours, totalDays) {
        const dayHrs = Math.ceil(hours / 2);
        const nightHrs = Math.floor(hours / 2);

        const currDay = ratesObj.fixedCurrDay;
        const currNight = ratesObj.fixedCurrNight;
        const currDaily = currDay + currNight;
        const currMonthlyPotential = currDaily * 30;
        const currActualMixed = currDaily * skuDays;

        const expDay = ratesObj.expHourly * dayHrs;
        const expNight = ratesObj.expHourly * nightHrs;
        const expDaily = expDay + expNight;
        const expMonthlyPotential = expDaily * totalDays;
        const expActualMixed = expDaily * skuDays;

        return { currDay, currNight, currDaily, currMonthlyPotential, currActualMixed, expDay, expNight, expDaily, expMonthlyPotential, expActualMixed };
      }

      function updateOilSimulation(selectedIndex) {
        const hoursInput = document.getElementById("oil-input-hours");
        const daysInput = document.getElementById("oil-input-days");
        if (!hoursInput || !daysInput) return;

        const hours = Math.min(16, Math.max(6, parseInt(hoursInput.value) || 16));
        const totalDays = parseInt(daysInput.value);

        if (document.getElementById("oil-val-hours")) document.getElementById("oil-val-hours").textContent = `${hours} hours`;
        if (document.getElementById("oil-val-days")) document.getElementById("oil-val-days").textContent = `${totalDays} days`;
        if (document.getElementById("oil-kpi-hours")) document.getElementById("oil-kpi-hours").textContent = `${hours} hours`;
        if (document.getElementById("oil-kpi-days")) document.getElementById("oil-kpi-days").textContent = `${totalDays} days/month`;
        if (document.getElementById("oil-kpi-shifts")) {
          if (hours >= 16) document.getElementById("oil-kpi-shifts").textContent = "3 shifts (full)";
          else if (hours >= 10) document.getElementById("oil-kpi-shifts").textContent = "2 shifts (double)";
          else document.getElementById("oil-kpi-shifts").textContent = "1 shift (single)";
        }

        const mixP350 = document.getElementById("oil-mix-p350");
        const mixP1L = document.getElementById("oil-mix-p1L");
        const mixC1L = document.getElementById("oil-mix-c1L");
        if (mixP350) mixP350.max = totalDays;
        if (mixP1L) mixP1L.max = totalDays;
        if (mixC1L) mixC1L.max = totalDays;

        let d_p350 = mixP350 ? parseInt(mixP350.value) : 10;
        let d_p1L  = mixP1L ? parseInt(mixP1L.value) : 10;
        let d_c1L  = mixC1L ? parseInt(mixC1L.value) : 10;
        let sum = d_p350 + d_p1L + d_c1L;
        const warning = document.getElementById("oil-mix-warning");
        if (sum !== totalDays) {
          if (warning) warning.hidden = false;
          if (sum === 0) { d_p350 = Math.floor(totalDays/3); d_p1L = Math.floor(totalDays/3); d_c1L = totalDays - d_p350 - d_p1L; }
          else { const f = totalDays / sum; d_p350 = Math.round(d_p350*f); d_p1L = Math.round(d_p1L*f); d_c1L = totalDays - d_p350 - d_p1L; }
          if (mixP350) mixP350.value = d_p350;
          if (mixP1L) mixP1L.value = d_p1L;
          if (mixC1L) mixC1L.value = d_c1L;
        } else if (warning) warning.hidden = true;

        if (document.getElementById("oil-days-status")) document.getElementById("oil-days-status").textContent = `${totalDays} of ${totalDays} days`;
        if (document.getElementById("oil-val-mix-p350")) document.getElementById("oil-val-mix-p350").textContent = `${d_p350} days`;
        if (document.getElementById("oil-val-mix-p1L")) document.getElementById("oil-val-mix-p1L").textContent = `${d_p1L} days`;
        if (document.getElementById("oil-val-mix-c1L")) document.getElementById("oil-val-mix-c1L").textContent = `${d_c1L} days`;

        const skuDays = [d_p350, d_p1L, d_c1L];
        const calcs = OIL_KEYS.map((k, i) => computeScenario(OIL_RATES[k], skuDays[i], hours, totalDays));
        const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

        const OIL_DEMAND_VALUES = { p350: 394416, p1L: 200160, c1L: 240192 };
        const BASELINE_PCT = 30;
        calcs.forEach((calc, i) => {
          const p = OIL_KEYS[i];
          const currBar = document.getElementById(`oil-bar-${p}-curr`);
          const expBar = document.getElementById(`oil-bar-${p}-exp`);
          const demandBar = document.getElementById(`oil-bar-${p}-demand`);
          const currValue = document.getElementById(`oil-value-${p}-curr`);
          const expValue = document.getElementById(`oil-value-${p}-exp`);
          const demandValue = document.getElementById(`oil-value-${p}-demand`);
          if (currBar) {
            currBar.style.height = `${BASELINE_PCT}%`;
            currBar.setAttribute("aria-label", `Current allocated output: ${calc.currActualMixed.toLocaleString()} bottles`);
          }
          if (expBar) {
            const ratio = calc.currActualMixed > 0 ? calc.expActualMixed / calc.currActualMixed : 1;
            const expPct = Math.max(BASELINE_PCT, Math.min(100, BASELINE_PCT * ratio));
            expBar.style.height = `${expPct}%`;
            expBar.setAttribute("aria-label", `Expanded allocated output: ${calc.expActualMixed.toLocaleString()} bottles`);
          }
          if (demandBar) {
            const demVal = OIL_DEMAND_VALUES[p] || 0;
            const ratio = calc.currActualMixed > 0 ? demVal / calc.currActualMixed : 1;
            const demandPct = Math.max(BASELINE_PCT, Math.min(100, BASELINE_PCT * ratio));
            demandBar.style.height = `${demandPct}%`;
            demandBar.setAttribute("aria-label", `O!Save Demand: ${demVal.toLocaleString()} bottles`);
          }
          if (currValue) currValue.textContent = compactNumber.format(calc.currActualMixed);
          if (expValue) expValue.textContent = compactNumber.format(calc.expActualMixed);
          if (demandValue) demandValue.textContent = compactNumber.format(OIL_DEMAND_VALUES[p]);
        });

        const c = calcs[selectedIndex];
        const cap = data.oilCapacity[selectedIndex];
        const fmt = (v) => `${v.toLocaleString()} bottles`;
        if (document.getElementById("currentDay")) document.getElementById("currentDay").textContent = fmt(c.currDay);
        if (document.getElementById("currentNight")) document.getElementById("currentNight").textContent = fmt(c.currNight);
        if (document.getElementById("currentDaily")) document.getElementById("currentDaily").textContent = fmt(c.currDaily);
        if (document.getElementById("currentMonthly")) document.getElementById("currentMonthly").textContent = fmt(c.currMonthlyPotential);
        if (document.getElementById("expandedDay")) document.getElementById("expandedDay").textContent = fmt(c.expDay);
        if (document.getElementById("expandedNight")) document.getElementById("expandedNight").textContent = fmt(c.expNight);
        if (document.getElementById("expandedDaily")) document.getElementById("expandedDaily").textContent = fmt(c.expDaily);
        if (document.getElementById("expandedMonthly")) document.getElementById("expandedMonthly").textContent = fmt(c.expMonthlyPotential);

        const growth = c.expMonthlyPotential > c.currMonthlyPotential ? Math.round((c.expMonthlyPotential - c.currMonthlyPotential) / c.currMonthlyPotential * 100) : 0;
        if (document.getElementById("growthBadge")) document.getElementById("growthBadge").textContent = `+${growth}% Production Capacity`;

        if (cap && document.getElementById("oilProdLabel")) {
          const parts = cap.label.split(" ");
          const product = parts.slice(0, 2).join(" ");
          const tag = parts.slice(2).join(" ") || cap.label;
          const iconEl = document.getElementById("oilProdIcon");
          if (iconEl) {
            iconEl.classList.toggle("is-canola", selectedIndex === 2);
            iconEl.classList.toggle("is-palm", selectedIndex !== 2);
          }
          document.getElementById("oilProdLabel").textContent = product;
          if (document.getElementById("oilProdTag")) document.getElementById("oilProdTag").textContent = tag;
        }

        capacityTabs.forEach((button, buttonIndex) => {
          button.classList.toggle("is-active", buttonIndex === selectedIndex);
          button.setAttribute("aria-selected", String(buttonIndex === selectedIndex));
          button.setAttribute("tabindex", buttonIndex === selectedIndex ? "0" : "-1");
        });
      }

      function selectCapacity(index) {
        selectedOilIndex = index;
        updateOilSimulation(index);
      }

      const tabsContainer = document.getElementById("oilCapacityTabs");
      tabsContainer.innerHTML = "";
      data.oilCapacity.forEach((capacity, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.role = "tab";
        button.textContent = capacity.label;
        button.addEventListener("click", () => selectCapacity(index));
        tabsContainer.appendChild(button);
        capacityTabs.push(button);
      });

      ["oil-input-hours","oil-input-days","oil-mix-p350","oil-mix-p1L","oil-mix-c1L"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => updateOilSimulation(selectedOilIndex));
      });
      updateOilSimulation(0);
    }

    // 5. Current capacity tables
    const renderCapacitySummaryTable = (title, rows) => {
      return `
        <div class="capacity-summary-table-header"><strong>${title} Capacity</strong><span>Current Production by Shift</span></div>
        <div class="capacity-summary-table-wrap">
          <table class="capacity-summary-table" aria-label="${title} current capacity">
            <thead><tr><th scope="col">Product</th><th scope="col">Size</th><th scope="col">Shift</th><th scope="col">Produced Cases</th><th scope="col">Produced Pieces</th><th scope="col">Monthly Produced</th></tr></thead>
            <tbody>${rows.map(row => `
              <tr><td>${row.product}</td><td>${row.size}</td><td><em>${row.shift}</em></td><td>${formatNumber(row.cases)}</td><td>${formatNumber(row.pieces)}</td><td>${formatNumber(row.monthly)}</td></tr>
            `).join("")}</tbody>
          </table>
        </div>`;
    };

    const splitOilLabel = (label) => {
      const match = String(label).match(/^(.*)\s+(\d+(?:\.\d+)?(?:mL|L))$/i);
      return match ? { product: match[1], size: match[2] } : { product: label, size: "—" };
    };

    if (data.oilCapacity && document.getElementById("oilCurrentCapacityCards")) {
      const rows = data.oilCapacity.flatMap(item => {
        const unitsPerCase = item.unitsPerCase || 1;
        const [day, night] = item.current;
        const { product, size } = splitOilLabel(item.label);
        return [
          { product, size, shift: "Day Shift", cases: Math.round(day / unitsPerCase), pieces: day, monthly: day * 30 },
          { product, size, shift: "Night Shift", cases: Math.round(night / unitsPerCase), pieces: night, monthly: night * 30 }
        ];
      });
      document.getElementById("oilCurrentCapacityCards").innerHTML = renderCapacitySummaryTable("Oil", rows);
    }

    if (data.pancitCurrentCapacity && document.getElementById("pancitCurrentCapacityCards")) {
      const rows = data.pancitCurrentCapacity.map(item => ({
        product: item.label,
        size: item.size || "—",
        shift: item.shift || "—",
        cases: item.cases,
        pieces: item.pieces,
        monthly: item.monthly
      }));
      document.getElementById("pancitCurrentCapacityCards").innerHTML = renderCapacitySummaryTable("Pancit", rows);
    }

    // 6. Helper function for cycle step process flow
    function renderCycle(targetId, steps, options = {}) {
      const container = document.getElementById(targetId);
      if (!container) return;
      const radius = options.radius || 38;
      const stepMarkup = steps.map((step, index) => {
        const isObjectStep = !Array.isArray(step);
        const label = isObjectStep ? step.label : step[0];
        const duration = isObjectStep ? step.duration : step[1];
        const sublabel = isObjectStep ? step.sublabel : "";
        const phase = isObjectStep ? step.phase : (options.phases?.[index] || "");
        const angle = -90 + (index * 360) / steps.length;
        const radians = angle * Math.PI / 180;
        const x = 50 + radius * Math.cos(radians);
        const y = 50 + radius * Math.sin(radians);
        const readableDuration = formatDuration(duration);
        const content = `<i>${pad(index + 1)}</i><strong>${label}</strong>${sublabel ? `<small>${sublabel}</small>` : ""}<span>${readableDuration}</span>`;
        if (options.interactive) {
          return `<button type="button" class="cycle-step ${phase}" role="listitem" aria-label="${label}, ${sublabel}, ${readableDuration}" aria-pressed="${index === 0}" data-cycle-index="${index}" style="--step-x:${x.toFixed(3)}%;--step-y:${y.toFixed(3)}%">${content}</button>`;
        }
        return `<div class="cycle-step ${phase}" role="listitem" aria-label="${label}, ${readableDuration}" style="--step-x:${x.toFixed(3)}%;--step-y:${y.toFixed(3)}%">${content}</div>`;
      }).join("");
      container.innerHTML = `<div class="cycle-track" aria-hidden="true"></div>${stepMarkup}`;
    }

    // 7. Oil Working Capital Trade Cycle
    if (data.oilWorkingCapital && document.getElementById("oilCapitalHeadline")) {
      const oil = data.oilWorkingCapital;
      document.getElementById("oilCapitalHeadline").textContent = oil.headline.value;
      if (document.getElementById("oilCapitalHeadlineLabel")) document.getElementById("oilCapitalHeadlineLabel").textContent = oil.headline.label;
      if (document.getElementById("oilCapitalKpis")) document.getElementById("oilCapitalKpis").innerHTML = oil.kpis.map(([label, value, note]) => `<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("");
      if (document.getElementById("oilPurchaseRows")) document.getElementById("oilPurchaseRows").innerHTML = oil.purchases.map(item => `<div class="oil-purchase-row"><span>${item.label}<small>${item.monthly}</small></span><strong>${item.containers}<small>${item.weekly}</small></strong></div>`).join("");
      if (document.getElementById("oilProductRows")) document.getElementById("oilProductRows").innerHTML = oil.products.map(item => `<div class="oil-product-row ${item.tone}"><span>${item.label}<small>${item.daily} / day</small></span><strong>${item.weekly}<small>units / week</small></strong></div>`).join("");
      if (document.getElementById("oilShipmentChart")) {
        const shipmentPeak = Math.max(1, ...oil.shipments.flatMap(([, palm, canola]) => [palm, canola]));
        document.getElementById("oilShipmentChart").innerHTML = oil.shipments.map(([week, palm, canola]) => `<div class="shipment-week"><div class="shipment-bars"><i class="palm" style="--bar:${palm};--bar-ratio:${palm / shipmentPeak}"></i><i class="canola" style="--bar:${canola};--bar-ratio:${canola / shipmentPeak}"></i></div><span>${week}</span><strong>${palm + canola}</strong></div>`).join("");
      }
      if (document.getElementById("oilOutputTable")) document.getElementById("oilOutputTable").innerHTML = oil.products.map(item => `<div class="${item.tone}"><span>${item.label}</span><strong>${item.daily}<small>/ day</small></strong><b>${item.weekly}<small>/ week</small></b></div>`).join("");
      if (document.getElementById("oilCashCycle")) document.getElementById("oilCashCycle").innerHTML = oil.cashCycle.map(item => `<div class="${item.tone}"><span>${item.label}</span><i><b style="width:${item.share}%"></b></i><strong>${item.days}d</strong></div>`).join("");

      const selectStep = index => {
        document.querySelectorAll("#oilCycleFlow .cycle-step").forEach((button, buttonIndex) => {
          button.classList.toggle("is-selected", buttonIndex === index);
          button.setAttribute("aria-pressed", String(buttonIndex === index));
        });
      };
      if (document.getElementById("oilCycleFlow")) {
        renderCycle("oilCycleFlow", oil.cycle, { interactive: true, radius: 42 });
        document.querySelectorAll("#oilCycleFlow .cycle-step").forEach(button => button.addEventListener("click", () => selectStep(Number(button.dataset.cycleIndex))));
        selectStep(0);
      }
    }

    // 8. Pancit Working Capital Trade Cycle
    if (data.pancitWorkingCapital && document.getElementById("pancitCapitalHeadline")) {
      const pancit = data.pancitWorkingCapital;
      document.getElementById("pancitCapitalHeadline").textContent = pancit.headline.value;
      if (document.getElementById("pancitCapitalHeadlineLabel")) document.getElementById("pancitCapitalHeadlineLabel").textContent = pancit.headline.label;
      if (document.getElementById("pancitCapitalKpis")) document.getElementById("pancitCapitalKpis").innerHTML = pancit.kpis.map(([label, value, note]) => `<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("");
      if (document.getElementById("pancitWeeklyOutput")) document.getElementById("pancitWeeklyOutput").textContent = pancit.kpis[2][1];
      if (document.getElementById("pancitCollectionDays")) document.getElementById("pancitCollectionDays").textContent = pancit.kpis[3][1];
      if (document.getElementById("pancitMaterialsRows")) document.getElementById("pancitMaterialsRows").innerHTML = pancit.materials.map(item => `<div class="oil-purchase-row"><span>${item.label}<small>${item.note}</small></span><strong>${item.value}</strong></div>`).join("");
      if (document.getElementById("pancitMaterialsInsight")) document.getElementById("pancitMaterialsInsight").innerHTML = pancit.materials.map(item => `<div class="blue"><span>${item.label}</span><strong>${item.value}</strong></div>`).join("");

      const renderProductionRows = (items, valueKey = "share") => items.map(item => `<div class="pancit-production-row"><span class="label">${item.label}</span><div class="track"><i class="${item.tone}" style="width:${item.share}"></i></div><span class="value">${item[valueKey]}</span></div>`).join("");
      if (document.getElementById("pancitMonthlyMixTotal")) document.getElementById("pancitMonthlyMixTotal").textContent = pancit.productionMixTotal;
      if (document.getElementById("pancitMonthlyMixRows")) document.getElementById("pancitMonthlyMixRows").innerHTML = renderProductionRows(pancit.productionMix);
      if (document.getElementById("pancitMonthlyMixVolumes")) document.getElementById("pancitMonthlyMixVolumes").innerHTML = pancit.productionMix.map(item => `<span>${item.summaryLabel}: ${item.volume}</span>`).join("");
      if (document.getElementById("pancitWeeklyAvailabilityTotal")) document.getElementById("pancitWeeklyAvailabilityTotal").textContent = pancit.weeklyProductionTotal;
      if (document.getElementById("pancitWeeklyAvailabilityRows")) document.getElementById("pancitWeeklyAvailabilityRows").innerHTML = renderProductionRows(pancit.weeklyProductionAvailability);
      if (document.getElementById("pancitWeeklyOutputRows")) document.getElementById("pancitWeeklyOutputRows").innerHTML = renderProductionRows(pancit.weeklyProductionAvailability, "pieces");

      const selectStep = index => {
        document.querySelectorAll("#pancitCycleFlow .cycle-step").forEach((button, buttonIndex) => {
          button.classList.toggle("is-selected", buttonIndex === index);
          button.setAttribute("aria-pressed", String(buttonIndex === index));
        });
      };
      if (document.getElementById("pancitCycleFlow")) {
        renderCycle("pancitCycleFlow", pancit.cycle, { interactive: true, radius: 42 });
        document.querySelectorAll("#pancitCycleFlow .cycle-step").forEach(button => button.addEventListener("click", () => selectStep(Number(button.dataset.cycleIndex))));
        selectStep(0);
      }
    }

    window.activePancitFilter = 'all';

    window.setPancitFilter = function(filter) {
      window.activePancitFilter = filter;
      document.querySelectorAll('.pancit-filter-btn').forEach(btn => {
        const isSelected = btn.getAttribute('data-filter') === filter;
        if (isSelected) {
          btn.style.background = '#0ea5e9';
          btn.style.color = '#fff';
          btn.style.fontWeight = '700';
          btn.style.boxShadow = '0 0 10px rgba(14, 165, 233, 0.4)';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = '#94a3b8';
          btn.style.fontWeight = '600';
          btn.style.boxShadow = 'none';
        }
      });
      if (window.updateCapacityOutputs) {
        window.updateCapacityOutputs();
      }
    };

    // Capacity Expansion Real-Time Dynamic Computation
    window.updateCapacityOutputs = function() {
      const hoursEl = document.getElementById('capHoursSlider');
      const daysEl = document.getElementById('capDaysSlider');
      const bihonDaysEl = document.getElementById('capBihonDaysSlider');
      const cantonDaysEl = document.getElementById('capCantonDaysSlider');

      if (!hoursEl || !daysEl || !bihonDaysEl || !cantonDaysEl) return;

      const hours = parseInt(hoursEl.value, 10) || 16;
      const monthlyLimit = parseInt(daysEl.value, 10) || 30;

      bihonDaysEl.max = monthlyLimit;
      cantonDaysEl.max = monthlyLimit;

      if (parseInt(bihonDaysEl.value, 10) > monthlyLimit) {
        bihonDaysEl.value = monthlyLimit;
      }
      if (parseInt(cantonDaysEl.value, 10) > monthlyLimit) {
        cantonDaysEl.value = monthlyLimit;
      }

      const bihonDays = parseInt(bihonDaysEl.value, 10) || 0;
      const cantonDays = parseInt(cantonDaysEl.value, 10) || 0;

      const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };

      setTxt('capHoursVal', hours + ' hrs');
      setTxt('capDaysVal', monthlyLimit + ' days');
      setTxt('capBihonDaysVal', bihonDays + 'd');
      setTxt('capCantonDaysVal', cantonDays + 'd');
      
      const maxAllocated = Math.max(bihonDays, cantonDays);
      setTxt('capScheduleBadge', maxAllocated + '/' + monthlyLimit + 'd');

      const hoursRatio = hours / 16;
      const bihonRatio = bihonDays / 30;
      const cantonRatio = cantonDays / 30;

      // Bihon
      const bihonCases = Math.round(560 * hoursRatio);
      const bihonDayBuffer = Math.round(13440 * hoursRatio * bihonRatio);
      const bihonDayMonthly = Math.round(403200 * hoursRatio * bihonRatio);

      const bihonNightCases = Math.round(560 * hoursRatio);
      const bihonNightBuffer = Math.round(13440 * hoursRatio * bihonRatio);
      const bihonNightMonthly = Math.round(403200 * hoursRatio * bihonRatio);
      const bihonTotalOutput = bihonDayMonthly + bihonNightMonthly;

      // Canton
      const cantonCases = Math.round(300 * hoursRatio);
      const cantonDayBuffer = Math.round(6480 * hoursRatio * cantonRatio);
      const cantonDayMonthly = Math.round(194400 * hoursRatio * cantonRatio);

      const cantonNightCases = Math.round(300 * hoursRatio);
      const cantonNightBuffer = Math.round(6480 * hoursRatio * cantonRatio);
      const cantonNightMonthly = Math.round(194400 * hoursRatio * cantonRatio);
      const cantonTotalOutput = cantonDayMonthly + cantonNightMonthly;

      // Totals
      const totalCases = bihonCases * 2 + cantonCases * 2;
      const totalBuffer = bihonDayBuffer + bihonNightBuffer + cantonDayBuffer + cantonNightBuffer;
      const totalMonthlyOutput = bihonTotalOutput + cantonTotalOutput;

      // Update Table Rows
      setTxt('capBihonDayCases', bihonCases.toLocaleString());
      setTxt('capBihonDayBuffer', bihonDayBuffer.toLocaleString());
      setTxt('capBihonDayMonthly', bihonDayMonthly.toLocaleString());
      setTxt('capBihonNightCases', bihonNightCases.toLocaleString());
      setTxt('capBihonNightBuffer', bihonNightBuffer.toLocaleString());
      setTxt('capBihonNightMonthly', bihonNightMonthly.toLocaleString());

      setTxt('capCantonDayCases', cantonCases.toLocaleString());
      setTxt('capCantonDayBuffer', cantonDayBuffer.toLocaleString());
      setTxt('capCantonDayMonthly', cantonDayMonthly.toLocaleString());
      setTxt('capCantonNightCases', cantonNightCases.toLocaleString());
      setTxt('capCantonNightBuffer', cantonNightBuffer.toLocaleString());
      setTxt('capCantonNightMonthly', cantonNightMonthly.toLocaleString());

      // Filter-specific computation logic
      const filter = window.activePancitFilter || 'all';

      let activeBaseCurrent = 285840;
      let activeExpandedMonthly = totalMonthlyOutput;

      if (filter === 'bihon') {
        activeBaseCurrent = 201600;
        activeExpandedMonthly = bihonTotalOutput;
      } else if (filter === 'canton') {
        activeBaseCurrent = 84240;
        activeExpandedMonthly = cantonTotalOutput;
      }

      setTxt('capKpiExpandedMonthly', activeExpandedMonthly.toLocaleString());
      
      const productionIncrease = activeExpandedMonthly - activeBaseCurrent;
      const increaseEl = document.getElementById('capKpiIncrease');
      if (increaseEl) {
        increaseEl.textContent = (productionIncrease >= 0 ? '+' : '') + productionIncrease.toLocaleString();
      }

      const growthPercent = activeBaseCurrent > 0 ? Math.round((productionIncrease / activeBaseCurrent) * 100) : 0;
      const growthEl = document.getElementById('capKpiGrowth');
      if (growthEl) {
        growthEl.textContent = (growthPercent >= 0 ? '+' : '') + growthPercent + '%';
      }
      const badgeEl = document.getElementById('capKpiGrowthBadge');
      if (badgeEl) {
        if (growthPercent >= 0) {
          badgeEl.textContent = '↑ Increase';
          badgeEl.style.background = 'rgba(34, 197, 94, 0.2)';
          badgeEl.style.borderColor = 'rgba(34, 197, 94, 0.4)';
          badgeEl.style.color = '#4ade80';
        } else {
          badgeEl.textContent = '↓ Decrease';
          badgeEl.style.background = 'rgba(239, 68, 68, 0.2)';
          badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          badgeEl.style.color = '#f87171';
        }
      }

      // Header badges
      const badgeTag = document.getElementById('capBreakdownBadgeTag');
      if (badgeTag) {
        if (filter === 'bihon') badgeTag.textContent = 'Bihon 454G';
        else if (filter === 'canton') badgeTag.textContent = 'Canton 300G';
        else badgeTag.textContent = 'All Products';
      }
      const badgeSub = document.getElementById('capBreakdownBadgeSub');
      if (badgeSub) {
        if (filter === 'bihon') badgeSub.textContent = 'Bihon Capacity Breakdown';
        else if (filter === 'canton') badgeSub.textContent = 'Canton Capacity Breakdown';
        else badgeSub.textContent = 'Bihon & Canton Capacity Breakdown';
      }

      // Row highlighting & dimming
      const currentBihon = document.getElementById('capCurrentRowBihon');
      const currentCanton = document.getElementById('capCurrentRowCanton');
      if (currentBihon) {
        currentBihon.style.opacity = (filter === 'all' || filter === 'bihon') ? '1' : '0.25';
        currentBihon.style.filter = (filter === 'all' || filter === 'bihon') ? 'none' : 'grayscale(0.8)';
      }
      if (currentCanton) {
        currentCanton.style.opacity = (filter === 'all' || filter === 'canton') ? '1' : '0.25';
        currentCanton.style.filter = (filter === 'all' || filter === 'canton') ? 'none' : 'grayscale(0.8)';
      }

      const rowBihonDay = document.getElementById('capRowBihonDay');
      const rowBihonNight = document.getElementById('capRowBihonNight');
      const rowCantonDay = document.getElementById('capRowCantonDay');
      const rowCantonNight = document.getElementById('capRowCantonNight');

      if (rowBihonDay) {
        rowBihonDay.style.opacity = (filter === 'all' || filter === 'bihon') ? '1' : '0.25';
        rowBihonDay.style.filter = (filter === 'all' || filter === 'bihon') ? 'none' : 'grayscale(0.8)';
      }
      if (rowBihonNight) {
        rowBihonNight.style.opacity = (filter === 'all' || filter === 'bihon') ? '1' : '0.25';
        rowBihonNight.style.filter = (filter === 'all' || filter === 'bihon') ? 'none' : 'grayscale(0.8)';
      }
      if (rowCantonDay) {
        rowCantonDay.style.opacity = (filter === 'all' || filter === 'canton') ? '1' : '0.25';
        rowCantonDay.style.filter = (filter === 'all' || filter === 'canton') ? 'none' : 'grayscale(0.8)';
      }
      if (rowCantonNight) {
        rowCantonNight.style.opacity = (filter === 'all' || filter === 'canton') ? '1' : '0.25';
        rowCantonNight.style.filter = (filter === 'all' || filter === 'canton') ? 'none' : 'grayscale(0.8)';
      }

      // Total Row label & value
      const totalLabelEl = document.getElementById('capTotalRowLabel');
      if (totalLabelEl) {
        if (filter === 'bihon') totalLabelEl.textContent = 'BIHON TOTAL';
        else if (filter === 'canton') totalLabelEl.textContent = 'CANTON TOTAL';
        else totalLabelEl.textContent = 'TOTAL';
      }
      if (filter === 'bihon') {
        setTxt('capTotalCases', (bihonCases * 2).toLocaleString());
        setTxt('capTotalBuffer', (bihonDayBuffer + bihonNightBuffer).toLocaleString());
        setTxt('capTotalMonthly', bihonTotalOutput.toLocaleString());
      } else if (filter === 'canton') {
        setTxt('capTotalCases', (cantonCases * 2).toLocaleString());
        setTxt('capTotalBuffer', (cantonDayBuffer + cantonNightBuffer).toLocaleString());
        setTxt('capTotalMonthly', cantonTotalOutput.toLocaleString());
      } else {
        setTxt('capTotalCases', totalCases.toLocaleString());
        setTxt('capTotalBuffer', totalBuffer.toLocaleString());
        setTxt('capTotalMonthly', totalMonthlyOutput.toLocaleString());
      }

      // Chart Groups Highlight & Scale
      const groupBihon = document.getElementById('capChartGroupBihon');
      const groupCanton = document.getElementById('capChartGroupCanton');
      const groupTotal = document.getElementById('capChartGroupTotal');

      if (groupBihon) {
        groupBihon.style.opacity = (filter === 'all' || filter === 'bihon') ? '1' : '0.25';
        groupBihon.style.transform = (filter === 'bihon') ? 'scale(1.04)' : 'scale(1)';
      }
      if (groupCanton) {
        groupCanton.style.opacity = (filter === 'all' || filter === 'canton') ? '1' : '0.25';
        groupCanton.style.transform = (filter === 'canton') ? 'scale(1.04)' : 'scale(1)';
      }
      if (groupTotal) {
        groupTotal.style.opacity = (filter === 'all') ? '1' : '0.25';
      }

      // Update Bottom Bar Chart
      const maxVal = 1000000;
      
      const bihonExpCol = document.getElementById('capChartBihonExpCol') || (document.getElementById('capChartBihonExpBar') && document.getElementById('capChartBihonExpBar').parentElement);
      const bihonExpVal = document.getElementById('capChartBihonExpVal');
      if (bihonExpCol) {
        const pct = Math.min(100, Math.max(0, (bihonTotalOutput / maxVal) * 100));
        bihonExpCol.style.height = pct + '%';
      }
      if (bihonExpVal) {
        bihonExpVal.textContent = Math.round(bihonTotalOutput / 1000) + 'K';
      }

      const cantonExpCol = document.getElementById('capChartCantonExpCol') || (document.getElementById('capChartCantonExpBar') && document.getElementById('capChartCantonExpBar').parentElement);
      const cantonExpVal = document.getElementById('capChartCantonExpVal');
      if (cantonExpCol) {
        const pct = Math.min(100, Math.max(0, (cantonTotalOutput / maxVal) * 100));
        cantonExpCol.style.height = pct + '%';
      }
      if (cantonExpVal) {
        cantonExpVal.textContent = Math.round(cantonTotalOutput / 1000) + 'K';
      }

      const totalExpCol = document.getElementById('capChartTotalExpCol') || (document.getElementById('capChartTotalExpBar') && document.getElementById('capChartTotalExpBar').parentElement);
      const totalExpVal = document.getElementById('capChartTotalExpVal');
      if (totalExpCol) {
        const pct = Math.min(100, Math.max(0, (totalMonthlyOutput / maxVal) * 100));
        totalExpCol.style.height = pct + '%';
      }
      if (totalExpVal) {
        totalExpVal.textContent = Math.round(totalMonthlyOutput / 1000).toLocaleString() + 'K';
      }
    };

    window.updateCapacityOutputs();
  }


  async function loadSlides() {
    slides = document.querySelectorAll('.slide');
    
    // If slides are not pre-inlined in HTML, fetch them dynamically
    if (slides.length === 0) {
      let htmlContent = "";
      let projectData = {};
      try {
        const resp = await fetch(`project_data.json?t=${Date.now()}`, { cache: 'no-store' });
        if (resp.ok) projectData = await resp.json();
      } catch(e) {}

      for (const name of slideNamesToLoad) {
        try {
          const response = await fetch(`slides/${name}?t=${Date.now()}`, { cache: 'no-store' });
          let text = await response.text();
          text = text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            let val = projectData[key];
            if (typeof val === 'object') return JSON.stringify(val).replace(/'/g, "&#39;");
            return val !== undefined ? val : match;
          });
          htmlContent += text;
        } catch (err) {
          console.error("Failed to load slide:", name, err);
        }
      }
      slidesContainer.innerHTML = htmlContent;
      slides = document.querySelectorAll('.slide');
    }

    // Keep the inlined presentation aligned with the configured navigation order.
    const legacyHanvinSlide = slidesContainer.querySelector('[data-slide-key="hanvin"]');
    if (legacyHanvinSlide) legacyHanvinSlide.remove();

    const achievementsSlide = slidesContainer.querySelector('[data-slide-key="achievements"]');
    const logisticsSlide = slidesContainer.querySelector('[data-slide-key="men2-dealerover"]');
    if (achievementsSlide && logisticsSlide) {
      slidesContainer.insertBefore(achievementsSlide, logisticsSlide);
    }

    const pancitDemandSlide = slidesContainer.querySelector('[data-title="O!Save Demand Impact Pancit"]');
    const capitalRequestSlide = slidesContainer.querySelector('[data-title="O!Save Capital Request"]');
    if (pancitDemandSlide && capitalRequestSlide) {
      pancitDemandSlide.after(capitalRequestSlide);
    }

    slides = document.querySelectorAll('.slide');
    
    totalSlides = slides.length;
    
    checkWidth();
    initSidebarNavigation();
    initProgressDots();
    initRoochInteractiveHandlers();
    goToSlide(0);
    initThreeSolarSystem();
  }

  // App Initialization
  loadSlides();
});
