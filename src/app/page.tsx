import { redirect } from "next/navigation";

// No public landing page: go straight to the app. The dashboard sends
// unauthenticated users to /login (Appwrite mode); desktop mode has no login.
export default function Home() {
    redirect("/dashboard");
}
