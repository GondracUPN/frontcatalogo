const assert = require("node:assert/strict");
const path = require("node:path");
const { build } = require("esbuild");

async function compile(entry, mockSource) {
  const result = await build({
    entryPoints: [path.resolve(__dirname, "..", entry)],
    bundle: true, platform: "node", format: "cjs", write: false,
    packages: "external", jsx: "automatic",
    plugins: [{ name: "fixtures", setup(builder) {
      builder.onResolve({ filter: /^(next\/|\.|@\/)/ }, ({ path: name }) => ({ path: name, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: name }) => ({ contents: mockSource(name) }));
    } }],
  });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(require, compiled, compiled.exports);
  return compiled.exports;
}

async function main() {
  const originalFetch = global.fetch;
  const state = { events: [], fail: false, catalog: null };
  global.__salesPublicationTest = state;
  try {
    const actions = await compile("app/actions.ts", (name) => {
      if (name === "next/headers") return 'exports.cookies=async()=>({get:()=>({value:"test-token"})});';
      if (name === "next/navigation") return 'exports.redirect=()=>{throw Error("redirect")};';
      return `exports.revalidateTag=value=>global.__salesPublicationTest.events.push(["tag",value]);
        exports.revalidatePath=value=>global.__salesPublicationTest.events.push(["path",value]);`;
    });
    global.fetch = async (_url, options) => {
      state.events.push(["saved", JSON.parse(options.body)]);
      return state.fail ? new Response("fixture failure", { status: 500 }) : Response.json({ ok: true, item: {} });
    };
    const mutations = [
      () => actions.markProductSold("product", "2026-10-24", 100, { name: "Test", phone: "900000000" }),
      () => actions.markStagedProductSold("staged", "2026-10-24", 100, { name: "Test", phone: "900000000" }),
      () => actions.markPossibleClientPurchased("client", { customerKind: "tranquilo", salePlaceType: "almacen" }),
      () => actions.updateSaleClientPhoto("sale", { clientPhotoUrl: "/clientes/test.jpg" }),
      () => actions.updateSaleClientPhoto("sale", { public: false }),
      () => actions.updateSaleClientPhoto("sale", { remove: true }),
      () => actions.updateSale("sale", { saleDate: "2026-10-23" }),
      () => actions.unsellProduct("product", "sale"),
    ];
    for (const mutate of mutations) {
      state.events = [];
      await mutate();
      assert.equal(state.events[0][0], "saved", "Invalidate only after saving");
      for (const expected of [["tag", "client-purchases"], ["path", "/"], ["path", "/clientes"]]) {
        assert.ok(state.events.some((event) => event[0] === expected[0] && event[1] === expected[1]));
      }
      state.events = [];
      state.fail = true;
      try { await mutate(); } catch { /* Some actions throw; sale actions return ok:false. */ }
      assert.deepEqual(state.events.map((event) => event[0]), ["saved"], "Failed saves must not invalidate");
      state.fail = false;
    }

    const { default: Home } = await compile("app/page.tsx", (name) => {
      if (name === "./actions") return `exports.getClientPurchases=async()=>[];
        exports.getHomeCatalog=async()=>global.__salesPublicationTest.catalog;`;
      return `exports.default=()=>null; exports.ClientDeliveriesHome=()=>null; exports.FaqEntry=()=>null;
        exports.FAQ_ITEMS=[]; exports.HOME_FAQ_IDS=[]; exports.CATEGORY_LABELS={};
        exports.BrandHeading=()=>null; exports.LeafMark=()=>null; exports.StoreFeatureCard=()=>null;
        exports.batteryLine=()=>""; exports.specLine=()=>""; exports.formatSoles=String; exports.withIgv=value=>value;
        exports.WHATSAPP_DISPLAY=""; exports.whatsappUrl=()=>"";`;
    });
    function findRecent(node) {
      if (!node || typeof node !== "object") return null;
      if (node.props?.["aria-labelledby"] === "latest-title") return node;
      for (const child of require("react").Children.toArray(node.props?.children)) {
        const found = findRecent(child);
        if (found) return found;
      }
      return null;
    }
    for (const count of [0, 3, 4, 8]) {
      const items = Array.from({ length: count }, (_, index) => ({ slug: `recent-${index}`, title: `Mac ${index}`, image: "/test.jpg", stock: 1, price: 100 }));
      state.catalog = { items, featured: items.slice(0, 4), promotions: [], categories: [], budgets: [] };
      const recent = findRecent(await Home());
      assert.ok(recent);
      const grid = recent.props.children.props.children[1];
      const cards = grid.type === "ul" ? grid.props.children : [];
      assert.deepEqual(cards.map((card) => card.props.children.props.unit.slug), items.slice(0, 4).map((item) => item.slug));
    }
    console.log("sales-publication ok: successful/failed saves, photo visibility, four latest cards including featured/vitrina overlap, limited inventory");
  } finally {
    global.fetch = originalFetch;
    delete global.__salesPublicationTest;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
