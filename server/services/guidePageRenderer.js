// Renders the static HTML for guide landing pages and country bundle
// pages — a direct port of travelsmarter-frontend's scripts/generate-guide-page.js
// and scripts/generate-guide-bundle-page.js, so committed output via
// githubService.js is byte-for-byte what running those scripts by hand
// would have produced. Keep both copies in sync if the template changes.

function faqJsonLd(faqs) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }, null, 2);
}

function renderGuidePage(guide, bundlePriceCents) {
  const priceUSD = (guide.price_cents / 100).toFixed(2);
  const bundleUSD = (bundlePriceCents / 100).toFixed(2);
  const freeItems = guide.free_items || [];

  const faqs = [
    { q: `What's in the "${guide.title}" guide?`, a: `A curated, verified list covering ${guide.title.toLowerCase()} — the ${freeItems.length} below are free to see, the full guide (delivered as a PDF) has the complete list plus practical details for each entry.` },
    { q: 'How do I get it?', a: `Enter your email and pay $${priceUSD} — the PDF is emailed to you immediately after payment.` },
    { q: `Is there a cheaper way to get all ${guide.country_name} guides?`, a: `Yes — the ${guide.country_name} Guide Bundle covers every published guide for ${guide.country_name} for a flat $${bundleUSD}, and automatically includes any guide added for ${guide.country_name} later too.` },
  ];

  const freeItemsHtml = freeItems.map((item, i) => `
                <div class="preview-item">
                    <span class="preview-num">${i + 1}</span>
                    <div>
                        <strong>${item.name}</strong>
                        ${item.blurb ? `<p>${item.blurb}</p>` : ''}
                    </div>
                </div>`).join('\n');

  const faqHtml = faqs.map(f => `            <div class="faq-item">
                <h3>${f.q}</h3>
                <p>${f.a}</p>
            </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${guide.title} | TravelSmarter</title>
    <meta name="description" content="${guide.subtitle || guide.title + ' — a curated PDF guide from TravelSmarter.'}">
    <link rel="canonical" href="https://travelsmarterapp.com/guide-${guide.slug}.html">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${guide.title}">
    <meta property="og:description" content="${guide.subtitle || guide.title}">
    <meta property="og:url" content="https://travelsmarterapp.com/guide-${guide.slug}.html">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${guide.title}">
    <meta name="twitter:description" content="${guide.subtitle || guide.title}">

    <script type="application/ld+json">
    ${faqJsonLd(faqs)}
    </script>

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-470B6E2DKF"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-470B6E2DKF');
    </script>

    <script>
      (function () {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
        fetch('https://api.travelsmarterapp.com/api/analytics/free-tools/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: window.location.pathname }),
          keepalive: true
        }).catch(function () {});
      })();
    </script>

    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
            background:#f9fafb; color:#1f2937; line-height:1.6;
        }
        header {
            background:linear-gradient(135deg,#1a2744 0%,#2d3f6b 100%);
            color:white; padding:18px 0;
        }
        header .container { max-width:760px; margin:0 auto; padding:0 20px; }
        header a { color:#ff6b4a; font-weight:800; font-size:1.2em; text-decoration:none; }
        .hero { max-width:760px; margin:0 auto; padding:50px 20px 20px; text-align:center; }
        .hero .badge {
            display:inline-block; background:#f0f4ff; color:#1a2744; font-weight:700;
            font-size:14px; padding:8px 16px; border-radius:20px; margin-bottom:20px;
        }
        .hero h1 { font-size:1.9em; color:#1a2744; margin-bottom:14px; }
        .hero p { color:#6b7280; font-size:1.05em; max-width:600px; margin:0 auto; }
        .container { max-width:760px; margin:0 auto; padding:30px 20px 60px; }
        .card {
            background:white; border-radius:12px; padding:32px;
            box-shadow:0 4px 20px rgba(0,0,0,0.06); margin-bottom:24px;
        }
        .preview-item { display:flex; gap:14px; padding:12px 0; border-bottom:1px solid #f3f4f6; }
        .preview-item:last-child { border-bottom:none; }
        .preview-num {
            flex-shrink:0; width:28px; height:28px; border-radius:50%; background:#f0f4ff;
            color:#1a2744; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center;
        }
        .preview-item strong { color:#1a2744; }
        .preview-item p { color:#6b7280; font-size:14px; margin-top:2px; }
        .paywall-card { background:linear-gradient(135deg,#1a2744 0%,#2d3f6b 100%); color:white; }
        .paywall-card h2 { font-size:1.3em; margin-bottom:8px; }
        .paywall-card p { color:#c7d2fe; margin-bottom:20px; font-size:14px; }
        .price { font-size:2em; font-weight:800; margin-bottom:20px; }
        .price span { font-size:0.4em; font-weight:600; color:#c7d2fe; }
        label { display:block; font-weight:600; font-size:14px; margin-bottom:6px; }
        input[type="email"], input[type="text"] {
            width:100%; padding:11px 14px; border:1px solid rgba(255,255,255,0.2); border-radius:8px;
            font-size:15px; margin-bottom:14px; background:rgba(255,255,255,0.1); color:white;
        }
        input::placeholder { color:#9ca3af; }
        .btn {
            display:inline-block; background:#ff6b4a; color:white; border:none;
            padding:13px 28px; border-radius:8px; font-weight:700; font-size:15px;
            cursor:pointer; width:100%;
        }
        .btn:disabled { opacity:0.6; cursor:default; }
        .alert { padding:12px 16px; border-radius:8px; font-size:14px; margin-bottom:14px; display:none; }
        .alert-error { background:#fee2e2; color:#991b1b; }
        .bundle-cta {
            text-align:center; margin-top:16px; font-size:13px; color:#c7d2fe;
        }
        .bundle-cta a { color:white; font-weight:700; text-decoration:underline; }
        .content-block h2 { font-size:1.3em; color:#1a2744; margin-bottom:12px; }
        .faq-item { margin-bottom:18px; }
        .faq-item h3 { font-size:1.02em; color:#1a2744; margin-bottom:6px; }
        .faq-item p { color:#4b5563; font-size:14.5px; }
        footer { text-align:center; padding:30px 20px; color:#9ca3af; font-size:13px; }
        footer a { color:#667eea; text-decoration:none; }
    </style>
</head>
<body>
    <header>
        <div class="container"><a href="index.html">✈️ TravelSmarter</a></div>
    </header>

    <div class="hero">
        <span class="badge">${guide.country_name} · ${guide.category}</span>
        <h1>${guide.title}</h1>
        ${guide.subtitle ? `<p>${guide.subtitle}</p>` : ''}
    </div>

    <div class="container">
        <div class="card">
            <h2 style="font-size:1.15em; color:#1a2744; margin-bottom:16px;">Free preview</h2>
            ${freeItemsHtml || '<p style="color:#6b7280;">Preview coming soon.</p>'}
        </div>

        <div class="card paywall-card">
            <h2>Get the full guide</h2>
            <p>The complete list, plus practical details for every entry — delivered as a PDF straight to your inbox.</p>
            <div class="price">$${priceUSD} <span>one-time</span></div>

            <div id="checkout-alert" class="alert alert-error"></div>
            <label for="email">Email address</label>
            <input type="email" id="email" placeholder="you@example.com" required>
            <button class="btn" id="checkout-btn" onclick="startCheckout()">Get the Guide — $${priceUSD}</button>

            <div class="bundle-cta">
                Want every ${guide.country_name} guide? <a href="guides-bundle-${guide.country_slug}.html">Get the bundle for $${bundleUSD} →</a>
            </div>
        </div>

        <div class="card content-block">
            <h2>Frequently asked questions</h2>
${faqHtml}
        </div>
    </div>

    <footer>
        Part of <a href="sales-page.html">TravelSmarter</a> — 87 verified travel hacks, price alerts, and more.
    </footer>

    <script>
        let API_URL;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            API_URL = 'http://localhost:5000';
        } else {
            API_URL = 'https://api.travelsmarterapp.com';
        }

        async function startCheckout() {
            const email = document.getElementById('email').value.trim();
            const alertEl = document.getElementById('checkout-alert');
            alertEl.style.display = 'none';

            if (!email || !email.includes('@')) {
                alertEl.textContent = 'Please enter a valid email address.';
                alertEl.style.display = 'block';
                return;
            }

            const btn = document.getElementById('checkout-btn');
            btn.disabled = true;
            btn.textContent = 'Redirecting to checkout...';

            try {
                const res = await fetch(\`\${API_URL}/api/guides/checkout\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slug: '${guide.slug}',
                        email,
                        sourcePage: window.location.pathname,
                    }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Something went wrong');

                gtag('event', 'begin_checkout', { tool: 'guide_${guide.slug.replace(/-/g, '_')}' });
                window.location.href = data.url;
            } catch (err) {
                alertEl.textContent = err.message;
                alertEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Get the Guide — $${priceUSD}';
            }
        }
    </script>
</body>
</html>
`;
}

function renderBundlePage(data) {
  const { countrySlug, countryName, guides, bundlePriceCents, featuredSlugs } = data;
  const bundleUSD = (bundlePriceCents / 100).toFixed(2);
  const singleTotal = guides.reduce((sum, g) => sum + g.price_cents, 0) / 100;
  const savings = (singleTotal - bundlePriceCents / 100).toFixed(2);

  // Split into featured (spotlight, shown with description) and the rest
  // (listed compactly as "also included"). featuredSlugs is the curated 3–9
  // chosen upstream; if it's missing or empty, feature everything so the page
  // still renders. Every guide stays in the bundle either way — this only
  // decides the layout.
  const orderedFeatured = (featuredSlugs && featuredSlugs.length ? featuredSlugs : guides.map(g => g.slug));
  const featuredSet = new Set(orderedFeatured);
  const bySlug = Object.fromEntries(guides.map(g => [g.slug, g]));
  const featured = orderedFeatured.map(s => bySlug[s]).filter(Boolean);
  const rest = guides.filter(g => !featuredSet.has(g.slug));

  const guideListHtml = featured.map(g => `
                <div class="guide-row">
                    <div>
                        <strong>${g.title}</strong>
                        ${g.subtitle ? `<p>${g.subtitle}</p>` : ''}
                    </div>
                    <span class="guide-price">$${(g.price_cents / 100).toFixed(2)}</span>
                </div>`).join('\n');

  const alsoIncludedHtml = rest.length ? `
            <div class="also-included">
                <p class="also-included-label">Also included</p>
                <ul class="also-list">
${rest.map(g => `                    <li>${g.title}</li>`).join('\n')}
                </ul>
            </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${countryName} Guide Bundle — All PDF Guides | TravelSmarter</title>
    <meta name="description" content="Every TravelSmarter PDF guide for ${countryName} — restaurants, attractions, and more — bundled for $${bundleUSD}.">
    <link rel="canonical" href="https://travelsmarterapp.com/guides-bundle-${countrySlug}.html">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${countryName} Guide Bundle">
    <meta property="og:description" content="Every TravelSmarter PDF guide for ${countryName}, bundled for $${bundleUSD}.">
    <meta property="og:url" content="https://travelsmarterapp.com/guides-bundle-${countrySlug}.html">

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-470B6E2DKF"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-470B6E2DKF');
    </script>

    <script>
      (function () {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
        fetch('https://api.travelsmarterapp.com/api/analytics/free-tools/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: window.location.pathname }),
          keepalive: true
        }).catch(function () {});
      })();
    </script>

    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
            background:#f9fafb; color:#1f2937; line-height:1.6;
        }
        header {
            background:linear-gradient(135deg,#1a2744 0%,#2d3f6b 100%);
            color:white; padding:18px 0;
        }
        header .container { max-width:760px; margin:0 auto; padding:0 20px; }
        header a { color:#ff6b4a; font-weight:800; font-size:1.2em; text-decoration:none; }
        .hero { max-width:760px; margin:0 auto; padding:50px 20px 20px; text-align:center; }
        .hero h1 { font-size:1.9em; color:#1a2744; margin-bottom:14px; }
        .hero p { color:#6b7280; font-size:1.05em; max-width:600px; margin:0 auto; }
        .container { max-width:760px; margin:0 auto; padding:30px 20px 60px; }
        .card {
            background:white; border-radius:12px; padding:32px;
            box-shadow:0 4px 20px rgba(0,0,0,0.06); margin-bottom:24px;
        }
        .guide-row {
            display:flex; justify-content:space-between; align-items:flex-start; gap:16px;
            padding:14px 0; border-bottom:1px solid #f3f4f6;
        }
        .guide-row:last-child { border-bottom:none; }
        .guide-row strong { color:#1a2744; }
        .guide-row p { color:#6b7280; font-size:13.5px; margin-top:2px; }
        .guide-price { flex-shrink:0; color:#9ca3af; font-weight:700; text-decoration:line-through; }
        .included-sub { color:#6b7280; font-size:13.5px; margin-bottom:14px; }
        .also-included { margin-top:18px; padding-top:16px; border-top:1px solid #f3f4f6; }
        .also-included-label { font-weight:700; color:#1a2744; font-size:14px; margin-bottom:10px; }
        .also-list { list-style:none; display:flex; flex-wrap:wrap; gap:8px; }
        .also-list li { background:#f0f4ff; color:#1a2744; font-size:13px; padding:5px 12px; border-radius:14px; }
        .paywall-card { background:linear-gradient(135deg,#1a2744 0%,#2d3f6b 100%); color:white; text-align:center; }
        .paywall-card h2 { font-size:1.3em; margin-bottom:8px; }
        .paywall-card p { color:#c7d2fe; margin-bottom:20px; font-size:14px; }
        .price { font-size:2.2em; font-weight:800; margin-bottom:4px; }
        .price span { font-size:0.4em; font-weight:600; color:#c7d2fe; }
        .savings { color:#86efac; font-weight:700; font-size:14px; margin-bottom:20px; }
        label { display:block; font-weight:600; font-size:14px; margin-bottom:6px; text-align:left; }
        input[type="email"] {
            width:100%; padding:11px 14px; border:1px solid rgba(255,255,255,0.2); border-radius:8px;
            font-size:15px; margin-bottom:14px; background:rgba(255,255,255,0.1); color:white;
        }
        input::placeholder { color:#9ca3af; }
        .btn {
            display:inline-block; background:#ff6b4a; color:white; border:none;
            padding:13px 28px; border-radius:8px; font-weight:700; font-size:15px;
            cursor:pointer; width:100%;
        }
        .btn:disabled { opacity:0.6; cursor:default; }
        .alert { padding:12px 16px; border-radius:8px; font-size:14px; margin-bottom:14px; display:none; }
        .alert-error { background:#fee2e2; color:#991b1b; }
        footer { text-align:center; padding:30px 20px; color:#9ca3af; font-size:13px; }
        footer a { color:#667eea; text-decoration:none; }
    </style>
</head>
<body>
    <header>
        <div class="container"><a href="index.html">✈️ TravelSmarter</a></div>
    </header>

    <div class="hero">
        <h1>${countryName} Guide Bundle</h1>
        <p>Every TravelSmarter PDF guide for ${countryName} — restaurants, attractions, and more — for one flat price.</p>
    </div>

    <div class="container">
        <div class="card">
            <h2 style="font-size:1.15em; color:#1a2744; margin-bottom:4px;">What's included (${guides.length} guide${guides.length !== 1 ? 's' : ''})</h2>
            <p class="included-sub">All ${guides.length} guide${guides.length !== 1 ? 's are' : ' is'} in the bundle${rest.length ? ' — highlights first, the rest listed below' : ''}.</p>
${guideListHtml}${alsoIncludedHtml}
        </div>

        <div class="card paywall-card">
            <h2>Get the whole bundle</h2>
            <p>Includes every guide above — plus any new ${countryName} guide added later, automatically.</p>
            <div class="price">$${bundleUSD} <span>one-time</span></div>
            ${savings > 0 ? `<div class="savings">You save $${savings} vs. buying separately</div>` : ''}

            <div id="checkout-alert" class="alert alert-error"></div>
            <label for="email">Email address</label>
            <input type="email" id="email" placeholder="you@example.com" required>
            <button class="btn" id="checkout-btn" onclick="startCheckout()">Get the Bundle — $${bundleUSD}</button>
        </div>
    </div>

    <footer>
        Part of <a href="sales-page.html">TravelSmarter</a> — 87 verified travel hacks, price alerts, and more.
    </footer>

    <script>
        let API_URL;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            API_URL = 'http://localhost:5000';
        } else {
            API_URL = 'https://api.travelsmarterapp.com';
        }

        async function startCheckout() {
            const email = document.getElementById('email').value.trim();
            const alertEl = document.getElementById('checkout-alert');
            alertEl.style.display = 'none';

            if (!email || !email.includes('@')) {
                alertEl.textContent = 'Please enter a valid email address.';
                alertEl.style.display = 'block';
                return;
            }

            const btn = document.getElementById('checkout-btn');
            btn.disabled = true;
            btn.textContent = 'Redirecting to checkout...';

            try {
                const res = await fetch(\`\${API_URL}/api/guides/checkout-bundle\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countrySlug: '${countrySlug}',
                        email,
                        sourcePage: window.location.pathname,
                    }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Something went wrong');

                gtag('event', 'begin_checkout', { tool: 'guide_bundle_${countrySlug.replace(/-/g, '_')}' });
                window.location.href = data.url;
            } catch (err) {
                alertEl.textContent = err.message;
                alertEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Get the Bundle — $${bundleUSD}';
            }
        }
    </script>
</body>
</html>
`;
}

module.exports = { renderGuidePage, renderBundlePage };
