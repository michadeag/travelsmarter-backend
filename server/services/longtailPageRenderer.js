// Renders the static HTML for one long-tail Q&A page. Pure content page —
// no interactive checker, no email/PDF gate (unlike the free tools and
// guides) — the point of this pipeline is keyword/answer-engine surface
// area and internal-linking value, not a lead-capture funnel of its own.
// Includes a country-switcher dropdown linking to sibling pages for the
// same template (same internal-linking pattern as guidePageRenderer.js's
// "siblings" cross-links), which helps both crawlability and genuine
// usefulness for a visitor who lands on the wrong country's page.

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

function renderLongtailPage(page, allCountriesForTemplate) {
  const { title, question, countryName, content, slug, templateKey } = page;
  const { answer, context, tip, faqs } = content;

  const faqHtml = faqs.map(f => `            <div class="faq-item">
                <h3>${f.q}</h3>
                <p>${f.a}</p>
            </div>`).join('\n');

  // allCountriesForTemplate entries carry the full page slug (e.g.
  // "nod-meaning-france"), not just the country slug — country slug alone
  // wouldn't resolve to a valid URL for this template.
  const countryOptions = allCountriesForTemplate.map(c =>
    `                    <option value="${c.pageSlug}"${c.countrySlug === page.countrySlug ? ' selected' : ''}>${c.name}</option>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | TravelSmarter</title>
    <meta name="description" content="${content.metaDescription}">
    <link rel="canonical" href="https://travelsmarterapp.com/${slug}.html">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${content.metaDescription}">
    <meta property="og:url" content="https://travelsmarterapp.com/${slug}.html">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${content.metaDescription}">

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
        .hero h1 { font-size:1.7em; color:#1a2744; margin-bottom:14px; }
        .hero .answer { color:#1a2744; font-size:1.15em; font-weight:600; max-width:620px; margin:0 auto; background:#f0f4ff; border-radius:10px; padding:16px 20px; }
        .container { max-width:760px; margin:0 auto; padding:30px 20px 60px; }
        .card {
            background:white; border-radius:12px; padding:32px;
            box-shadow:0 4px 20px rgba(0,0,0,0.06); margin-bottom:24px;
        }
        .card p { color:#4b5563; font-size:15px; margin-bottom:14px; }
        .card p:last-child { margin-bottom:0; }
        .tip-box { background:#fff7ed; border-left:4px solid #ff6b4a; padding:14px 18px; border-radius:6px; font-size:14px; color:#7c2d12; }
        label { display:block; font-weight:600; font-size:13px; margin-bottom:6px; color:#374151; }
        select { width:100%; padding:10px 14px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; }
        .content-block h2 { font-size:1.25em; color:#1a2744; margin-bottom:12px; }
        .faq-item { margin-bottom:18px; }
        .faq-item:last-child { margin-bottom:0; }
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
        <h1>${question}</h1>
        <div class="answer">${answer}</div>
    </div>

    <div class="container">
        <div class="card">
            <p>${context}</p>
            ${tip ? `<div class="tip-box">💡 ${tip}</div>` : ''}
        </div>

        <div class="card">
            <label for="country-switch">Ask about a different country</label>
            <select id="country-switch" onchange="if(this.value) window.location.href = this.value + '.html';">
                <option value="">— Choose a country —</option>
${countryOptions}
            </select>
        </div>

        <div class="card content-block">
            <h2>Frequently asked questions</h2>
${faqHtml}
        </div>
    </div>

    <footer>
        Part of <a href="sales-page.html">TravelSmarter</a> — 87 verified travel hacks, price alerts, and more.<br>
        <a href="free-travel-tools.html">See all free travel tools →</a>
    </footer>
</body>
</html>
`;
}

module.exports = { renderLongtailPage };
