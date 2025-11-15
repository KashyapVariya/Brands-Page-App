import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createOrUpdateBrandPage } from "../models/page-utils.server";

export async function action({ request }) {
  try {
    const formData = await request.formData();
    const actionType = formData.get("action");
    if (actionType !== "update") {
      return json({ success: false, error: "Invalid or missing action." }, { status: 400 });
    }

    const { admin, session } = await authenticate.admin(request);
    const pageData = await createOrUpdateBrandPage({ session, admin, action: "update" });

    return json({
      success: true,
      message: "Page created or updated successfully.",
      page: pageData,
    });
  } catch (error) {
    console.error("Error in /api/create-page:", error);
    return json(
      {
        success: false,
        message: "Failed to create or update the page.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
