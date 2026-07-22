> ⚠️ **Material de origen (no es la fuente de verdad).** Traza grabada con las
> extensiones del navegador del usuario activas (Norton/AdGuard/AdBlock), por lo
> que sus cifras de `render delay` y de hilo principal están **infladas**. El
> análisis correcto, verificado y con las acciones aplicadas está en
> [`README.md`](./README.md).

# Exported Chat from Chrome DevTools AI Assistance

**Export Timestamp (UTC):** 2026-07-22T10:37:16.326Z

---

## User

What performance issues exist on the page?

## AI

### Recording a performance trace

### Analyzing data

**Trace details:**
````
Trace summary:
URL: https://incendib.es/
Trace bounds: {min: 542781944836µs, max: 542788401525µs}
CPU throttling: none
Network throttling: none

# Available insight sets

The following is a list of insight sets. An insight set covers a specific part of the trace, split by navigations. The insights within each insight set are specific to that part of the trace. Be sure to consider the insight set id and bounds when calling functions. If no specific insight set or navigation is mentioned, assume the user is referring to the first one.

## insight set id: NAVIGATION_0

URL: https://incendib.es/
Bounds: {min: 542781974495µs, max: 542788401525µs}
Metrics (lab / observed):
  - LCP: 1391 ms, event: (eventKey: r-12404, ts: 542783365406), nodeId: 69
  - LCP breakdown:
    - TTFB: 71 ms, bounds: {min: 542781974495µs, max: 542782045933µs}
    - Render delay: 1,319 ms, bounds: {min: 542782045933µs, max: 542783365406µs}
  - CLS: 0.00, event: (eventKey: s-18138, ts: 542784000862)
