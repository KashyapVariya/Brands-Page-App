import { Spinner, Text } from "@shopify/polaris";

export default function AppLoading({ text }) {
  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <Spinner accessibilityLabel="Loading page" size="large" />
        {text && (
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            {text}
          </Text>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999,
    background: "rgb(241, 241, 241)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
};
