window.OSavePresentation = {
  presentationDate: "16 July 2026",
  videoSrc: "",
  companies: {
    rooch: { title: "ROOCH Holding Inc.", category: "Holding company", logo: "assets/logos/rooch.png", description: "The strategic center coordinating capital, governance and cross-company execution for the O!Save partnership.", points: ["Group strategy and capital stewardship", "Integrated operating governance", "Commercial partnership management"] },
    vertex: { title: "Vertex Technologies", category: "Technology and solutions", logo: "assets/logos/vertex.png", description: "Enterprise systems connecting procurement, inventory, manufacturing, logistics and financial reporting.", points: ["VOS ERP and consolidated reporting", "Sales-force and distribution visibility", "Workflow automation and controls"] },
    hanvin: { title: "Hanvin Construction", category: "Infrastructure and energy", logo: "assets/logos/hanvin.png", description: "Builds and upgrades the physical facilities required for scalable, energy-efficient operations.", points: ["Warehouses and operating facilities", "Solar and energy infrastructure", "Expansion project delivery"] },
    men2: { title: "MEN2 Enterprise", category: "FMCG distribution", logo: "assets/logos/men2.png", description: "Regional distribution and logistics execution across North and South operating divisions.", points: ["Warehouse and route operations", "Dealer and key-account fulfillment", "Nationwide distribution coordination"] },
    mama: { title: "Mama Pina's", category: "Food manufacturing", logo: "assets/logos/mama-pina.png", description: "Consumer food manufacturing focused on scalable Bihon and Canton production for recurring retail demand.", points: ["Pancit production and quality control", "Expanded day and night shifts", "Multi-SKU production capability"] },
    jcbs: { title: "JCBS Industrial", category: "Edible-oil manufacturing", logo: "assets/logos/jcbs.png", description: "Manufactures palm and canola oil formats aligned with O!Save's regional volume requirements.", points: ["Palm Oil 350mL and 1L", "Canola Oil 1L", "Capacity expansion and import-cycle execution"] }
  },
  achievements: [
    { category: "Technology", title: "VOS ERP Suite", description: "Consolidated accounting, inventory and operational control across the group.", image: "assets/achievements/vos-erp.png" },
    { category: "Technology", title: "Dealerover Sync", description: "Stock matching, dispatch coordination and dealer-facing operating visibility.", image: "assets/achievements/dealerover.jpg" },
    { category: "Technology", title: "eLGU Digitalization", description: "Municipal treasury, tax and permit workflows delivered through Vertex systems.", image: "assets/achievements/elgu.jpg" },
    { category: "Infrastructure", title: "LGU Mapandan Solar", description: "Solar-grid deployment demonstrating the group's infrastructure capability.", image: "assets/achievements/mapandan.jpg" },
    { category: "FMCG", title: "Foodsphere Frozen", description: "Regional frozen-goods distribution execution across MEN2 operations.", image: "assets/achievements/foodsphere.jpg" },
    { category: "FMCG", title: "Sea Oil Engagement", description: "Industrial and retail supply engagement supporting the edible-oil growth platform.", image: "assets/achievements/sea-oil.jpg" }
  ],
  oilDemand: [
    ["Plaridel, Bulacan", 6888], ["Pampanga Province", 4980], ["Naga & Kawit, Cavite", 4320],
    ["Villasis, Pangasinan", 3840], ["Meycauayan, Bulacan", 3408], ["Nueva Ecija", 3360], ["Taytay, Rizal", 840]
  ],
  pancitWarehouses: [
    ["PLR", "Plaridel", 35714], ["PMP", "Pampanga", 35714], ["NAG", "Naga & Kawit", 35714],
    ["VIL", "Villasis", 35714], ["MEY", "Meycauayan", 35714], ["NVE", "Nueva Ecija", 35714], ["TAY", "Taytay", 35716]
  ],
  oilCapacity: [
    { label: "Palm Oil 350mL", growth: "+336%", current: [12600, 7200, 19800, 594000], expanded: [43200, 43200, 86400, 2592000] },
    { label: "Palm Oil 1L", growth: "+157%", current: [4800, 3600, 8400, 252000], expanded: [10800, 10800, 21600, 648000] },
    { label: "Canola Oil 1L", growth: "+157%", current: [4800, 3600, 8400, 252000], expanded: [10800, 10800, 21600, 648000] }
  ],
  oilCycle: [["Purchase order", "5d"], ["Weekly shipment", "7d"], ["Warehouse", "8d"], ["Production", "1d"], ["Delivery to O!Save", "3d"], ["Collection", "45d"]],
  pancitCycle: [["Bulk purchase", "Quarterly"], ["Warehouse", "Materials"], ["Production", "Daily"], ["Delivery", "Daily"], ["O!Save sales", "Retail"], ["Collection", "45d"], ["Reinvestment", "Repeat"]]
};
