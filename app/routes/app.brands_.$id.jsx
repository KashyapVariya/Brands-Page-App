import { useState } from 'react';
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  Form,
  useFetcher,
  useNavigation
} from "@remix-run/react";
import {
  TextField,
  Select,
  Card,
  Layout,
  Page,
  BlockStack,
  PageActions,
  InlineStack,
  Badge, Box, Button,
  FormLayout,
  DropZone,
  Spinner,
  Thumbnail
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import {
  createBrandWithImage,
  updateBrandWithImage,
  deleteBrandWithImage,
  deleteBrandImageOnly,
  validateBrand,
  getBrandById
} from "../models/brand.server";
import { createOrUpdateBrandPage } from "../models/page-utils.server";
import { getStatusTone } from "./status";

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (params.id === "new") {
    return json({ brand: {} });
  }

  const brand = await getBrandById(Number(params.id), shop);
  if (!brand) {
    return redirect("/app");
  }

  return json({ brand });
}

export async function action({ request, params }) {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const brandId = Number(params.id);
  const isEditMode = params.id !== "new";
  const existingBrand = isEditMode ? await getBrandById(brandId, shop) : null;

  if (data.action === "delete-image") {
    if (!existingBrand?.imageId) {
      return json({ success: false, message: "No image to delete" }, { status: 400 });
    }

    try {
      await deleteBrandImageOnly(brandId, admin, shop);
      await createOrUpdateBrandPage({ session, admin, action: "update" });
      return json({ success: true });
    } catch (e) {
      console.error("Failed to delete image from Shopify", e);
      return json({ error: "Error deleting image from Shopify" }, { status: 500 });
    }
  }

  if (data.action === "delete") {
    await deleteBrandWithImage(brandId, admin, shop);
    await createOrUpdateBrandPage({ session, admin, action: "update" });
    return redirect("/app");
  }

  const errors = validateBrand(data);
  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const brandData = {
    shop,
    title: data.title,
    url: data.url,
    status: data.status,
    availability: data.availability,
    origin: data.origin,
    image: data.image || null,
  };

  let brand;
  if (!isEditMode) {
    brand = await createBrandWithImage(brandData, admin);
  } else {
    brand = await updateBrandWithImage(brandId, brandData, admin, shop);
  }

  await createOrUpdateBrandPage({ session, admin, action: "update" });
  return redirect(`/app/brands/${brand.id}`);
}

export default function BrandForm() {
  const errors = useActionData()?.errors || {};
  const { brand } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const statusOptions = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Featured', value: 'Featured' },
  ];
  const [title, setTitle] = useState(brand?.title || "");
  const [url, setUrl] = useState(brand?.url || "");
  const [status, setStatus] = useState(brand?.status || "Approved");
  const [availability] = useState(brand?.availability || "Available");
  const [origin] = useState(brand?.origin || "Custom");
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(brand?.image || "");
  const [uploading, setUploading] = useState(false);

  const handleDropZoneDrop = async (_dropFiles, acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];

    if (!validImageTypes.includes(uploadedFile.type)) {
      window.shopify?.toast?.show?.("Only PNG, JPEG, or GIF images are allowed.", { isError: true });
      return;
    }

    if (uploadedFile) {
      setFile(uploadedFile);
      const formData = new FormData();
      formData.append("file", uploadedFile);
      setUploading(true);
      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        if (res.ok && result?.imageUrl) {
          setImageUrl(result.imageUrl);
        } else {
          console.error("Error uploading image:", result.error);
        }
      } catch (err) {
        console.error("Unexpected error uploading image:", err);
      }
      finally {
        setUploading(false);
      }
    }
  };

  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

  return (
    <Form method="post" encType="multipart/form-data">
      <input type="hidden" name="origin" value={origin} />
      <input type="hidden" name="availability" value={availability} />
      <input type="hidden" name="image" value={imageUrl} />
      <Page
        backAction={{ url: '/app' }}
        title={brand?.id ? "Edit" : "Add brand"}
        titleMetadata={
          brand?.id && (
            <InlineStack gap="200">
              <Badge size="small" >{brand?.origin == "CustomCollection" || brand?.origin == "SmartCollection" ? "Collection" : brand?.origin}</Badge>
              <Badge size="small" >{brand?.availability}</Badge>
              <Badge size="small" tone={getStatusTone(brand?.status)}>{brand?.status}</Badge>
            </InlineStack>
          )
        }
        primaryAction={{
          content: "Save",
          submit: true,
          loading: navigation.state === "submitting",
        }}
        secondaryActions={[
          ...(origin === "Custom" && brand?.id
            ? [
              {
                destructive: true,
                icon: DeleteIcon,
                onAction: () => {
                  fetcher.submit(
                    { action: "delete" },
                    {
                      method: "post",
                      action: `/app/brands/${brand?.id}`,
                    }
                  );
                },
              },
            ]
            : []),
        ]}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <Card padding="400">
                <FormLayout>
                  <TextField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    error={errors.title}
                    autoComplete="off"
                  />
                  <TextField
                    label="URL"
                    name="url"
                    value={url}
                    onChange={setUrl}
                    error={errors.url}
                    autoComplete="off"
                  />
                  <Select
                    label="Status"
                    name="status"
                    options={statusOptions}
                    onChange={setStatus}
                    value={status}
                  />
                </FormLayout>
              </Card>
              <Card padding="400">
                <FormLayout>
                  <InlineStack align="start" gap="400" wrap={false}>
                    {imageUrl && (
                      <BlockStack align="center" gap="200">
                        <Thumbnail
                          size="large"
                          alt="Uploaded image"
                          source={imageUrl}
                        />
                        <Button
                          onClick={() => {
                            const form = new FormData();
                            form.append("action", "delete-image");

                            fetcher.submit(form, {
                              method: "post",
                              action: `/app/brands/${brand?.id}`,
                            });

                            setFile(null);
                            setImageUrl("");
                          }}
                          size="slim"
                          tone="critical"
                        >
                          Remove
                        </Button>
                      </BlockStack>
                    )}
                    <Box minWidth="200px" width="100%">
                      <DropZone
                        allowMultiple={false}
                        onDrop={handleDropZoneDrop}
                        type="image"
                        disabled={uploading}
                      >
                        <DropZone.FileUpload actionTitle={uploading ? (
                          <Spinner accessibilityLabel="Uploading image" size="large" />
                        ) : (
                          imageUrl ? "Change image" : "Add image"
                        )}
                        />
                        {/* <DropZone.FileUpload actionTitle={imageUrl.length > 0 ? "Change image" : "Add image"} /> */}
                      </DropZone>
                    </Box>
                  </InlineStack>
                </FormLayout>
              </Card>
            </BlockStack>
            <PageActions
              secondaryActions={[
                {
                  content: "Cancel",
                  onAction: () => navigate("/app"),
                },
              ]}
              primaryAction={{
                content: "Save",
                submit: true,
                loading: navigation.state === "submitting",
              }}
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Form>
  );
}
