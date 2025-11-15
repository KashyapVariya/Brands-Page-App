import {
  Page,
  Layout,
  Card,
  TextField,
  RadioButton,
  Checkbox,
  Button,
  BlockStack,
  FormLayout,
  ButtonGroup
} from '@shopify/polaris';
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { json } from '@remix-run/node';
import { useEffect, useState, useMemo } from 'react';
import AppLoading from '../components/Backend/AppLoading';
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { syncShopifyCollections, getSettings } from "../models/brand.server";
import { createOrUpdateBrandPage, updateBrandPageHandle } from "../models/page-utils.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  if (!session || !session.shop) {
    return redirect("/app");
  }
  const shop = session.shop;
  const settings = await getSettings(shop);

  return { settings, shop };
};

export default function SettingsPage() {
  const { settings, shop } = useLoaderData();
  const navigate = useNavigate();
  const SaveFetcher = useFetcher();
  const syncFetcher = useFetcher();
  const initialSettings = useMemo(() => ({
    pageLayout: settings?.pageLayout || 'horizontal',
    colourScheme: settings?.colourScheme || 'light',
    featuredCarousel: settings?.featuredCarousel || 'hidden',
    scrollPage: settings?.scrollPage || 'visible',
    disabledLetters: settings?.disabledLetters || 'hidden',
    letterSpace: settings?.letterSpace || 'horizontalScroll',
    searchBar: settings?.searchBar || 'visible',
    scrollTop: settings?.scrollTop || 'visible',
    productVendors: settings?.productVendors ?? true,
    smartCollections: settings?.smartCollections ?? true,
    customCollections: settings?.customCollections ?? true,
    defaultStatus: settings?.defaultStatus || 'approved',
    pageTitle: settings?.pageTitle || 'Brands',
    seoUrlHandle: settings?.seoUrlHandle || 'brands',
    searchPlaceholder: settings?.searchPlaceholder || 'Search brands',
    noResultsTitle: settings?.noResultsTitle || "Sorry, we couldn't find your search query.",
    noResultsDescription: settings?.noResultsDescription || 'You can check your spelling or use the A-Z bar above.',
    customCSS: settings?.customCSS || "",
    offsetClass: settings?.offsetClass || "",
  }), [settings]);

  const [formState, setFormState] = useState(initialSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(initialSettings) !== JSON.stringify(formState);
  }, [formState, initialSettings]);

  useEffect(() => {
    if (
      SaveFetcher.data?.message &&
      SaveFetcher.data?.success === true &&
      SaveFetcher.formData?.get("_action") === "saveSettings"
    ) {
      setIsSubmitting(false);
      window.shopify.toast.show(SaveFetcher.data.message, {
        isError: false,
      });
    }
  }, [SaveFetcher.data]);

  useEffect(() => {
    if (syncFetcher.data?.message) {
      const formData = new FormData();
      formData.append("action", "update");

      fetch("/api/create-page", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setIsSubmitting(false);
            window.shopify.toast.show(syncFetcher.data.message, {
              isError: false,
            });
          } else {
            console.error("Failed to create page: " + (data.error || data.message));
          }
        })
        .catch((err) => {
          console.error("Page creation failed", err);
        });
    }
  }, [syncFetcher.data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    SaveFetcher.submit(
      {
        _action: "saveSettings",
        ...formState,
      },
      {
        method: "post",
      }
    );
  };

  const isSyncing =
    syncFetcher.state !== "idle" &&
    syncFetcher.formData?.get("_action") === "syncData";

  return (
    <Page
      title="Settings"
      backAction={{ url: '/app/' }}
      primaryAction={{
        content: 'Save',
        onAction: handleSubmit,
        disabled: !hasChanges,
        loading: isSubmitting,
      }}
    >
      <Layout>
        <SaveFetcher.Form method="post" id="settings-form">
          <input type="hidden" name="_action" value="saveSettings" />
          <Layout.AnnotatedSection
            title="Layout & Features"
            description="Customize the look and feel of your page."
          >
            {/* Layouts */}
            <Card>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Page Layout</strong>
              </div>
              <BlockStack>
                {[
                  { label: 'Horizontal', value: 'horizontal' },
                  { label: 'List', value: 'list' },
                  { label: 'Page', value: 'page' },
                  { label: 'Vertical', value: 'vertical' },
                  { label: 'Catalogue', value: 'catalogue' },
                  { label: 'Simple catalogue', value: 'simple-catalogue' },
                ].map(({ label, value }) => (
                  <RadioButton
                    key={value}
                    label={label}
                    value={value}
                    name="pageLayout"
                    checked={formState.pageLayout === value}
                    onChange={() => setValue('pageLayout', value)}
                  />
                ))}
              </BlockStack>
            </Card>
            <br />

            {/* Colour Scheme */}
            <Card sectioned>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Colour Scheme</strong>
              </div>
              <BlockStack>
                {[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ].map(({ label, value }) => (
                  <RadioButton
                    key={value}
                    label={label}
                    value={value}
                    name="colourScheme"
                    checked={formState.colourScheme === value}
                    onChange={() => setValue('colourScheme', value)}
                  />
                ))}
              </BlockStack>
            </Card>
            <br />

            {/* Featured Carousel */}
            <Card sectioned>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Featured image carousel</strong>
              </div>
              <BlockStack>
                {[
                  { label: 'Hidden', value: 'hidden' },
                  { label: 'Visible', value: 'visible' },
                ].map(({ label, value }) => (
                  <RadioButton
                    key={value}
                    label={label}
                    value={value}
                    name="featuredCarousel"
                    checked={formState.featuredCarousel === value}
                    onChange={() => setValue('featuredCarousel', value)}
                  />
                ))}
              </BlockStack>

            </Card>
            <br />

            {/* Letter Shortcuts */}
            <Card sectioned>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Letter shortcuts</strong><br />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span>A row of clickable letters on the brands page that scrolls the page to the letter clicked.</span>
                <BlockStack>
                  {[
                    { label: 'Hidden', value: 'hidden' },
                    { label: 'Visible', value: 'visible' },
                  ].map(({ label, value }) => (
                    <RadioButton
                      key={value}
                      label={label}
                      value={value}
                      name="scrollPage"
                      checked={formState.scrollPage === value}
                      onChange={() => setValue('scrollPage', value)}
                    />
                  ))}
                </BlockStack>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span>Disabled letters from the alphabet for which your store does not have any brands</span>
                <BlockStack>
                  {[
                    { label: 'Hidden', value: 'hidden' },
                    { label: 'Visible', value: 'visible' },
                  ].map(({ label, value }) => (
                    <RadioButton
                      key={value}
                      label={label}
                      value={value}
                      name="disabledLetters"
                      checked={formState.disabledLetters === value}
                      onChange={() => setValue('disabledLetters', value)}
                    />
                  ))}
                </BlockStack>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span>When the letter shortcuts take up more space than one line</span>
                <BlockStack>
                  {[
                    { label: 'Horizontal scroll', value: 'horizontalScroll' },
                    { label: 'Wrap around to next line', value: 'wrapAround' },
                  ].map(({ label, value }) => (
                    <RadioButton
                      key={value}
                      label={label}
                      value={value}
                      name="letterSpace"
                      checked={formState.letterSpace === value}
                      onChange={() => setValue('letterSpace', value)}
                    />
                  ))}
                </BlockStack>
              </div>
            </Card>
            <br />

            {/* Search Bar */}
            <Card sectioned>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Search bar</strong>
              </div>
              <BlockStack>
                {[
                  { label: 'Hidden', value: 'hidden' },
                  { label: 'Visible', value: 'visible' },
                ].map(({ label, value }) => (
                  <RadioButton
                    key={value}
                    label={label}
                    value={value}
                    name="searchBar"
                    checked={formState.searchBar === value}
                    onChange={() => setValue('searchBar', value)}
                  />
                ))}
              </BlockStack>
            </Card>
            <br />

            {/* Scroll Top */}
            <Card sectioned>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Scroll to top button</strong>
              </div>
              <BlockStack>
                {[
                  { label: 'Hidden', value: 'hidden' },
                  { label: 'Visible', value: 'visible' },
                ].map(({ label, value }) => (
                  <RadioButton
                    key={value}
                    label={label}
                    value={value}
                    name="scrollTop"
                    checked={formState.scrollTop === value}
                    onChange={() => setValue('scrollTop', value)}
                  />
                ))}
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          {/* Automation */}
          <Layout.AnnotatedSection
            title="Automation"
            description="Choose how data sources are used to populate your brand list."
          >
            <Card sectioned>
              <BlockStack>
                <Checkbox
                  label="Product vendors"
                  name="productVendors"
                  checked={formState.productVendors}
                  value={formState.productVendors}
                  onChange={(checked) => setFormState(prev => ({ ...prev, productVendors: checked }))}
                />
                <Checkbox
                  label="Smart collections"
                  name="smartCollections"
                  checked={formState.smartCollections}
                  value={formState.smartCollections}
                  onChange={(checked) => setFormState(prev => ({ ...prev, smartCollections: checked }))}
                />
                <Checkbox
                  label="Custom collections"
                  name="customCollections"
                  checked={formState.customCollections}
                  value={formState.customCollections}
                  onChange={(checked) => setFormState(prev => ({ ...prev, customCollections: checked }))}
                />
              </BlockStack>
            </Card>
            <br />

            {/* Default Status */}
            <Card sectioned>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Default status</strong>
              </div>
              <BlockStack>
                {[
                  { label: 'Approved', value: 'approved' },
                  { label: 'Draft', value: 'draft' },
                ].map(({ label, value }) => (
                  <RadioButton
                    key={value}
                    label={label}
                    value={value}
                    name="defaultStatus"
                    checked={formState.defaultStatus === value}
                    onChange={() => setValue('defaultStatus', value)}
                  />
                ))}
              </BlockStack>
            </Card>
            <br />

            {/* Retrieve Data */}
            <Card>
              <div style={{ paddingBottom: "10px" }}>
                <strong>Retrieve data</strong>
              </div>
              <p>
                The app checks your store's data every 4 hours. Click below to manually sync if changes were recent.
              </p>
              <Button
                fullWidth
                loading={isSyncing}
                onClick={() => {
                  syncFetcher.submit(
                    {
                      _action: "syncData",
                    },
                    {
                      method: "post",
                    }
                  );
                }}
              >
                Retrieve data manually
              </Button>
            </Card>
          </Layout.AnnotatedSection>

          {/* SEO */}
          <Layout.AnnotatedSection
            title="Language & SEO"
            description="Customize text and SEO settings for the brand page."
          >
            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Page title"
                  name="pageTitle"
                  value={formState.pageTitle}
                  onChange={value => setValue("pageTitle", value)}
                />
                <TextField
                  label="URL and handle"
                  prefix={`https://${shop}/pages/`}
                  name="seoUrlHandle"
                  value={formState.seoUrlHandle}
                  onChange={value => setValue("seoUrlHandle", value)}
                />
              </FormLayout>
            </Card>
            <br />

            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Search placeholder text"
                  name="searchPlaceholder"
                  value={formState.searchPlaceholder}
                  onChange={value => setValue("searchPlaceholder", value)}
                />
                <TextField
                  label="No results title"
                  name="noResultsTitle"
                  value={formState.noResultsTitle}
                  onChange={value => setValue("noResultsTitle", value)}
                />
                <TextField
                  label="No results description"
                  multiline={2}
                  name="noResultsDescription"
                  value={formState.noResultsDescription}
                  onChange={value => setValue("noResultsDescription", value)}
                />
              </FormLayout>
            </Card>
          </Layout.AnnotatedSection>

          {/* Design */}
          <Layout.AnnotatedSection
            title="Design"
            description="Customize page by adding custom CSS & settings."
          >
            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Custom CSS"
                  name="customCSS"
                  multiline={10}
                  value={formState.customCSS}
                  onChange={value => setValue("customCSS", value)}
                />
              </FormLayout>
            </Card>
            <br />
            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Offset Selectors"
                  name="offsetClass"
                  helpText= "Add selectors to calculate offset. Use comma-separated values like: #id, .className, tagname"
                  value={formState.offsetClass}
                  onChange={value => setValue("offsetClass", value)}
                />
              </FormLayout>
            </Card>
          </Layout.AnnotatedSection>

          <div style={{ marginTop: "20px", float: 'right' }}>
            <ButtonGroup>
              <Button
                onClick={() => navigate("/app/")}
              >Cancel</Button>
              <Button
                variant="primary"
                loading={isSubmitting}
                onClick={handleSubmit}
                disabled={!hasChanges}
              >
                Save
              </Button>
            </ButtonGroup>
          </div>
          {isSyncing && <AppLoading text="Syncing products, please wait..." />}
        </SaveFetcher.Form>
        <br />
      </Layout>
    </Page>
  );
}

