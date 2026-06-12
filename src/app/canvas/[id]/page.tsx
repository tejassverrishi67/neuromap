"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CanvasClient from "@/components/canvas/CanvasClient";
import { getCanvasById } from "@/lib/storage";
import CanvasLoading from "./loading";

interface CanvasPageProps {
  params: Promise<{ id: string }>;
}

export default function CanvasPage({ params }: CanvasPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [canvas, setCanvas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || id === "new") {
      router.push("/");
      return;
    }

    async function fetchCanvas() {
      try {
        const data = await getCanvasById(id);
        if (!data) {
          router.push("/");
          return;
        }
        setCanvas(data);
      } catch (err) {
        console.error("Failed to load canvas from localStorage:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    fetchCanvas();
  }, [id, router]);

  if (loading) {
    return <CanvasLoading />;
  }

  return <CanvasClient canvas={canvas} />;
}