Metrics (field / real users): n/a – no data for this page in CrUX
Available insights:
  - insight name: LCPBreakdown
    description: Each [subpart has specific improvement strategies](https://developer.chrome.com/docs/performance/insights/lcp-breakdown). Ideally, most of the LCP time should be spent on loading the resources, not within delays.
    relevant trace bounds: {min: 542781974495µs, max: 542783365406µs}
    example question: Help me optimize my LCP score
    example question: Which LCP phase was most problematic?
    example question: What can I do to reduce the LCP time for this page load?
  - insight name: CLSCulprits
    description: Layout shifts occur when elements move absent any user interaction. [Investigate the causes of layout shifts](https://developer.chrome.com/docs/performance/insights/cls-culprit), such as elements being added, removed, or their fonts changing as the page loads.
    relevant trace bounds: {min: 542784000862µs, max: 542785000862µs}
    example question: Help me optimize my CLS score
    example question: How can I prevent layout shifts on this page?
  - insight name: RenderBlocking
    description: Requests are blocking the page's initial render, which may delay LCP. [Deferring or inlining](https://developer.chrome.com/docs/performance/insights/render-blocking) can move these network requests out of the critical path.
    relevant trace bounds: {min: 542782297981µs, max: 542782466267µs}
    estimated metric savings: FCP 0 ms, LCP 0 ms
    example question: Show me the most impactful render-blocking requests that I should focus on
    example question: How can I reduce the number of render-blocking requests?
  - insight name: NetworkDependencyTree
    description: [Avoid chaining critical requests](https://developer.chrome.com/docs/performance/insights/network-dependency-tree) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.
    relevant trace bounds: {min: 542781978710µs, max: 542782629733µs}
    example question: How do I optimize my network dependency tree?
  - insight name: DOMSize
    description: A large DOM can increase the duration of style calculations and layout reflows, impacting page responsiveness. A large DOM will also increase memory usage. [Learn how to avoid an excessive DOM size](https://developer.chrome.com/docs/performance/insights/dom-size).
    relevant trace bounds: {min: 542783189788µs, max: 542783293921µs}
    example question: How can I reduce the size of my DOM?
  - insight name: ThirdParties
    description: 3rd party code can significantly impact load performance. [Reduce and defer loading of 3rd party code](https://developer.chrome.com/docs/performance/insights/third-parties) to prioritize your page's content.
    relevant trace bounds: {min: 542782311820µs, max: 542787313496µs}
    example question: Which third parties are having the largest impact on my page performance?
  - insight name: ForcedReflow
    description: A forced reflow occurs when JavaScript queries geometric properties (such as offsetWidth) after styles have been invalidated by a change to the DOM state. This can result in poor performance. Learn more about [forced reflows](https://developer.chrome.com/docs/performance/insights/forced-reflow) and possible mitigations.
    relevant trace bounds: {min: 542782558783µs, max: 542786971946µs}
    example question: How can I avoid forced reflows and layout thrashing?
    example question: What is forced reflow and why is it problematic?
  - insight name: LegacyJavaScript
    description: Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren't necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/articles/baseline-and-polyfills) features, unless you know you must support older browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://developer.chrome.com/docs/performance/insights/legacy-javascript)
    relevant trace bounds: {min: 542782298233µs, max: 542782627474µs}
    estimated metric savings: FCP 0 ms, LCP 0 ms
    estimated wasted bytes: 14.4 kB
    example question: Is my site polyfilling modern JavaScript features?
    example question: How can I reduce the amount of legacy JavaScript on my page?
# Critical network requests


Network requests data:



allUrls = [0: https://incendib.es/, 1: https://incendib.es/manifest.webmanifest, 2: https://incendib.es/_next/static/css/fa107ce3cbf43c9d.css]

0;s-2654;4 ms;32 ms;503 ms;632 ms;627 ms;217 ms;129 ms;200;text/html;VeryHigh;VeryHigh;VeryHigh;f;h2;f;;[];[content-encoding: br|etag: <redacted>|age: 35|x-content-type-options: nosniff|x-matched-path: <redacted>|x-nextjs-stale-time: <redacted>|date: Wed, 22 Jul 2026 10:35:43 GMT|x-nextjs-prerender: <redacted>|content-type: text/html; charset=utf-8|vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch|x-frame-options: SAMEORIGIN|strict-transport-security: max-age=63072000; includeSubDomains; preload|content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org https://tiles.maps.eox.at; font-src 'self' data:; worker-src 'self' blob:; child-src 'self' blob: https://www.youtube-nocookie.com; frame-src 'self' https://www.youtube-nocookie.com; media-src 'self' blob:; manifest-src 'self'; connect-src 'self' https://tiles.openfreemap.org https://tiles.maps.eox.at https://*.vercel-insights.com; upgrade-insecure-requests|cache-control: public, max-age=0, must-revalidate|x-dns-prefetch-control: <redacted>|cross-origin-opener-policy: <redacted>|x-vercel-cache: <redacted>|referrer-policy: <redacted>|permissions-policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), browsing-topics=()|x-powered-by: Next.js|server: Vercel|x-vercel-id: <redacted>]
1;s-5937;548 ms;561 ms;618 ms;655 ms;107 ms;2 ms;37 ms;200;application/manifest+json;Medium;Medium;Medium;f;h2;f;0;[];[content-encoding: br|etag: <redacted>|age: 172755|x-content-type-options: nosniff|x-matched-path: <redacted>|date: Wed, 22 Jul 2026 10:36:19 GMT|last-modified: Mon, 20 Jul 2026 10:36:27 GMT|content-disposition: inline; filename="manifest.webmanifest"|content-type: application/manifest+json; charset=utf-8|x-frame-options: SAMEORIGIN|content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org https://tiles.maps.eox.at; font-src 'self' data:; worker-src 'self' blob:; child-src 'self' blob: https://www.youtube-nocookie.com; frame-src 'self' https://www.youtube-nocookie.com; media-src 'self' blob:; manifest-src 'self'; connect-src 'self' https://tiles.openfreemap.org https://tiles.maps.eox.at https://*.vercel-insights.com; upgrade-insecure-requests|cache-control: public, max-age=0, must-revalidate|x-dns-prefetch-control: <redacted>|x-vercel-cache: <redacted>|cross-origin-opener-policy: <redacted>|referrer-policy: <redacted>|permissions-policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), browsing-topics=()|access-control-allow-origin: *|server: Vercel|x-vercel-id: <redacted>]
2;s-2860;323 ms;378 ms;383 ms;492 ms;168 ms;4 ms;109 ms;200;text/css;VeryHigh;VeryHigh;VeryHigh;t;h2;f;0;[];[content-encoding: br|etag: <redacted>|age: 176011|x-content-type-options: nosniff|x-matched-path: <redacted>|date: Wed, 22 Jul 2026 10:35:42 GMT|content-disposition: inline; filename="fa107ce3cbf43c9d.css"|content-type: text/css; charset=utf-8|last-modified: Mon, 20 Jul 2026 09:42:11 GMT|x-frame-options: SAMEORIGIN|content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org https://tiles.maps.eox.at; font-src 'self' data:; worker-src 'self' blob:; child-src 'self' blob: https://www.youtube-nocookie.com; frame-src 'self' https://www.youtube-nocookie.com; media-src 'self' blob:; manifest-src 'self'; connect-src 'self' https://tiles.openfreemap.org https://tiles.maps.eox.at https://*.vercel-insights.com; upgrade-insecure-requests|cache-control: public,max-age=31536000,immutable|x-dns-prefetch-control: <redacted>|cross-origin-opener-policy: <redacted>|x-vercel-cache: <redacted>|referrer-policy: <redacted>|permissions-policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), browsing-topics=()|access-control-allow-origin: *|server: Vercel|x-vercel-id: <redacted>]

# Main thread bottom-up summary

This is the bottom-up summary for the entire trace. Only the top 10 activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). "Self time" represents the aggregated time spent directly in an activity, across all occurrences. "Total time" represents the aggregated time spent in an activity or any of its children.

- self: 720 ms, total: 722 ms, source: ie (url: https://incendib.es/_next/static/chunks/05f6971a.1386eca4548c9a50.js, line: 0, column: 805856)
- self: 439 ms, total: 440 ms, source: Hit test
- self: 333 ms, total: 5,456 ms, source: Task
- self: 274 ms, total: 274 ms, source: Compile script
- self: 236 ms, total: 243 ms, source: requestAnimationFrame
- self: 157 ms, total: 157 ms, source: Layout
- self: 134 ms, total: 260 ms, source: collectNonInputs (url: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/content/cs.js, line: 0, column: 400379)
- self: 107 ms, total: 107 ms, source: Recalculate style
- self: 94 ms, total: 3,269 ms, source: Function call (url: chrome-extension://bgnkhhnnamicmpeenaelnjfhikgbkllg/pages/content-script-start.js, line: 1129, column: 41)
- self: 83 ms, total: 225 ms, source: elementFromPoint
The following are markdown block(s) of code that ran in the page, each representing a separate function. <FUNCTION_START> and <FUNCTION_END> marks the exact function declaration, and everything outside that is provided for additional context. Comments at the end of each line indicate the runtime performance cost of that code. Do not show the user the function markers or the additional context.

Here is the first line of a relevant function:

(anonymous) @ https://incendib.es/_next/static/chunks/05f6971a.1386eca4548c9a50.js:35628:16
```
(t, r, a, n, o, s, l, h, u=[]) {
```

# 3rd party summary

- name: incendib.es, main thread time: 2,263 ms, network transfer size: 329.9 kB
- name: Norton Password Manager, main thread time: 1,130 ms, network transfer size: 0 B
- name: AdGuard AdBlocker, main thread time: 105 ms, network transfer size: 0 B
- name: AdBlock: bloquea anuncios en la web, main thread time: 83 ms, network transfer size: 0 B
- name: Claude, main thread time: 3 ms, network transfer size: 0 B

# Longest tasks

- total time: 674 ms, event: (eventKey: r-56703, ts: 542787368764)
- total time: 339 ms, event: (eventKey: r-52459, ts: 542786974753)
- total time: 271 ms, event: (eventKey: r-9732, ts: 542782859189)
````

### Investigating insight LCPBreakdown

**Code executed:**
```
getInsightDetails('NAVIGATION_0', 'LCPBreakdown')
```

**Data returned:**
```
{"details":"## Insight Title: LCP breakdown\n\n## Insight Summary:\nThis insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.\n\n## Detailed analysis:\nThe Largest Contentful Paint (LCP) time for this navigation was 1,391 ms.\nThe LCP element (DIV class='mt-1.5 font-mono text-[8.5px] leading-relaxed text-fg-mute', nodeId: 69) is text and was not fetched from the network.\n\nWe can break this time down into the 2 phases that combine to make the LCP time:\n\n- Time to first byte: 71 ms (5.1% of total LCP time)\n- Element render delay: 1,319 ms (94.9% of total LCP time)\n\n## Estimated savings: none\n\n## External resources:\n- https://developer.chrome.com/docs/performance/insights/lcp-breakdown\n- https://web.dev/articles/lcp\n- https://web.dev/articles/optimize-lcp"}
```

### Investigating main thread activity: LCP render delay

**Code executed:**
```
getMainThreadTrackSummaryByLabel('lcp-render-delay')
```

**Data returned:**
```
{"summary":"# Top-down main thread summary\n\n\n## All URLs:\n\n  * 0: https://incendib.es/\n  * 1: https://incendib.es/_next/static/chunks/4bd1b696-f785427dddbba9fb.js\n  * 2: https://incendib.es/_next/static/chunks/1255-d90f22433f14e976.js\n  * 3: https://incendib.es/_next/static/chunks/949-c977a8ce241eedba.js\n  * 4: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/vendor/libs.common.js\n  * 5: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/content/cs.js\n  * 6: chrome-extension://bgnkhhnnamicmpeenaelnjfhikgbkllg/pages/content-script-end.js\n  * 7: chrome-extension://bgnkhhnnamicmpeenaelnjfhikgbkllg/pages/subscribe.js\n  * 8: chrome-extension://bgnkhhnnamicmpeenaelnjfhikgbkllg/pages/content-script-start.js\n  * 9: chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/vendor/@eyeo/webext-ad-filtering-solution/content.js\n  * 10: chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/globals-front.js\n  * 11: chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/vendor/@eyeo/webext-ad-filtering-solution/content-main.js\n  * 12: https://incendib.es/_next/static/chunks/webpack-1510015912336f54.js\n  * 13: https://incendib.es/_next/static/chunks/app/(app)/layout-502ebd46db1a1ace.js\n  * 14: https://incendib.es/_next/static/chunks/main-app-5eb0d9c55a395822.js\n  * 15: https://incendib.es/_next/static/chunks/1031-0a964c0ea9cf8fb6.js\n\n## Call tree:\n\n1;r-2598;Task;16.5;16.5;;;;\n2;r-3082;Task;156.1;0.3;;20;;\n3;r-5130;Task;11.7;11.7;;;;\n4;r-5350;Task;9;9;;;;\n5;r-5450;Task;26.1;8;;21;;\n6;r-5942;Task;11.2;1.1;;22;;\n7;r-6113;Task;67.1;7.6;;23-25;;\n8;r-6969;Task;10.6;0.5;;25;;\n9;r-7896;Task;16.3;0.3;;26;;\n10;r-8232;Task;14.9;0.2;;27;;\n11;r-8377;Task;57;1;;28;;\n12;r-9032;Task;30.8;1.1;;29;;\n13;r-9233;Task;50.3;0.1;;30;;\n14;r-9474;Task;19.6;19.6;;;;\n15;r-9732;Task;270.7;0.4;;31-33;;\n16;r-10918;Task;13.5;0.1;;33;;\n17;r-10983;Task;23;0.1;;34;;\n18;r-11148;Task;144.8;10.5;;35-38;;\n19;r-11938;Task;42.9;0.4;;38;;\n20;r-3083;Parse HTML;155.8;29.9;0;39-43;;\n21;r-5497;Run microtasks;18.1;0.2;;43;;\n22;r-5943;Parse HTML;10;10;0;;;\n23;r-6137;Recalculate style;23.6;23.6;;;;\n24;r-6425;Layout;35.9;35.9;;;;\n25;r-6971;Parse HTML;10.2;10.2;0;;;\n26;r-7897;Parse HTML;15.9;15.9;0;;;\n27;r-8234;Evaluate script;14.6;0.7;1;44-46;;\n28;r-8379;Evaluate script;56;3.2;2;46-50;;\n29;r-9036;Evaluate script;29.7;0.4;3;50-53;;\n30;r-9234;Parse HTML;50.2;5;0;53;;\n31;r-9734;Evaluate script;55.9;0.5;4;54;;\n32;r-9941;Evaluate script;214.4;0.3;5;55-57;;\n33;r-10920;Evaluate script;13.4;6;6;57;;\n34;r-10984;Evaluate script;22.9;0.3;7;58-60;;\n35;r-11151;Recalculate style;20;20;;;;\n36;r-11211;Layout;104.1;104.1;;;;\n37;r-11554;Paint;10.2;10.2;;;;\n38;r-11941;Function call;42.5;0.5;2;60;0;114475\n39;r-3118;Evaluate script;83.4;0.7;8;61-64;;\n40;r-4505;Evaluate script;18.1;0.3;9;64-66;;\n41;r-4645;Evaluate script;14.3;6.6;10;66;;\n42;r-4773;Evaluate script;10;1.3;11;67;;\n43;p-24932-12648-240-127;process;17.9;;8;68;11246;17\n44;r-8235;Compile script;6.7;6.7;1;;;\n45;r-8258;Cache script code;7.3;7.3;;;;\n46;r-8380;Compile script;8.7;8.7;2;;;\n47;p-24932-12648-793-189;(anonymous);22.7;0.7;2;69;0;0\n48;r-8616;Run microtasks;11.8;11.8;;;;\n49;r-8671;Cache script code;9.6;0;;70;;\n50;r-9037;Compile script;7.9;7.9;3;;;\n51;r-9085;Run microtasks;8.8;0.3;;71;;\n52;r-9130;Cache script code;12.5;0;;72;;\n53;r-9242;Evaluate script;45.2;4.9;0;73-75;;\n54;r-9735;Compile script;55.4;55.4;4;;;\n55;r-9942;Compile script;44.2;44.2;5;;;\n56;p-24932-12648-1397-416;(anonymous);169.9;0.5;5;75;0;0\n57;p-24932-12648-1689-889;(anonymous);7.4;;6;76;0;0\n58;r-10985;Compile script;7.2;7.2;7;;;\n59;p-24932-12648-1716-941;(anonymous);15.3;;7;77;0;0\n60;p-24932-12648-1983-397;w;42;;2;78;0;114475\n61;r-3119;Compile script;21.8;21.8;8;;;\n62;r-3650;Profiling overhead;42;42;;;;\n63;p-24932-12648-12-3;(anonymous);19;;8;79;-1;-1\n64;r-4506;Compile script;9.1;9.1;9;;;\n65;p-24932-12648-85-79;(anonymous);8.7;;9;80;0;0\n66;r-4646;Compile script;7.7;7.7;10;;;\n67;r-4774;Compile script;8.7;8.7;11;;;\n68;p-24932-12648-240-128;applyExtendedCss;17.9;0.8;8;81-83;11267;20\n69;p-24932-12648-794-190;t;22;;12;83;0;4573\n70;r-8672;Cache script code;9.6;9.6;2;;;\n71;p-24932-12648-1044-278;r;8.6;;12;84;0;43\n72;r-9131;Cache script code;12.5;12.5;3;;;\n73;r-9243;Compile script;31.1;31.1;0;;;\n74;p-24932-12648-1149-395;(anonymous);9.1;;0;85;1;15424\n75;p-24932-12648-1398-417;e;169.4;0.6;5;86;0;11\n76;p-24932-12648-1689-890;(anonymous);7.4;;6;87;0;1\n77;p-24932-12648-1716-942;(anonymous);15.3;;7;88;0;1\n78;p-24932-12648-1983-398;iX;42;;1;89;0;132690\n79;p-24932-12648-12-4;(anonymous);19;;8;90;0;1\n80;p-24932-12648-85-80;(anonymous);8.7;8.7;9;;0;1\n81;p-24932-12648-240-129;repairNativeCss;9.7;0.6;8;91;11303;26\n82;p-24932-12648-256-132;ExtendedCss;7.5;0.8;8;92;10288;13\n83;p-24932-12648-794-191;(anonymous);22;;12;93;0;212\n84;p-24932-12648-1044-323;8191;8.6;;13;94;0;10610\n85;p-24932-12648-1149-396;T;9.1;9.1;2;;0;169537\n86;p-24932-12648-1399-418;o;168.7;;5;95;0;29\n87;p-24932-12648-1689-891;(anonymous);7.4;;6;96;1398;1\n88;p-24932-12648-1716-943;(anonymous);15.3;7;7;97;3169;1\n89;p-24932-12648-1983-399;iu;42;;1;98;0;109824\n90;p-24932-12648-12-5;(anonymous);19;10.2;8;99;3409;1\n91;p-24932-12648-241-130;validateSelectors;9.1;0.7;8;100;4071;26\n92;p-24932-12648-258-134;parseRules;6.7;6.7;8;;9166;19\n93;p-24932-12648-794-192;(anonymous);22;;14;101;0;523\n94;p-24932-12648-1044-324;r;8.6;1.5;12;102;0;43\n95;p-24932-12648-1399-419;53../core/content/compromised-password/compromisedPasswordRibbon;168.7;;5;103;0;164570\n96;p-24932-12648-1689-892;__webpack_require__;7.4;;6;104;1358;28\n97;p-24932-12648-1730-944;__webpack_require__;8.3;8.3;7;;3091;28\n98;p-24932-12648-1983-400;(anonymous);42;3.4;1;105;0;109934\n99;p-24932-12648-25-6;__webpack_require__;8.8;1.9;8;106;3331;28\n100;p-24932-12648-242-131;isSelectorSupported;8.4;8.4;8;;4027;28\n101;p-24932-12648-794-193;s;22;;14;107;0;493\n102;p-24932-12648-1046-332;1124;7.1;;3;108;0;44299\n103;p-24932-12648-1399-420;(anonymous);168.7;;5;109;0;276\n104;p-24932-12648-1689-893;75126;7.4;0.3;6;110;1306;5\n105;p-24932-12648-1988-405;ik;38.6;;1;111;0;114666\n106;p-24932-12648-25-18;38796;6.9;6.9;8;;3216;5\n107;p-24932-12648-794-194;r;22;0.3;12;112;0;43\n108;p-24932-12648-1046-333;r;7.1;0.2;12;113;0;43\n109;p-24932-12648-1399-421;o;168.7;11.6;5;114-118;0;29\n110;p-24932-12648-1689-894;__webpack_require__;7.1;7.1;6;;1358;28\n111;p-24932-12648-1988-406;oq;38.6;;1;118;0;79863\n112;p-24932-12648-794-195;1666;21.6;0.6;2;119;0;23050\n113;p-24932-12648-1046-334;6681;6.9;;3;120;7;13503\n114;p-24932-12648-1399-422;34.@babel/runtime/helpers/interopRequireDefault;87.3;;5;121;0;92225\n115;p-24932-12648-1539-659;95.core-js/modules/es.array.includes.js;30.7;10.8;5;122;0;299183\n116;p-24932-12648-1591-745;33.../uiUtils;17.3;0.7;5;123;0;87853\n117;p-24932-12648-1637-827;52../../../../base-components/theme;21.8;1.6;5;124;0;139426\n118;p-24932-12648-1988-407;o_;38.6;;1;125;0;70957\n119;p-24932-12648-795-200;u;21;;2;126;0;55844\n120;p-24932-12648-1046-335;r;6.9;6.9;12;;0;43\n121;p-24932-12648-1399-423;(anonymous);87.3;;5;127;0;276\n122;p-24932-12648-1539-660;(anonymous);19.9;;5;128;0;276\n123;p-24932-12648-1591-746;(anonymous);16.6;;5;129;0;276\n124;p-24932-12648-1637-828;(anonymous);20.1;;5;130;0;276\n125;p-24932-12648-1988-408;l9;38.6;;1;131;0;50992\n126;p-24932-12648-795-201;r;21;;2;132;0;55874\n127;p-24932-12648-1399-424;o;87.3;3.3;5;133-135;0;29\n128;p-24932-12648-1539-661;o;19.9;10.8;5;135;0;29\n129;p-24932-12648-1591-747;o;16.6;6.1;5;136;0;29\n130;p-24932-12648-1637-829;o;20.1;9.9;5;137;0;29\n131;p-24932-12648-1988-1029;b;38.6;0.7;13;138;0;7076\n132;p-24932-12648-795-202;(anonymous);21;4.7;2;139;0;23173\n133;p-24932-12648-1399-425;242.../internals/add-to-unscopables;14.4;1.4;5;140;9;64975\n134;p-24932-12648-1430-523;88.jsrsasign;69.7;;5;141;0;216129\n135;p-24932-12648-1542-669;247.../modules/es.promise.all;9.1;;5;142;9;72475\n136;p-24932-12648-1598-763;27../../../../vault/vaultConstants;10.6;2.4;5;143;0;25902\n137;p-24932-12648-1653-844;2../variables/borderRadius;10.2;;5;144;0;1078\n138;p-24932-12648-1990-1032;l;37.9;37.9;15;;0;1575\n139;p-24932-12648-795-203;r;16.4;;12;145;0;43\n140;p-24932-12648-1399-426;(anonymous);13;;5;146;0;276\n141;p-24932-12648-1430-524;(anonymous);69.7;;5;147;0;216146\n142;p-24932-12648-1542-670;(anonymous);9.1;;5;148;0;276\n143;p-24932-12648-1598-764;(anonymous);8.2;;5;149;0;276\n144;p-24932-12648-1653-845;(anonymous);10.2;1.3;5;150;0;276\n145;p-24932-12648-795-204;9781;16.4;3.6;2;151;0;169103\n146;p-24932-12648-1399-427;o;13;5.8;5;152;0;29\n147;p-24932-12648-1430-525;(anonymous);69.7;;5;153;0;216159\n148;p-24932-12648-1542-671;o;9.1;9.1;5;;0;29\n149;p-24932-12648-1598-765;o;8.2;8.2;5;;0;29\n150;p-24932-12648-1653-846;o;8.9;;5;154;0;29\n151;p-24932-12648-795-205;r;12.8;12.8;12;;0;43\n152;p-24932-12648-1402-439;103.../internals/object-create;7.2;;5;155;9;7204\n153;p-24932-12648-1430-526;(anonymous);69.7;3.4;5;156-158;0;216171\n154;p-24932-12648-1653-847;16../themes;8.9;0.7;5;158;0;17236\n155;p-24932-12648-1402-440;(anonymous);7.2;;5;159;0;276\n156;p-24932-12648-1433-529;(anonymous);47.5;;5;160;0;276\n157;p-24932-12648-1516-624;a;18.8;;5;161;0;227519\n158;p-24932-12648-1653-848;(anonymous);8.2;;5;162;0;276\n159;p-24932-12648-1402-441;o;7.2;7.2;5;;0;29\n160;p-24932-12648-1433-530;o;47.5;3.1;5;163-165;0;29\n161;p-24932-12648-1516-625;(anonymous);18.8;;5;165;0;227542\n162;p-24932-12648-1653-849;o;8.2;;5;166;0;29\n163;p-24932-12648-1433-531;i;18.5;;4;167;0;36\n164;p-24932-12648-1471-531;i;25.9;4.2;4;168;0;36\n165;p-24932-12648-1516-626;(anonymous);18.8;0.7;5;169;0;281455\n166;p-24932-12648-1653-850;20../dark;8.2;;5;170;0;22070\n167;p-24932-12648-1433-532;require.node-forge../aes;18.5;;4;171;32;233929\n168;p-24932-12648-1477-591;require.jsrsasign.buffer;21.7;2.4;4;172;9;287659\n169;p-24932-12648-1517-627;n;18.1;;5;173;0;227555\n170;p-24932-12648-1653-851;(anonymous);8.2;;5;174;0;276\n171;p-24932-12648-1433-533;(anonymous);18.5;;4;175;0;283\n172;p-24932-12648-1481-600;(anonymous);19.3;;4;176;9;287676\n173;p-24932-12648-1517-628;./source/BfwCSInternals.js;18.1;;5;177;0;227685\n174;p-24932-12648-1653-852;o;8.2;1.6;5;178;0;29\n175;p-24932-12648-1433-534;i;18.5;5.4;4;179;0;36\n176;p-24932-12648-1481-601;(anonymous);19.3;19.3;4;;9;287689\n177;p-24932-12648-1517-629;n;18.1;;5;180-182;0;227555\n178;p-24932-12648-1653-853;18../light;6.6;6.6;5;;0;19936\n179;p-24932-12648-1437-544;require.6../aes;13.1;;4;182;9;4767\n180;p-24932-12648-1517-630;./source/BfwLogger.js;11.3;;5;183;0;241153\n181;p-24932-12648-1531-647;./source/BfwClipboard.js;6.9;6.9;5;;0;230724\n182;p-24932-12648-1437-545;(anonymous);13.1;;4;184;0;283\n183;p-24932-12648-1517-631;n;11.3;0.6;5;185;0;227555\n184;p-24932-12648-1437-546;i;13.1;0.6;4;186;0;36\n185;p-24932-12648-1518-632;./source/telemetry/BfwTelemetryWrapper.js;10.6;;5;187;0;254892\n186;p-24932-12648-1438-547;require.43../asn1;12.5;;4;188;9;188656\n187;p-24932-12648-1518-633;n;10.6;10.6;5;;0;227555\n188;p-24932-12648-1438-548;(anonymous);12.5;;4;189;0;283\n189;p-24932-12648-1438-549;i;12.5;2.3;4;190;0;36\n190;p-24932-12648-1443-555;require.32../asn1;10.2;0.7;4;191;9;141552\n191;p-24932-12648-1443-556;(anonymous);9.5;;4;192;0;283\n192;p-24932-12648-1443-557;i;9.5;2.4;4;193;0;36\n193;p-24932-12648-1444-558;require.25../aes;7.1;;4;194;9;88968\n194;p-24932-12648-1444-559;(anonymous);7.1;;4;195;0;283\n195;p-24932-12648-1444-560;i;7.1;7.1;4;;0;36\n\nIMPORTANT: Never show eventKey to the user.\n\nThe following are markdown block(s) of code that ran in the page, each representing a separate function. <FUNCTION_START> and <FUNCTION_END> marks the exact function declaration, and everything outside that is provided for additional context. Comments at the end of each line indicate the runtime performance cost of that code. Do not show the user the function markers or the additional context.\n\nHere is the first line of a relevant function:\n\n(anonymous) @ https://incendib.es/_next/static/chunks/1031-0a964c0ea9cf8fb6.js:83:12\n```\n(e) {\n```\n\n# Bottom-up main thread summary\n\nThis is the bottom-up summary for the entire trace. Only the top 20 activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). \"Self time\" represents the aggregated time spent directly in an activity, across all occurrences. \"Total time\" represents the aggregated time spent in an activity or any of its children.\n\n- self: 230 ms, total: 230 ms, source: Compile script\n- self: 140 ms, total: 140 ms, source: Layout\n- self: 104 ms, total: 1,075 ms, source: Task\n- self: 50 ms, total: 242 ms, source: Parse HTML\n- self: 45 ms, total: 45 ms, source: Recalculate style\n- self: 42 ms, total: 42 ms, source: Profiling overhead\n- self: 39 ms, total: 39 ms, source: Cache script code\n- self: 38 ms, total: 38 ms, source: l (url: https://incendib.es/_next/static/chunks/1031-0a964c0ea9cf8fb6.js, line: 0, column: 1575)\n- self: 28 ms, total: 169 ms, source: o (url: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/content/cs.js, line: 0, column: 29)\n- self: 16 ms, total: 44 ms, source: i (url: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/vendor/libs.common.js, line: 0, column: 36)\n- self: 13 ms, total: 615 ms, source: Evaluate script\n- self: 11 ms, total: 11 ms, source: Paint\n- self: 10 ms, total: 65 ms, source: Function call (url: chrome-extension://bgnkhhnnamicmpeenaelnjfhikgbkllg/pages/content-script-start.js, line: 1129, column: 41)\n- self: 10 ms, total: 10 ms, source: Minor GC\n- self: 9 ms, total: 19 ms, source: (anonymous) (url: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/vendor/libs.common.js, line: 9, column: 287689)\n- self: 9 ms, total: 9 ms, source: T (url: https://incendib.es/_next/static/chunks/1255-d90f22433f14e976.js, line: 0, column: 169537)\n- self: 8 ms, total: 8 ms, source: isSelectorSupported (url: chrome-extension://bgnkhhnnamicmpeenaelnjfhikgbkllg/pages/content-script-start.js, line: 4027, column: 28)\n- self: 6 ms, total: 6 ms, source: Commit\n- self: 6 ms, total: 7 ms, source: t.exports (url: chrome-extension://admmjipmmciaobhojoghlmleefbicajg/content/cs.js, line: 9, column: 18191)\n- self: 6 ms, total: 10 ms, source: (anonymous) (url: https://incendib.es/_next/static/chunks/1255-d90f22433f14e976.js, line: 0, column: 150290)\n\n# Third parties\n\n- name: Norton Password Manager, main thread time: 269 ms, network transfer size: 0 B\n- name: incendib.es, main thread time: 266 ms, network transfer size: 193.1 kB\n- name: AdGuard AdBlocker, main thread time: 99 ms, network transfer size: 0 B\n- name: AdBlock: bloquea anuncios en la web, main thread time: 52 ms, network transfer size: 0 B\n- name: Image Downloader - Save pictures, main thread time: 0.7 ms, network transfer size: 0 B\n\n# Related insights\n\nHere are all the insights that contain some related event from the main thread in the given range.\n\n- DOMSize: Layout (eventKey: r-11211, ts: 542783189788)\n- ThirdParties: Evaluate script (eventKey: r-3118, ts: 542782311820), Compile script (eventKey: r-3119, ts: 542782311860), ScriptCatchup (eventKey: r-3466, ts: 542782323394), ScriptCatchup (eventKey: r-4220, ts: 542782369348), (anonymous) (eventKey: p-24932-12648-12-3, ts: 542782376220.99994)\n- ForcedReflow: Layout (eventKey: r-6425, ts: 542782558783)"}
```

### Answer

Analysis of the trace reveals two primary performance issues affecting the page's Largest Contentful Paint (LCP) and initial responsiveness.

### 1. High LCP Render Delay
The LCP for this page is 1,391 ms. While the Time to First Byte (TTFB) is very fast (71 ms), **95% of the LCP time (1,319 ms)** is spent in "render delay." This means the browser had the data but was blocked from actually painting the LCP element.

**Root Causes**:
*   **Third-Party Extensions**: A significant portion of the main thread during the LCP phase is consumed by browser extensions. For example, [Norton Password Manager](#r-9941) and [AdBlock](#r-3118) execute heavy scripts and "Compile script" tasks that total hundreds of milliseconds before the first paint.
*   **Main Thread Contention**: Large JavaScript bundles from the site itself, such as [1255-d90f22433f14e976.js](#r-8379) and [949-c977a8ce241eedba.js](#r-9036), contribute to long [Tasks](#r-9732) that delay the browser's ability to process layout and paint.
*   **Render-Blocking CSS**: The stylesheet [fa107ce3cbf43c9d.css](#s-2860) is render-blocking, meaning the browser cannot paint anything until it is fully downloaded and parsed.

**Suggestions**:
*   **Inline Critical CSS**: Move the styles required for the LCP element and above-the-fold content directly into the `<head>` of the HTML to eliminate the network delay for the CSS file.
*   **Optimize Script Execution**: Use `defer` or `async` for non-critical scripts to ensure they don't block the initial render.
*   **Minimize Extension Impact**: While you cannot control user extensions, testing in "Incognito" mode can help you isolate how much of the delay is caused by your own code versus external tools.

### 2. Excessive Main Thread Work (Long Tasks)
Multiple "Long Tasks" (tasks exceeding 50 ms) occur during the load, which can lead to a sluggish user experience and delayed rendering.

**Root Causes**:
*   **Script Compilation and Evaluation**: The browser spends over 230 ms just [compiling scripts](#r-9735). This is often a result of shipping too much JavaScript at once.
*   **Layout and Style Recalculation**: A large [Layout](#r-11211) task (104 ms) occurs shortly before the LCP, triggered by script execution that modifies the DOM.

**Suggestions**:
*   **Code Splitting**: Break down large JavaScript bundles into smaller, page-specific chunks using dynamic imports to reduce the amount of code the browser must compile upfront.
*   **Reduce DOM Size**: The [DOMSize](#NAVIGATION_0) insight indicates a large DOM tree. Simplifying your HTML structure will speed up [Layout](#r-11211) and [Recalculate style](#r-11151) operations.