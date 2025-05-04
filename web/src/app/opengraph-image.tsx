import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Swift - Talk to your codebase";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            gap: 24,
          }}
        >
          <div style={{ fontSize: 120, lineHeight: 1, userSelect: "none" }} role="img" aria-label="Swift Logo">
            ⚡
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "black",
              marginTop: 12,
            }}
          >
            Swift
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#666",
              marginTop: 12,
            }}
          >
            Talk to your codebase
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
