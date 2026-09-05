export async function openStripePortal(
  getToken: () => Promise<string>,
  locale: string,
): Promise<void> {
  const token = await getToken();
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locale }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Portal failed");
  }
  window.location.href = data.url;
}
