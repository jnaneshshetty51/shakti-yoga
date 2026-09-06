import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function OgImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "80px",
                    background: "linear-gradient(135deg, #3a5531 0%, #496a3f 55%, #6b8c53 100%)",
                    color: "#f5f6f3",
                    fontFamily: "Georgia, serif",
                }}
            >
                <div style={{ fontSize: 34, letterSpacing: 6, textTransform: "uppercase", opacity: 0.8 }}>
                    {SITE_NAME}
                </div>
                <div style={{ fontSize: 68, lineHeight: 1.1, marginTop: 24, maxWidth: 900 }}>
                    {SITE_TAGLINE}
                </div>
                <div style={{ fontSize: 28, marginTop: 40, opacity: 0.85 }}>
                    Live classes · 1:1 therapy · joined over Google Meet
                </div>
            </div>
        ),
        size,
    );
}
