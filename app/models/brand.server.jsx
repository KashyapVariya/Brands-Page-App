import db from "../db.server";
import { authenticate } from "../shopify.server";
import { createFileInShopify, deleteFileFromShopify } from "../routes/api.upload-image";

export async function getBrandById(brandId, shop) {
  if (!shop) {
    throw new Error("Shop not found in session.");
  }

  return db.brands.findFirst({
    where: { id: brandId, shop },
  });
}

export async function getBrands(shop) {
  if (!shop) {
    throw new Error("Shop not found in session.");
  }

  const brands = await db.brands.findMany({
    where: {
      shop
    },
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      shop: true,
      title: true,
      origin: true,
      availability: true,
      status: true,
      image: true,
      url: true,
    },
  });

  return brands;
}

export async function getBrandsCollection(shop) {
  if (!shop) {
    throw new Error("Shop not found in session.");
  }

  return db.brands.findMany({
    where: {
      shop,
      status: { in: ["Approved", "Featured"] },
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      origin: true,
      availability: true,
      status: true,
      image: true,
      url: true,
    },
  });
}

export async function syncShopifyCollections(request) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  if (!shop) throw new Error("Shop not found in session.");

  const settings = await getSettingsArray(shop);
  const allNewBrands = [];

  const fetchCollectionsByType = async (type) => {
    const res = await admin.graphql(`
      query {
        collections(first: 250, query:"collection_type:${type}") {
          nodes {
            id
            handle
            title
            updatedAt
            descriptionHtml
            sortOrder
            templateSuffix
            image {
              src
            }
          }
        }
      }
    `);
    const data = await res.json();
    return data.data.collections.nodes.map((col) => ({
      collectionId: col.id,
      title: col.title,
      url: `/collections/${col.handle}`,
      origin: type === "smart" ? "SmartCollection" : "CustomCollection",
    }));
  };

  if (settings.automation.dataSources.customCollections) {
    const custom = await fetchCollectionsByType("custom");
    allNewBrands.push(...custom);
  }

  if (settings.automation.dataSources.smartCollections) {
    const smart = await fetchCollectionsByType("smart");
    allNewBrands.push(...smart);
  }

  if (settings.automation.dataSources.productVendors) {
    const productRes = await admin.graphql(`
      query {
        products(first: 250) {
          nodes {
            vendor
          }
        }
      }
    `);
    const productsData = await productRes.json();
    const vendors = Array.from(new Set(productsData.data.products.nodes.map(p => p.vendor)));

    allNewBrands.push(
      ...vendors.map((vendor) => ({
        collectionId: null,
        title: vendor,
        url: `/collections/vendors?q=${encodeURIComponent(vendor)}`,
        origin: "Vendor",
      }))
    );
  }

  // Delete records for disabled sources
  const deleteConditions = [];
  if (!settings.automation.dataSources.customCollections) deleteConditions.push("CustomCollection");
  if (!settings.automation.dataSources.smartCollections) deleteConditions.push("SmartCollection");
  if (!settings.automation.dataSources.productVendors) deleteConditions.push("Vendor");

  if (deleteConditions.length > 0) {
    const deleted = await db.brands.deleteMany({
      where: {
        shop,
        origin: { in: deleteConditions },
      },
    });
    console.log(`Deleted ${deleted.count} brands from disabled sources:`, deleteConditions);
  }

  // Fetch existing brands
  const existingBrands = await db.brands.findMany({ where: { shop } });

  const existingMap = new Map();
  for (const brand of existingBrands) {
    const key = brand.collectionId || `${brand.origin}:${brand.title}`;
    existingMap.set(key, true);
  }

  for (const brand of allNewBrands) {
    const key = brand.collectionId || `${brand.origin}:${brand.title}`;
    if (existingMap.has(key)) {
      continue;
    }

    await db.brands.create({
      data: {
        shop,
        collectionId: brand.collectionId,
        title: brand.title,
        url: brand.url,
        origin: brand.origin,
        status: settings.automation.defaultStatus === "approved" ? "Approved" : "Draft",
        availability: "Available",
      },
    });
  }

  console.log(`Sync complete. Total brands synced: ${allNewBrands.length}`);
  return { success: true, count: allNewBrands.length };
}

