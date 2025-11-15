import {
  useNavigate,
  useLoaderData,
  useRevalidator,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ButtonGroup,
  Button,
  BlockStack,
  EmptyState,
  Box,
  Bleed,
  Text
} from "@shopify/polaris";
import {
  getBrands,
  getSeoUrlHandle,
} from "../models/brand.server";
import { useEffect, useState, useMemo } from "react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { BrandTable } from "../components/Backend/BrandTable";
import LoadingSkeleton from "../components/Backend/LoadingSkeleton";

// --- Constants
const FILTERS = ["All", "draft", "approved", "featured", "available", "unavailable"];

// --- Loader
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const brandRows = await getBrands(shop);
  const brandPageHandle = await getSeoUrlHandle(shop);
  return json({ brandRows, brandPageHandle, shop });
}

// --- Main Component
export default function BrandIndexPage() {
  const navigation = useNavigation();
  const isPageLoading = navigation.state != "idle";
  if (isPageLoading) return <LoadingSkeleton />;

  const { brandRows, brandPageHandle, shop } = useLoaderData();
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (brandRows && brandRows.length >= 0) {
      setIsLoading(false);
    }
  }, [brandRows]);

  const filteredRows = useMemo(() => {
    const f = selectedFilter.toLowerCase();
    return brandRows.filter((row) => {
      if (f === "all") return true;
      if (["draft", "approved", "featured"].includes(f)) {
        return row.status?.toLowerCase() === f;
      }
      if (["available", "unavailable"].includes(f)) {
        return row.availability?.toLowerCase() === f;
      }
      return true;
    });
  }, [selectedFilter, brandRows]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Page
      title="Brands"
      primaryAction={{ content: "Add Brand", url: "/app/brands/new" }}
      secondaryActions={[
        {
          content: "View brands page",
          url: `https://${shop}/pages/${brandPageHandle || "brands"}`,
          target: "_blank",
        },
        { content: "Settings", url: "/app/settings" },
      ]}
    >
      <BlockStack gap="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Box>
                  <ButtonGroup segmented>
                    {FILTERS.map((filter) => (
                      <Button
                        key={filter}
                        pressed={selectedFilter === filter}
                        onClick={() => setSelectedFilter(filter)}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Box>
                <Bleed marginInline="400">
                  {filteredRows.length > 0 ? (
                    <BrandTable brandRows={filteredRows} revalidate={revalidator.revalidate} />
                  ) : (
                    <EmptyState
                      heading="No brands found"
                      action={{
                        content: "Add Brand",
                        onAction: () => navigate("/app/brands/new"),
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <Text as="h6">There are no brands matching the selected filter.</Text>
                    </EmptyState>
                  )}
                </Bleed>
              </BlockStack>
            </Card>
            <Box paddingBlockEnd="600" />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
