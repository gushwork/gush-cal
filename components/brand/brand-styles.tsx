import { getBrandConfig } from "@/lib/brand/config";
import { deriveSoftVariants } from "@/lib/brand/gushwork-preset";

export function BrandStyles() {
  const { primaryColor, accentColor } = getBrandConfig();
  const { primarySoft, accentSoft } = deriveSoftVariants(
    primaryColor,
    accentColor,
  );

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root {
            --primary: ${primaryColor};
            --colors-primary-500: ${primaryColor};
            --primary-soft: ${primarySoft};
            --colors-primary-25: ${primarySoft};
            --accent: ${accentColor};
            --accent-soft: ${accentSoft};
            --colors-primary-600: ${accentColor};
          }
        `,
      }}
    />
  );
}
