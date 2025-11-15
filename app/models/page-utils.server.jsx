import fs from "fs";
import path from "path";
import ReactDOMServer from "react-dom/server";
import { json } from "@remix-run/node";
import BrandIndex from "../components/BrandIndex";
import { getBrandsCollection, getSettingsArray } from "./brand.server";

// Load CSS once
const css = fs.readFileSync(path.resolve("app/components/BrandIndex.css"), "utf8");

const SCROLL_TOP_SCRIPT = `
  const div = document.createElement('div');
  div.innerHTML = \`
    <div id="scroll-to-top" onclick="window.scroll({behavior: 'smooth', left: 0, top: 0})" style="display: none;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16 15a1 1 0 0 1-.707-.293L12 11.414l-3.293 3.293a1 1 0 1 1-1.414-1.414l4-4a1 1 0 0 1 1.414 0l4 4A1 1 0 0 1 16 15z" style="fill:#757575"/>
      </svg>
    </div>\`;
  document.body.appendChild(div);
  window.addEventListener("scroll", () => {
    document.getElementById('scroll-to-top').style.display = window.scrollY > 250 ? "block" : "none";
  });
`;

const embeddedScript = (settings) => `
  <script type="text/javascript">
    (function () {
      const smb = new function () {
        const self = this;

        this.onCarouselScroll = function () {
          const el = document.getElementById('brands-carousel');
          if (!el) return;
          const atLeft = el.scrollLeft < 1;
          const atRight = Math.abs(el.scrollWidth - el.scrollLeft - el.clientWidth) < 1;
          document.getElementById("carousel-nav-left")?.classList.toggle("active", !atLeft);
          document.getElementById("carousel-nav-right")?.classList.toggle("active", !atRight);
        };

        this.scrollCarousel = function (el, dir) {
          if (!el.classList.contains('active')) return;
          const container = document.getElementById('brands-carousel');
          if (!container) return;
          const curr = container.scrollLeft;
          const step = container.getElementsByClassName('carousel-link')[1]?.offsetLeft || 200;
          const moveTo = (Math.round(curr / step) + (dir === "right" ? 1 : -1)) * step;
          container.scrollTo({ left: moveTo, behavior: "smooth" });
          self.onCarouselScroll();
          container.addEventListener("scroll", self.onCarouselScroll, { once: true });
        };

        this.cancelSearch = function () {
          const searchBar = document.getElementById("brand-search");
          if (searchBar) {
            searchBar.value = "";
            searchBar.dispatchEvent(new Event("input"));
          }
        };

        this.scrollTo = function (el) {
          if (!el) return;

          let top = el.getBoundingClientRect().top + window.scrollY;

          if(${!!settings?.design?.offsetClass}){
            const selectors = ('${settings?.design?.offsetClass}' || '').split(',').map(s => s.trim());

            const offset = selectors.reduce((sum, selector) => {
              const offsetEl = document.querySelector(selector);
              return sum + (offsetEl?.getBoundingClientRect().height || 0);
            }, 0);

            top = top - offset;
          }
          window.scroll({ top, left: 0, behavior: 'smooth' });
        };

        this.shortcutClick = function (el) {
          const term = el.getAttribute('to-term');
          const target = document.getElementById("term-" + term);
          if (target) self.scrollTo(target);
        };

        this.split = function (str, q) {
          if (!q.length) return ["inline-block", str];
          const normStr = str.toLowerCase();
          const normQ = q.toLowerCase();
          const parts = normStr.split(normQ);
          if (parts.length === 1) return ["none", str];

          let result = str.slice(0, parts[0].length);
          let pos = result.length;
          for (let i = 0; i < parts.length - 1; i++) {
            result += '<b>' + str.slice(pos, pos + q.length) + '</b>' + str.slice(pos + q.length, pos + q.length + parts[i + 1].length);
            pos += q.length + parts[i + 1].length;
          }
          return ["inline-block", result];
        };

        this.searchFilter = function (e) {
          const query = e.target.value.toLowerCase();
          const wrapper = document.getElementById("search-wrapper");
          query ? wrapper?.setAttribute("active", "true") : wrapper?.removeAttribute("active");

          let totalCount = 0;
          Array.from(document.getElementsByClassName("brand-section")).forEach(section => {
            const brands = Array.from(section.getElementsByClassName("brand"));
            let count = 0;
            brands.forEach(brand => {
              const text = brand.getAttribute("title") || "";
              const [display, content] = self.split(text, query);
              brand.style.display = display;
              brand.innerHTML = content;
              if (display !== "none") count++;
            });
            totalCount += count;
            section.style.display = count ? "block" : "none";

            const shortcut = document.getElementById("shortcut-" + section.getAttribute("term"));
            if (shortcut) {
              shortcut.style.color = count ? "" : "#ccc";
              shortcut.toggleAttribute("disabled", count === 0);
            }
          });

          document.getElementById("no-results").style.display = totalCount ? "none" : "block";
        };

        this.init = function () {
          document.getElementById("brand-search")?.addEventListener("input", self.searchFilter);
          document.querySelectorAll(".shortcut-letter").forEach(shortcut => {
            shortcut.addEventListener("click", () => self.shortcutClick(shortcut));
          });

          document.getElementById("carousel-nav-left")?.addEventListener("click", e => self.scrollCarousel(e.currentTarget, "left"));
          document.getElementById("carousel-nav-right")?.addEventListener("click", e => self.scrollCarousel(e.currentTarget, "right"));
          document.getElementById("brands-carousel")?.addEventListener("scroll", self.onCarouselScroll);
          self.onCarouselScroll();
          
          ${!!settings?.layout?.scrollTop ? SCROLL_TOP_SCRIPT : ""}
        };
      };
      document.addEventListener("DOMContentLoaded", smb.init);
    })();
  </script>
`;

