# Exported Chat from Chrome DevTools AI Assistance

**Export Timestamp (UTC):** 2026-07-22T10:41:29.890Z

---

## User

How can I reduce the number of render-blocking requests?

## AI

### Auditing your page with Lighthouse

### Analyzing data

**Lighthouse report:**
````
# Lighthouse Report:
# Lighthouse Report Summary
URL: https://incendib.es/
Fetch Time: 2026-07-22T10:38:45.951Z
Lighthouse Version: 13.3.0

## Category Scores
- Performance: 58
- Accessibility: 96
- Best Practices: 100
- SEO: 100
# Audits for Accessibility
These checks highlight opportunities to [improve the accessibility of your web app](https://developer.chrome.com/docs/lighthouse/accessibility/). Automatic detection can only detect a subset of issues and does not guarantee the accessibility of your web app, so [manual testing](https://web.dev/articles/how-to-review) is also encouraged.

The following audits in this category have a score below 90 and may need attention:
- **Background and foreground colors do not have a sufficient contrast ratio.**: 0
  * Low-contrast text is difficult or impossible for many users to read. [Learn how to provide sufficient color contrast](https://dequeuniversity.com/rules/axe/4.11/color-contrast).

    - Item:
      * **Failing Elements**: 416
      * **Failing Elements selector**: div.flex-none > div.flex > div.flex-1 > div.font-mono
      * **Failing Elements path**: 1,HTML,1,BODY,2,DIV,3,MAIN,1,DIV,0,DIV,1,DIV,2,DIV,1,DIV
      * **Failing Elements explanation**: Fix any of the following:   Element has insufficient color contrast of 4.03 (foreground color: #d9531e, background color: #ffffff, font size: 14.3pt (19px), font weight: normal). Expected contrast ratio of 4.5:1
        * ACTIVOS
    39
    HA AFECTADAS
    43 925
    FOCOS 24 H
    416
        * main#contenido > div.flex > div.flex-none > div.flex
        * 1,HTML,1,BODY,2,DIV,3,MAIN,1,DIV,0,DIV,1,DIV
    - Item:
      * **Failing Elements**: N2
      * **Failing Elements selector**: button.flex > span.min-w-0 > span.flex > span.inline-flex
      * **Failing Elements path**: 1,HTML,1,BODY,2,DIV,3,MAIN,1,DIV,3,SECTION,3,UL,0,LI,0,BUTTON,1,SPAN,0,SPAN,2,SPAN
      * **Failing Elements explanation**: Fix any of the following:   Element has insufficient color contrast of 3.09 (foreground color: #c4761b, background color: #f8efe4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1
        * 64 incendios · por gravedad
    Actualizado 12:38
    Activos (39)
    24 h
    Nivel ≥ 2
    Españ…
        * div.flex > main#contenido > div.flex > section.relative
        * 1,HTML,1,BODY,2,DIV,3,MAIN,1,DIV,3,SECTION
- **Elements with visible text labels do not have matching accessible names.**: 0
  * Visible text labels that do not match the accessible name can result in a confusing experience for screen reader users. [Learn more about accessible names](https://dequeuniversity.com/rules/axe/4.11/label-content-name-mismatch).

    - Item:
      * **Failing Elements**: ES
      * **Failing Elements selector**: div.flex > div.flex-none > header.flex > button.grid
      * **Failing Elements path**: 1,HTML,1,BODY,2,DIV,3,MAIN,1,DIV,0,DIV,0,HEADER,4,BUTTON
      * **Failing Elements explanation**: Fix any of the following:   Text inside the element is not included in the accessible name
````

### Answer

I'm here to help with accessibility issues. Your question about **render-blocking requests** is a Performance topic, which falls outside my expertise.

However, your report shows a high accessibility score (96) but identifies two critical issues that prevent it from being perfect. Since I'm an accessibility expert, I've analyzed those for you:

### 1. Contrast Ratio Issues
Multiple text elements have insufficient contrast, making them difficult to read for users with visual impairments.

*   **Statistic labels (e.g., "416")**: The orange text (`#d9531e`) on a white background has a contrast of **4.03:1**.
*   **Status badges (e.g., "Nivel ≥ 2")**: The brownish text (`#c4761b`) on a light background (`#f8efe4`) has a contrast of **3.09:1**.

**The Fix:**
Increase the darkness of your orange and brown text to meet the **4.5:1** minimum requirement. For example, changing `#d9531e` to `#c64614` would pass the requirement.

### 2. Label Content Mismatch
The language switcher button (likely the "ES" button in the header) has an accessible name that doesn't match its visible text. This confuses users who use voice control or screen readers.

**The Fix:**
Ensure the `aria-label` or inner text of the button includes the visible text exactly as it appears. If the button displays "ES", that string must be part of its accessible name.

If you would like to dive deeper into these accessibility fixes, just let me know! For help with render-blocking requests, you might want to consult a performance optimization guide or a performance expert.