import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "File is missing or invalid" }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type;

    const graphqlResponse = await admin.graphql(
      `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: [
            {
              filename: fileName,
              mimeType: fileType,
              httpMethod: "POST",
              resource: "IMAGE",
            },
          ],
        },
      }
    );

    const jsonResponse = await graphqlResponse.json();
    const stagedTarget = jsonResponse?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!stagedTarget) {
      return json(
        {
          error: "Failed to create staged upload",
          details: jsonResponse?.data?.stagedUploadsCreate?.userErrors,
        },
        { status: 400 }
      );
    }

    const uploadFormData = new FormData();
    stagedTarget.parameters.forEach((param) => {
      uploadFormData.append(param.name, param.value);
    });
    uploadFormData.append("file", file);

    const uploadResponse = await fetch(stagedTarget.url, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      return json({ error: "Upload to Shopify failed", details: text }, { status: 500 });
    }

    return json({
      imageUrl: stagedTarget.resourceUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: error.message }, { status: 500 });
  }
}

// Create the file in Shopify Files using fileCreate mutation
export async function createFileInShopify(resourceUrl, fileName, admin) {
  const fileCreateMutation = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          createdAt
          alt
           ... on MediaImage {
            id
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const fileCreateVariables = {
    files: [
      {
        originalSource: resourceUrl,
        alt: fileName,
        contentType: "IMAGE",
      },
    ],
  };

  const fileCreateResponse = await admin.graphql(fileCreateMutation, {
    variables: fileCreateVariables,
  });

  const fileCreateJson = await fileCreateResponse.json();
  const userErrors = fileCreateJson?.data?.fileCreate?.userErrors;
  if (userErrors?.length) {
    console.error("Shopify fileCreate userErrors:", userErrors);
    throw new Error(`Failed to create file in Shopify: ${userErrors.map(e => e.message).join(", ")}`);
  }

  const file = fileCreateJson?.data?.fileCreate?.files?.[0];
  const publicImageUrl = await getFileUrlById(file.id, admin);

  return {
    id: file.id,
    url: publicImageUrl
  };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getFileUrlById(fileId, admin, retries = 5, delayMs = 1000) {
  const query = `
    query getFileUrl($id: ID!) {
      node(id: $id) {
        id
        ... on MediaImage {
          image {
            url
          }
        }
      }
    }
  `;

  const variables = { id: fileId };

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await admin.graphql(query, { variables });
    const result = await response.json();
    const node = result?.data?.node;
    const imageUrl = node?.image?.url;
    if (imageUrl) return imageUrl;

    console.warn(`Attempt ${attempt}: image URL not ready. Retrying in ${delayMs}ms...`);
    await wait(delayMs);
  }

  throw new Error("Image URL not found after multiple retries.");
}

// Delete a file in Shopify Files using fileDelete mutation
export async function deleteFileFromShopify(fileId, admin) {
  const mutation = `
    mutation fileDelete($fileIds: [ID!]!) {
      fileDelete(fileIds: $fileIds) {
        deletedFileIds
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    fileIds: [fileId],
  };

  const response = await admin.graphql(mutation, { variables });
  const result = await response.json();
  const errors = result?.data?.fileDelete?.userErrors;
  if (errors?.length) {
    throw new Error(`Failed to delete file: ${errors.map(e => e.message).join(", ")}`);
  }

  const deletedIds = result?.data?.fileDelete?.deletedFileIds;
  if (!deletedIds?.includes(fileId)) {
    throw new Error("File deletion failed or file ID not found in deleted list.");
  }

  return { success: true, deletedFileId: fileId };
}

// Update a file in Shopify Files using fileUpdate mutation
export async function updateFileInShopify(fileId, newAltText, admin) {
  const mutation = `
    mutation fileUpdate($files: [FileUpdateInput!]!) {
      fileUpdate(files: $files) {
        files {
          id
          alt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    files: [
      {
        id: fileId,
        alt: newAltText,
      },
    ],
  };

  const response = await admin.graphql(mutation, { variables });
  const result = await response.json();
  const errors = result?.data?.fileUpdate?.userErrors;
  if (errors?.length) {
    throw new Error(`Failed to update file: ${errors.map(e => e.message).join(", ")}`);
  }

  const updatedFile = result?.data?.fileUpdate?.files?.[0];

  return {
    success: true,
    updatedFile,
  };
}
