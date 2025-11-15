import {
  IndexTable,
  Thumbnail,
  Text,
  Badge,
  InlineStack,
  useIndexResourceState,
  Card,
  BlockStack,
  Modal,
  Banner,
  Button,
  ButtonGroup
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { ImageIcon } from "@shopify/polaris-icons";
import { getStatusTone } from "../../routes/status";
import { useEffect, useState, useCallback } from "react";
import AppLoading from "./AppLoading";

export function BrandTable({ brandRows, revalidate }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "", actionLabel: "" });
  const handleChange = useCallback(() => setActive(!active), [active]);

  let {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(brandRows);

  const bulkActions = [
    {
      content: "Set as approved",
      onAction: () => handleBulkAction("approve"),
      disabled: loading,
    },
    {
      content: "Set as featured",
      onAction: () => handleBulkAction("feature"),
      disabled: loading,
    },
    {
      content: "Set as draft",
      onAction: () => handleBulkAction("draft"),
      disabled: loading,
    },
    {
      content: "Delete",
      destructive: true,
      onAction: () => handleBulkAction("delete"),
      disabled: loading,
    },
  ];

  async function handleBulkAction(action) {
    if (selectedResources.length === 0) return;

    setModalContent({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Selected Brands`,
      message: `You are about to ${action} the selected brands.`,
      actionLabel: `${action.charAt(0).toUpperCase() + action.slice(1)}`,
      action,
    });

    setActive(true);

  }

  useEffect(() => {
    if (toastMessage) {
      window.shopify?.toast?.show?.(toastMessage, { isError: false });
      setToastMessage(null);
    }
  }, [toastMessage]);

  return (
    <BlockStack gap="400">
      {loading && <AppLoading />}

      <Modal
        open={active}
        onClose={handleChange}
        title={modalContent.title}
        primaryAction={{
          content: modalContent.actionLabel,
          destructive: modalContent.action === "delete",
          onAction: () => handleConfirmAction(),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleChange,
          },
        ]}
      >
        <Modal.Section>
          <Text>
            <BlockStack gap="500">
              {modalContent.action === "delete" && (
                <Banner tone="warning">
                  <Text as="span">{modalContent.message}</Text>
                </Banner>
              )}
              <Text as="span">
                Please confirm your action to proceed with the selected brands.
              </Text>
            </BlockStack>
          </Text>
        </Modal.Section>
      </Modal>

      <IndexTable
        resourceName={{ singular: "Brand", plural: "Brands" }}
        itemCount={brandRows.length}
        selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
        onSelectionChange={handleSelectionChange}
        headings={[
          { title: <div style={{ marginLeft: "50px" }}>Title</div> },
          { title: "Origin" },
          { title: "Availability" },
          { title: "Status" },
        ]}
        selectable
        loading={loading}
      // bulkActions={bulkActions}
      // promotedBulkActions={bulkActions}
      >
        {brandRows.map((brand, index) => (
          <IndexTable.Row
            id={brand.id}
            key={brand.id}
            selected={selectedResources.includes(brand.id)}
            position={index}
            onSelectionChange={handleSelectionChange}
            onClick={() => navigate(`/app/brands/${brand.id}`)}
          >
            <IndexTable.Cell>
              <InlineStack blockAlign="center" gap="200">
                <Thumbnail
                  source={brand.image || ImageIcon}
                  alt={brand.title || "Brand image"}
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
                <Text
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/brands/${brand.id}`);
                  }}
                >
                  <Text variant="bodyMd" fontWeight="bold" as="span">
                    {brand.title}
                  </Text>
                </Text>
              </InlineStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
              <InlineStack gap="100" blockAlign="center">
                <Badge>
                  {brand.origin === "CustomCollection" || brand.origin === "SmartCollection"
                    ? "Collection"
                    : brand.origin}
                </Badge>
              </InlineStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
              <InlineStack gap="100" blockAlign="center">
                <Badge>{brand.availability}</Badge>
              </InlineStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
              <InlineStack gap="100" blockAlign="center">
                <Badge tone={getStatusTone(brand.status)}>{brand.status}</Badge>
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
      {selectedResources.length != 0 &&
        <div
          style={{
            position: 'sticky',
            bottom: 20,
            zIndex: 999,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Card >
            <ButtonGroup>
              <InlineStack gap="200">
                <Button
                  variant="secondary"
                  onClick={() => handleBulkAction("approve")}
                >
                  Set as approved
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleBulkAction("feature")}
                >
                  Set as featured
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleBulkAction("draft")}
                >
                  Set as draft
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleBulkAction("delete")}
                >
                  Delete
                </Button>
              </InlineStack>
            </ButtonGroup>
          </Card>
        </div>
      }
    </BlockStack>
  );

  function handleConfirmAction() {
    setActive(false);
    handleBulkActionConfirmed(modalContent.title.toLowerCase().split(' ')[0]);
  }

  async function handleBulkActionConfirmed(action) {
    if (selectedResources.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedResources,
          action,
        }),
      });

      if (res.ok) {
        selectedResources.length = 0;
        revalidate();
        setToastMessage(`Bulk ${action} completed`);
      } else {
        console.error("Bulk action failed:", await res.text());
        setToastMessage("Bulk action failed");
      }
    } catch (err) {
      console.error("Bulk action error:", err);
      setToastMessage("Error performing action");
    } finally {
      setLoading(false);
    }
  }
}
