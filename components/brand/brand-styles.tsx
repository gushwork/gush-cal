import { getBrandConfig } from "@/lib/brand/config";
import { deriveSoftVariants } from "@/lib/brand/gushwork-preset";

export function BrandStyles() {
  const { primaryColor, accentColor, fontDisplay } = getBrandConfig();
  const { primarySoft, accentSoft } = deriveSoftVariants(
    primaryColor,
    accentColor,
  );

  const fontImport = fontDisplay
    ? `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontDisplay).replace(/%20/g, "+")}:wght@400;600;700&display=swap');`
    : "";

  const fontOverride = fontDisplay
    ? `--font-display: "${fontDisplay}", Georgia, serif;`
    : "";

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          ${fontImport}
          :root {
            --primary: ${primaryColor};
            --primary-soft: ${primarySoft};
            --accent: ${accentColor};
            --accent-soft: ${accentSoft};
            ${fontOverride}
          }
        `,
      }}
    />
  );
}
