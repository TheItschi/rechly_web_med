import ManageBooking from "@/components/termine/ManageBooking";

export const metadata = {
    title: "Termin verwalten",
    robots: { index: false, follow: false },
};

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <ManageBooking token={token} />;
}
