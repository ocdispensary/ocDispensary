import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { writeFile } from "fs/promises";

const URL      = "https://dutchie.com/embedded-menu/oc-dispensary";
const OUT_FILE = "top_sellers.json";

puppeteer.use(StealthPlugin());

// extra flags only inside GitHub Actions
const isCI  = process.env.CI === "true";
const flags = ["--no-sandbox", "--disable-setuid-sandbox"];
if (isCI) {
  flags.push(
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--single-process",
    "--no-zygote"
  );
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: flags,
    defaultViewport: { width: 1280, height: 1600 },
    timeout: 0
  });

  const page = await browser.newPage();

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.readyState === "complete");

    /* -------- auto‑scroll until the “Top Sellers” heading is in view -------- */
    await page.evaluate(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      let lastScroll = -1;

      for (let i = 0; i < 40; i++) {
        const h2 = [...document.querySelectorAll("h2")]
          .find((n) => n.textContent.trim() === "Top Sellers");
        if (h2) {
          h2.scrollIntoView({ block: "center" });
          return;
        }
        window.scrollBy(0, window.innerHeight * 0.9);
        await delay(400);
        if (window.scrollY === lastScroll) break; // reached bottom
        lastScroll = window.scrollY;
      }
    });

    /* ---- wait for both heading *and* its slider to be present (max 90 s) --- */
    await page.waitForFunction(() => {
      const h = [...document.querySelectorAll("h2")]
        .find((n) => n.textContent.trim() === "Top Sellers");
      return h && document.querySelector(`[aria-labelledby="${h.id}"]`);
    }, { timeout: 90_000 });

    /* ---------------------------- scrape products -------------------------- */
    const products = await page.evaluate(() => {
      const heading = [...document.querySelectorAll("h2")]
        .find((n) => n.textContent.trim() === "Top Sellers");
      if (!heading) return [];

      const slider = document.querySelector(
        `[aria-labelledby="${heading.id}"]`
      );
      if (!slider) return [];

      return [...slider.querySelectorAll(
        'div[role="group"][aria-roledescription="slide"]'
      )].map((slide) => {
        const anchor  = slide.querySelector("a");
        const brandEl = slide.querySelector("[class*='Brand']");
        const priceEl = slide.querySelector("[class*='ActivePrice']");
        const imgEl   = slide.querySelector("img");

        /* ---------- build OC Dispensary deep‑link ------------------------- */
        let ocLink = "";
        if (anchor) {
          const href  = anchor.getAttribute("href") || "";
          const match = href.match(/\/product\/([^/?#]+)/);
          if (match) {
            const slug = encodeURIComponent(match[1]);
            ocLink = `https://ocdispensary.github.io/oc-dispensary/menu?dtche%5Bproduct%5D=${slug}`;
          }
        }

        return {
          name : slide.getAttribute("aria-label")?.trim() || "",
          img  : imgEl?.src || "",
          // --- remove a trailing ellipsis (“…”) if present ---
          brand: brandEl
            ? brandEl.textContent.replace(/\u2026$/, "").trim()
            : "",
          link : ocLink,
          price: priceEl?.textContent.trim() || ""
        };
      });
    });

    await writeFile(OUT_FILE, JSON.stringify(products, null, 2), "utf8");
    console.log(`✅  Saved ${products.length} products to ${OUT_FILE}`);
  } catch (err) {
    console.error("❌  An error occurred:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
