const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { build } = require("esbuild");
const { chromium } = require("@playwright/test");

async function main() {
  const root = path.resolve(__dirname, "..");
  const folder = path.resolve(
    root,
    "../docs/evidencias/ventas-vendedores-2026-10-20",
  );
  await fs.mkdir(folder, { recursive: true });
  const actions = `const request=async(name,args)=>{try{const response=await fetch('/fixture/'+name+'?'+new URLSearchParams({from:args[0]||'',to:args[1]||'',owner:args[name==='salesStockAction'?0:2]||'macsomenos',group:args[3]||'day'}));return{ok:response.ok,data:await response.json()}}catch{return{ok:false,error:'Fallo de prueba'}}};
    ${["salesSummaryAction", "salesTimelineAction", "salesProductsAction", "salesChannelsAction", "salesStockAction", "sellersAction"].map((name) => `export const ${name}=(...args)=>request('${name}',args);`).join("\n")}
    ${["overviewAction", "productsAction", "searchesAction", "funnelAction", "sourcesAction"].map((name) => `export const ${name}=async()=>({ok:false,error:'La analítica del sitio se verifica en su suite propia'});`).join("\n")}`;
  const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Dashboard from './app/servmacso10/analisis/AnalyticsDashboard';const admin=location.pathname.includes('admin');createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-7xl min-w-0 p-3 sm:p-6"><h1 className="mb-5 text-2xl font-semibold">{admin?'Análisis':'Mis ventas'}</h1><Dashboard isAdmin={admin}/></main>);`;
  const bundle = await build({
    stdin: {
      contents: entry,
      loader: "tsx",
      sourcefile: "sales-fixture.tsx",
      resolveDir: root,
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "actions-fixture",
        setup(builder) {
          builder.onResolve({ filter: /^\.\/actions$/ }, () => ({
            path: "actions",
            namespace: "fixture",
          }));
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: actions,
          }));
        },
      },
    ],
  });
  const css = await require("postcss")([
    require("@tailwindcss/postcss")({ base: root }),
  ]).process('@import "tailwindcss";', {
    from: path.join(root, "app/globals.css"),
  });
  const metric = (current, previous) => ({
    current,
    previous,
    change: previous ? ((current - previous) / previous) * 100 : null,
  });
  const sellers = [
    {
      owner_id: 7,
      username: "Vendedor Ana",
      sales: 2,
      revenue: 1500,
      average_ticket: 750,
      active: 3,
      last_sale: "2026-10-20T15:00:00Z",
      change: 50,
    },
    {
      owner_id: 8,
      username: "Vendedor Luis",
      sales: 4,
      revenue: 8000,
      average_ticket: 2000,
      active: 6,
      last_sale: "2026-10-20T17:00:00Z",
      change: -10,
    },
  ];
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/bundle.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(bundle.outputFiles[0].contents);
      return;
    }
    if (url.pathname === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(css.css);
      return;
    }
    if (url.pathname.startsWith("/fixture/")) {
      const name = url.pathname.split("/").at(-1);
      calls.push({ name, owner: url.searchParams.get("owner") });
      const owner = url.searchParams.get("owner"),
        amount = owner === "8" ? 8000 : owner === "all" ? 9500 : 1500;
      const payloads = {
        salesSummaryAction: {
          sales: metric(2, 1),
          revenue: metric(amount, 1000),
          revenueUsd: metric(250, 0),
          averageTicket: metric(amount / 2, 500),
          requests: metric(4, 3),
          conversion: metric(50, 33),
          exchangeRateCoverage: { sales: 1, total: 2 },
          conversionDefinition: "Solicitudes entregadas / solicitudes creadas.",
          marginReason: "Sin costo histórico por venta.",
        },
        salesTimelineAction: {
          items: [
            { bucket: "2026-10-18T00:00", sales: 1, revenue: 500 },
            { bucket: "2026-10-19T00:00", sales: 0, revenue: 0 },
            { bucket: "2026-10-20T00:00", sales: 1, revenue: amount - 500 },
          ],
        },
        salesProductsAction: {
          items: [
            {
              model: "iPhone de prueba",
              category: "iphone",
              units: 2,
              revenue: amount,
              average_days_to_sale: null,
              dated_sales: 0,
            },
          ],
        },
        salesChannelsAction: {
          items: [
            {
              place_type: "almacen",
              location: "Sin especificar",
              customer_kind: "tranquilo",
              sales: 2,
              revenue: amount,
            },
          ],
        },
        salesStockAction: {
          active: 3,
          averageAgeDays: 42,
          over30: 2,
          over60: 1,
          ageDefinition: "Antigüedad desde el alta en inventario.",
          items: [
            {
              id: "fixture-1",
              title: "MacBook Pro de prueba",
              sku: "SYNTHETIC-01",
              age_days: 62,
              created_at: "2026-08-19T15:00:00Z",
            },
          ],
        },
        sellersAction: { items: sellers },
      };
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(payloads[name] || {}));
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!DOCTYPE html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      calls.length = 0;
      await page.goto(base + "/seller");
      await page.getByText("Inventario publicado", { exact: true }).waitFor();
      assert.deepEqual(await page.getByRole("tab").allTextContents(), [
        "Mis ventas",
      ]);
      assert.equal(
        await page.getByLabel("Ventas de", { exact: true }).count(),
        0,
      );
      assert.equal(
        calls.some((call) => call.name === "sellersAction"),
        false,
        "seller does not request other sellers",
      );
      assert.ok(!(await page.textContent("body")).includes("Vendedor Luis"));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `seller ${width} overflow`,
      );
      await page.screenshot({
        path: path.join(folder, `mis-ventas-${width}.png`),
        fullPage: true,
      });
      await page.goto(base + "/admin");
      await page.getByRole("tab", { name: "Vendedores", exact: true }).click();
      await page
        .getByRole("heading", { name: "Ventas por vendedor", exact: true })
        .waitFor();
      await page.getByRole("button", { name: /^Vendedor Ana/ }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `admin ${width} overflow`,
      );
      await page.screenshot({
        path: path.join(folder, `vendedores-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: /^Vendedor Ana/ }).click();
      await page.getByText("Inventario publicado", { exact: true }).waitFor();
      assert.equal(
        await page.getByLabel("Ventas de", { exact: true }).inputValue(),
        "7",
      );
      assert.ok(
        calls.some(
          (call) => call.name === "salesSummaryAction" && call.owner === "7",
        ),
      );
      await page.getByLabel("Ventas de", { exact: true }).selectOption("all");
      await page.waitForFunction(
        () =>
          document.body.textContent.includes("9,500.00") ||
          document.body.textContent.includes("9500.00"),
      );
      await page.screenshot({
        path: path.join(folder, `ventas-admin-${width}.png`),
        fullPage: true,
      });
    }
    await page.route("**/fixture/salesSummaryAction?*", async (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          sales: metric(0, 0),
          revenue: metric(0, 0),
          revenueUsd: metric(0, 0),
          averageTicket: metric(0, 0),
          requests: metric(0, 0),
          conversion: metric(0, 0),
          exchangeRateCoverage: { sales: 0, total: 0 },
          conversionDefinition: "Sin solicitudes",
          marginReason: "No disponible",
        }),
      }),
    );
    await page.goto(base + "/seller");
    await page
      .getByText("Aún no tienes ventas en este periodo", { exact: true })
      .waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    await fs.writeFile(
      path.join(folder, "ui-results.json"),
      JSON.stringify(
        {
          viewports: [375, 768, 1440],
          sellerTabs: ["Mis ventas"],
          adminSellerDrilldown: true,
          consolidatedOwner: true,
          emptyState: true,
          pageErrors: errors,
          transport:
            "isolated fixtures; backend permissions and SQL tested separately",
        },
        null,
        2,
      ),
    );
    console.log(
      "test-seller-analytics.js ok: Mis ventas / Vendedores / Ventas, responsive 375/768/1440, owner drilldown, empty state",
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