function renderHtml({ brands, settings }) {
  const componentHtml = ReactDOMServer.renderToString(
    <BrandIndex brands={brands} settings={settings} />
  );

  return `
    <style>
      ${css}
      ${settings?.design?.customCSS}
    </style>
    <div id="brand-index">${componentHtml}</div>
    ${embeddedScript(settings)}
  `;
}

// GraphQL strings (modularized for readability)
const CHECK_PAGES_QUERY = `#graphql
  query CheckPages($first: Int!) {
    pages(first: $first) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`;

const CREATE_PAGE_MUTATION = `#graphql
  mutation CreatePage($input: PageCreateInput!) {
    pageCreate(page: $input) {
      page {
        id
        title
        handle
      }
      userErrors {
        message
      }
    }
  }
`;

const UPDATE_PAGE_MUTATION = `#graphql
  mutation UpdatePage($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) {
      page {
        id
        title
        handle
      }
      userErrors {
        message
      }
    }
  }
`;

const DELETE_PAGE_MUTATION = `#graphql
  mutation DeletePage($id: ID!) {
    pageDelete(id: $id) {
      deletedPageId
      userErrors {
        message
      }
    }
  }
`;

export async function createOrUpdateBrandPage({ session, admin, action = "create" }) {
  const shop = session.shop;
  const settings = await getSettingsArray(shop);
  if (!settings || !settings.layout) return json({ success: false, error: "Missing settings." });

  const brands = await getBrandsCollection(shop);
  const bodyHtml = renderHtml({ brands, settings });
  const pageTitle = settings?.seo?.pageSeo?.pageTitle || "Brands";
  const pageHandle = settings?.seo?.pageSeo?.seoUrlHandle || "brands";

  const checkRes = await admin.graphql(CHECK_PAGES_QUERY, { variables: { first: 100 } });
  const existing = (await checkRes.json())?.data?.pages?.edges?.find(
    ({ node }) => node.handle === pageHandle
  );

  if (action === "create") {
    if (existing) return json({ success: false, error: "Page already exists." });
    const res = await admin.graphql(CREATE_PAGE_MUTATION, {
      variables: {
        input: { title: pageTitle, handle: pageHandle, body: bodyHtml, isPublished: true },
      },
    });
    const result = await res.json();
    const errors = result?.data?.pageCreate?.userErrors;
    return errors?.length ? json({ success: false, errors }) : json({ success: true, page: result?.data?.pageCreate?.page });
  }

  if (action === "update") {
    if (!existing) return json({ success: false, error: "Page not found." });
    const res = await admin.graphql(UPDATE_PAGE_MUTATION, {
      variables: { id: existing.node.id, page: { title: pageTitle, body: bodyHtml } },
    });
    const result = await res.json();
    const errors = result?.data?.pageUpdate?.userErrors;
    return errors?.length ? json({ success: false, errors }) : json({ success: true, page: result?.data?.pageUpdate?.page });
  }

  return json({ success: false, error: "Invalid action." });
}

export async function deleteBrandPage({ session, admin }) {
  const shop = session.shop;
  const settings = await getSettingsArray(shop);
  const pageHandle = settings?.seo?.pageSeo?.seoUrlHandle;
  if (!pageHandle) return json({ success: false, error: "Page handle missing in settings." });

  const checkRes = await admin.graphql(CHECK_PAGES_QUERY, { variables: { first: 100 } });
  const pages = (await checkRes.json())?.data?.pages?.edges;
  const existing = pages?.find(({ node }) => node.handle === pageHandle);
  if (!existing) return json({ success: false, error: "Page not found." });

  const res = await admin.graphql(DELETE_PAGE_MUTATION, { variables: { id: existing.node.id } });
  const result = await res.json();
  const errors = result?.data?.pageDelete?.userErrors;
  return errors?.length
    ? json({ success: false, error: errors.map((e) => e.message).join(", ") })
    : json({ success: true, deletedPageId: result.data.pageDelete.deletedPageId });
}

export async function updateBrandPageHandle({ session, admin, newHandle }) {
  const shop = session.shop;
  const settings = await getSettingsArray(shop);
  const currentHandle = settings?.seo?.pageSeo?.seoUrlHandle;
  const pageTitle = settings?.seo?.pageSeo?.pageTitle || "Brands";

  if (!currentHandle) {
    return json({ success: false, error: "Current handle missing from settings." });
  }

  // Load existing pages to check if current one exists
  const checkRes = await admin.graphql(CHECK_PAGES_QUERY, { variables: { first: 100 } });
  const pages = (await checkRes.json())?.data?.pages?.edges;
  const existing = pages?.find(({ node }) => node.handle === currentHandle);

  if (existing) {
    // If found, update handle
    const updateRes = await admin.graphql(UPDATE_PAGE_MUTATION, {
      variables: {
        id: existing.node.id,
        page: { handle: newHandle },
      },
    });

    const updateResult = await updateRes.json();
    const errors = updateResult?.data?.pageUpdate?.userErrors;
    return errors?.length
      ? json({ success: false, errors })
      : json({ success: true, updatedPage: updateResult?.data?.pageUpdate?.page });
  }

  // If not found, create a new page
  const brands = await getBrandsCollection(shop);
  const bodyHtml = renderHtml({ brands, settings });

  const createRes = await admin.graphql(CREATE_PAGE_MUTATION, {
    variables: {
      input: {
        title: pageTitle,
        handle: newHandle,
        body: bodyHtml,
        isPublished: true,
      },
    },
  });

  const createResult = await createRes.json();
  const errors = createResult?.data?.pageCreate?.userErrors;
  return errors?.length
    ? json({ success: false, errors })
    : json({ success: true, createdPage: createResult?.data?.pageCreate?.page });
}
