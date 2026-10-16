"use client";

/** Remembers ?ref=LUNA-… so the influencer is credited at checkout. OURS. */
import { useEffect } from "react";

import { rememberPartnerRef } from "@/lib/ailunapro-api";

export function RefCapture() {
  useEffect(() => {
    rememberPartnerRef(new URLSearchParams(window.location.search).get("ref"));
  }, []);
  return null;
}
