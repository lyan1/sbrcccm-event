import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const shareDescription =
  "匹克球是南贝城基督教会华语部的联谊活动，欢迎弟兄姊妹和朋友一起运动、交流。报名前请先加入微信群，便于接收活动通知与变更信息。";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Church Pickleball",
  description: shareDescription,
  openGraph: {
    title: process.env.NEXT_PUBLIC_APP_NAME ?? "Church Pickleball",
    description: shareDescription,
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "https://storage1.snappages.site/K2S55Q/assets/images/6513167_806x803_500.png",
        width: 806,
        height: 803,
        alt: "南贝城基督教会华语部匹克球",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
