"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface PaymentImage {
  type: string;
  title: string;
  description: string | null;
  imageUrl: string;
}

const TYPE_LABELS: Record<string, "zelleQr" | "venmoQr"> = {
  ZELLE_QR: "zelleQr",
  VENMO_QR: "venmoQr",
};

export default function PaymentInfoPage() {
  const { t } = useI18n();
  const [images, setImages] = useState<PaymentImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payment-info")
      .then(async (r) => {
        if (!r.ok) return [];
        const data = await r.json();
        return Array.isArray(data) ? data : [];
      })
      .then((data) => {
        setImages(data);
        setLoading(false);
      })
      .catch(() => {
        setImages([]);
        setLoading(false);
      });
  }, []);

  const preferredTypes = ["ZELLE_QR", "VENMO_QR"];

  return (
    <PublicLayout>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← {t("home")}</Link>
        </Button>

        <h1 className="text-xl font-bold">{t("paymentInfo")}</h1>

        <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
          <p>{t("paymentInstructionsZh")}</p>
          <p className="text-muted-foreground">{t("paymentInstructionsEn")}</p>
        </div>

        {loading ? (
          <p>{t("loading")}</p>
        ) : (
          <div className="space-y-4">
            {preferredTypes.map((type) => {
              const img = images.find((i) => i.type === type);
              const labelKey = TYPE_LABELS[type];
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {labelKey ? t(labelKey) : type}
                    </CardTitle>
                    {img?.description && (
                      <p className="text-sm text-muted-foreground">{img.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {img ? (
                      <Image
                        src={img.imageUrl}
                        alt={img.title}
                        width={280}
                        height={280}
                        className="rounded-lg"
                        unoptimized
                      />
                    ) : (
                      <p className="py-8 text-muted-foreground">{t("notAvailable")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