export function validateBrand(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.origin) {
    errors.origin = "Origin is required";
  }

  if (!data.availability) {
    errors.availability = "Availability is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}

export async function getSeoUrlHandle(shop) {
  if (!shop) {
    throw new Error("Shop not found in session.");
  }

  const result = await db.brandSettings.findUnique({
    where: { shop },
    select: { seoUrlHandle: true },
  });

  return result?.seoUrlHandle || null;
}

export async function getSettings(shop) {
  if (!shop) {
    throw new Error("Shop not found in session.");
  }

  const settings = await db.brandSettings.findUnique({ where: { shop } });
  return settings;
}

export async function getSettingsArray(shop) {
  if (!shop) {
    throw new Error("Shop not found in session.");
  }

  const settings = await db.brandSettings.findUnique({ where: { shop } });

  const array = {
    layout: {
      pageLayout: settings?.pageLayout ?? "horizontal",
      colourScheme: settings?.colourScheme ?? "light",
      featuredCarousel: settings?.featuredCarousel == 'visible' ? true : false,
      scrollPage: settings?.scrollPage == 'visible' ? true : false,
      disabledLetters: settings?.disabledLetters == 'visible' ? true : false,
      letterSpace: settings?.letterSpace ?? "horizontalScroll",
      searchBar: settings?.searchBar == 'visible' ? true : false,
      scrollTop: settings?.scrollTop == 'visible' ? true : false,
    },
    automation: {
      dataSources: {
        productVendors: settings?.productVendors ?? true,
        smartCollections: settings?.smartCollections ?? true,
        customCollections: settings?.customCollections ?? true,
      },
      defaultStatus: settings?.defaultStatus ?? "approved",
    },
    seo: {
      pageSeo: {
        pageTitle: settings?.pageTitle ?? "Brands",
        seoUrlHandle: settings?.seoUrlHandle ?? "brands",
      },
      searchPage: {
        searchPlaceholder: settings?.searchPlaceholder ?? "Search brands...",
        noResultsTitle: settings?.noResultsTitle ?? "No results found",
        noResultsDescription: settings?.noResultsDescription ?? "Try adjusting your search or filter.",
      },
    },
    design: {
      customCSS: settings?.customCSS ?? "",
      offsetClass: settings?.offsetClass ?? ""
    }
  };

  return array;
}

export async function createBrandWithImage(data, admin) {
  const brandData = { ...data };

  if (data.image) {
    const uploaded = await createFileInShopify(data.image, data.title, admin);
    brandData.image = uploaded.url;
    brandData.imageId = uploaded.id;
  }

  return db.brands.create({ data: brandData });
}

export async function updateBrandWithImage(id, data, admin, shop) {
  const existing = await getBrandById(id, shop);
  const brandData = { ...data };

  if (data.image) {
    if (existing?.imageId) {
      try {
        await deleteFileFromShopify(existing.imageId, admin);
      } catch (e) {
        console.warn("Failed to delete old image from Shopify", e);
      }
    }

    const uploaded = await createFileInShopify(data.image, data.title, admin);
    brandData.image = uploaded.url;
    brandData.imageId = uploaded.id;
  }

  return db.brands.update({ where: { id }, data: brandData });
}

export async function deleteBrandWithImage(id, admin, shop) {
  const existing = await getBrandById(id, shop);

  if (existing?.imageId) {
    try {
      await deleteFileFromShopify(existing.imageId, admin);
    } catch (e) {
      console.warn("Failed to delete image from Shopify", e);
    }
  }

  return db.brands.delete({ where: { id } });
}

export async function deleteBrandImageOnly(id, admin, shop) {
  const brand = await getBrandById(id, shop);

  if (!brand?.imageId) return;

  await deleteFileFromShopify(brand.imageId, admin);

  return db.brands.update({
    where: { id },
    data: { image: null, imageId: null },
  });
}

export async function bulkDeleteBrands(brandIds, shop) {
  const brands = await db.brands.findMany({
    where: {
      id: { in: brandIds },
      shop,
    },
    select: {
      id: true,
      image: true,
    },
  });

  for (const brand of brands) {
    if (brand.image && brand.image.startsWith("gid://shopify/")) {
      try {
        await deleteFileFromShopify(brand.image, shop);
      } catch (err) {
        console.error(`Error deleting Shopify file for brand ${brand.id}:`, err);
      }
    }
  }

  return db.brands.deleteMany({
    where: {
      id: { in: brandIds },
      shop,
    },
  });
}

export async function bulkUpdateBrandStatus(brandIds, shop, status) {
  return db.brands.updateMany({
    where: {
      id: { in: brandIds },
      shop,
    },
    data: {
      status,
    },
  });
}
