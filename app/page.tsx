import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "CopySpace — Copyparty 檔案空間",
  description: "以簡潔、響應式介面瀏覽你的 Copyparty 檔案空間。",
  applicationName: "CopySpace",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CopySpace",
  },
};

export default function HomePage() {
  redirect("/app");
}
