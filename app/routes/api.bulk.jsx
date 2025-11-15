import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  bulkDeleteBrands,
  bulkUpdateBrandStatus,
} from "../models/brand.server";
import { createOrUpdateBrandPage } from "../models/page-utils.server";

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const { ids, action } = await request.json();

  if (!Array.isArray(ids) || !action) {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  switch (action) {
    case "approve":
      await bulkUpdateBrandStatus(ids, shop, "Approved");
      break;
    case "feature":
      await bulkUpdateBrandStatus(ids, shop, "Featured");
      break;
    case "draft":
      await bulkUpdateBrandStatus(ids, shop, "Draft");
      break;
    case "delete":
      await bulkDeleteBrands(ids, shop);
      break;
    default:
      return json({ error: "Unknown action" }, { status: 400 });
  }

  await createOrUpdateBrandPage({ session, admin, action: "update" });
  return json({ success: true });
};
