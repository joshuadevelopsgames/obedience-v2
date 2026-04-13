import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Normalise URL
    const target = url.startsWith("http") ? url : `https://${url}`;

    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheProtocol/1.0; +https://theprotocol.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch URL" }, { status: 400 });
    }

    const html = await res.text();
    const domain = new URL(target).hostname.replace(/^www\./, "");

    // Extract OG / meta tags
    const get = (property: string): string | null => {
      // og: and twitter: meta
      const ogMatch = html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]+content=["']([^"']+)["']`, "i")
      ) || html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["']`, "i")
      );
      return ogMatch?.[1]?.trim() || null;
    };

    const title =
      get("title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      domain;

    let imageUrl = get("image") || get("image:src");

    // Make relative image URLs absolute
    if (imageUrl && !imageUrl.startsWith("http")) {
      const base = new URL(target);
      imageUrl = `${base.origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    }

    // Extract price — try schema.org, then common price patterns
    const priceMatch =
      html.match(/["']price["']\s*:\s*["']([^"']+)["']/i) ||
      html.match(/class="[^"]*price[^"]*"[^>]*>\s*\$?([\d,.]+)/i) ||
      html.match(/itemprop="price"[^>]+content="([^"]+)"/i);
    const price = priceMatch?.[1] ? `$${priceMatch[1].replace(/^\$/, "")}` : null;

    return NextResponse.json({ title, imageUrl, price, domain });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