export const action = async ({ request }) => {
  const formData = await request.formData();
  const actionType = formData.get("_action");

  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  if (actionType === "syncData") {
    try {
      await syncShopifyCollections(request);
      return json({
        success: true,
        message: "Successfully retrieved data from Shopify.",
      });
    } catch (error) {
      console.error("Data retrieval failed:", error);
      return json({
        success: false,
        message: "Failed to retrieve data from Shopify.",
      }, { status: 500 });
    }
  }

  if (actionType === "saveSettings") {
    try {
      const parseBoolean = (val) => val === 'true';
      const settings = {
        shop,
        pageLayout: formData.get("pageLayout"),
        colourScheme: formData.get("colourScheme"),
        featuredCarousel: formData.get("featuredCarousel"),
        scrollPage: formData.get("scrollPage"),
        disabledLetters: formData.get("disabledLetters"),
        letterSpace: formData.get("letterSpace"),
        searchBar: formData.get("searchBar"),
        scrollTop: formData.get("scrollTop"),
        productVendors: parseBoolean(formData.get("productVendors")),
        smartCollections: parseBoolean(formData.get("smartCollections")),
        customCollections: parseBoolean(formData.get("customCollections")),
        defaultStatus: formData.get("defaultStatus"),
        pageTitle: formData.get("pageTitle"),
        seoUrlHandle: formData.get("seoUrlHandle"),
        searchPlaceholder: formData.get("searchPlaceholder"),
        noResultsTitle: formData.get("noResultsTitle"),
        noResultsDescription: formData.get("noResultsDescription"),
        customCSS : formData.get("customCSS"),
        offsetClass : formData.get("offsetClass")
      };

      const updateHandleRes = await updateBrandPageHandle({
        session, admin, newHandle: formData.get("seoUrlHandle"),
      });
      const updateHandleResult = await updateHandleRes.json();
      if (!updateHandleResult.success) {
        return json({
          success: false,
          message: "Failed to update brand page handle.",
          error: updateHandleResult.error || updateHandleResult.errors,
        }, { status: 500 });
      }

      await prisma.brandSettings.upsert({
        where: { shop },
        update: settings,
        create: settings,
      });

      const updatePage = await createOrUpdateBrandPage({ session, admin, action: "update" });
      const updatePageResult = await updatePage.json();
      if (!updatePageResult.success) {
        return json({
          success: false,
          message: "Page update failed.",
          error: updatePageResult.error || updatePageResult.errors,
        }, { status: 500 });
      }

      return json({
        success: true,
        message: "Settings saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      return json({
        success: false,
        message: "Failed to save settings.",
      }, { status: 500 });
    }
  }

  return json({
    success: false,
    message: "Invalid action type.",
  }, { status: 400 });

};
