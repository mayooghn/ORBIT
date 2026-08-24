import { DigitalTwinGraphModel, type DigitalTwinEdgeInput, type DigitalTwinNodeInput, type DigitalTwinSourceReference } from './model';

const EIA_HORMUZ_URL = 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints';
const ISPRL_ANNUAL_REPORT_URL = 'https://isprlindia.com/downloads/annual-reports/Annual_Report_Final_2025_Revised_English.pdf';
const PPAC_REFINERY_URL = 'https://ppac.gov.in/infrastructure/installed-refinery-capacity';
const IOCL_CRUDE_PIPELINES_URL = 'https://iocl.com/crude-oil-pipelines';
const IOCL_HALDIA_PORT_URL = 'https://ioclfiles.iocl.com/Refineries_Technology_with_ecology/files/basic-html/page127.html';
const RIL_SIKKA_PORT_URL = 'https://www.ril.com/ar2016-17/pdf/RIL-Integrated-AR-2016-17.pdf';
const VISAKHAPATNAM_PORT_HPCL_URL = 'https://vizagport.com/wp-content/uploads/2018/07/BPofVPT.pdf';
const NEWS_ON_AIR_MUMBAI_HORMUZ_URL = 'https://newsonair.gov.in/oil-tanker-carrying-crude-oil-reaches-mumbai-after-transiting-strait-of-hormuz/';
const IOCL_VADINAR_IRAQ_CRUDE_URL = 'https://www.iocl.com/NewsDetails/59337';

const EIA_ORGANIZATION = 'U.S. Energy Information Administration';
const ISPRL_ORGANIZATION = 'Indian Strategic Petroleum Reserves Limited';
const PPAC_ORGANIZATION = 'Petroleum Planning & Analysis Cell, Government of India';
const IOCL_ORGANIZATION = 'Indian Oil Corporation Limited';
const RIL_ORGANIZATION = 'Reliance Industries Limited';
const VISAKHAPATNAM_PORT_ORGANIZATION = 'Visakhapatnam Port Authority';
const NEWS_ON_AIR_ORGANIZATION = 'Akashvani / News On AIR, Government of India';

const externalReference = (id: string): DigitalTwinSourceReference => ({ table: 'external_source', id });

const PORT_REFINERY_RELATIONSHIPS: readonly DigitalTwinEdgeInput[] = [
  {
    edgeId: 'relationship-port-kochi-refinery-bpc',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-ad5b2e8e77d8e4fc7a4c',
    toNodeId: 'refinery-refinery-ae548d16e9f8e503e505',
    sourceReferences: [
      { table: 'ports', id: 'port-ad5b2e8e77d8e4fc7a4c' },
      { table: 'refineries', id: 'refinery-ae548d16e9f8e503e505' },
    ],
    evidence: 'The Phase 2 World Port Index record is Kochi (Cochin) and the Phase 2 refinery record is BPC, Kochi.',
    notes: 'Exact shared facility-location label; no relationship capacity or flow inferred.',
    confidence: 0.95,
  },
  {
    edgeId: 'relationship-port-new-mangalore-refinery-mrpl',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-faee4b72dfaea88f350c',
    toNodeId: 'refinery-refinery-2e0d4ad0d99de43e1e73',
    sourceReferences: [
      { table: 'ports', id: 'port-faee4b72dfaea88f350c' },
      { table: 'refineries', id: 'refinery-2e0d4ad0d99de43e1e73' },
    ],
    evidence: 'The Phase 2 World Port Index record is New Mangalore and the Phase 2 refinery record is MRPL, Mangalore.',
    notes: 'Exact shared facility-location label; no relationship capacity or flow inferred.',
    confidence: 0.95,
  },
  {
    edgeId: 'relationship-port-paradip-refinery-ioc',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-0d287d6b94ae0d13cfff',
    toNodeId: 'refinery-refinery-d6474b2cf97a887365fc',
    sourceReferences: [
      { table: 'ports', id: 'port-0d287d6b94ae0d13cfff' },
      { table: 'refineries', id: 'refinery-d6474b2cf97a887365fc' },
    ],
    evidence: 'The Phase 2 World Port Index record is Paradip and the Phase 2 refinery record is IOC, Paradip.',
    notes: 'Exact shared facility-location label; no relationship capacity or flow inferred.',
    confidence: 0.95,
  },
  {
    edgeId: 'relationship-port-vadinar-refinery-nel',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-42e3af128436239dad1c',
    toNodeId: 'refinery-refinery-1e0404fa69bfd51b09d2',
    sourceReferences: [
      { table: 'ports', id: 'port-42e3af128436239dad1c' },
      { table: 'refineries', id: 'refinery-1e0404fa69bfd51b09d2' },
    ],
    evidence: 'The Phase 2 World Port Index record is Vadinar Terminal and the Phase 2 refinery record is NEL, Vadinar.',
    notes: 'Exact shared facility-location label; no relationship capacity or flow inferred.',
    confidence: 0.95,
  },
];

const PHASE_37_NODES: readonly DigitalTwinNodeInput[] = [
  {
    nodeId: 'strategic-reserve-isprl-mangalore',
    nodeType: 'strategic_reserve',
    name: 'ISPRL Mangalore Strategic Reserve',
    description: 'ISPRL strategic crude reserve at Mangalore.',
    sourceUrl: ISPRL_ANNUAL_REPORT_URL,
    sourceOrganization: ISPRL_ORGANIZATION,
    confidence: 0.99,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
    metadata: { documentedStatus: 'commissioned' },
  },
  {
    nodeId: 'strategic-reserve-isprl-padur',
    nodeType: 'strategic_reserve',
    name: 'ISPRL Padur Strategic Reserve',
    description: 'ISPRL strategic crude reserve at Padur near Udupi.',
    sourceUrl: ISPRL_ANNUAL_REPORT_URL,
    sourceOrganization: ISPRL_ORGANIZATION,
    confidence: 0.99,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
    metadata: { documentedStatus: 'commissioned' },
  },
  {
    nodeId: 'strategic-reserve-isprl-visakhapatnam',
    nodeType: 'strategic_reserve',
    name: 'ISPRL Visakhapatnam Strategic Reserve',
    description: 'ISPRL strategic crude reserve at Visakhapatnam.',
    sourceUrl: ISPRL_ANNUAL_REPORT_URL,
    sourceOrganization: ISPRL_ORGANIZATION,
    confidence: 0.99,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
    metadata: { documentedStatus: 'commissioned' },
  },
  {
    nodeId: 'chokepoint-strait-of-hormuz',
    nodeType: 'chokepoint',
    name: 'Strait of Hormuz',
    description: 'Major oil chokepoint connecting the Persian Gulf with the Gulf of Oman and Arabian Sea.',
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.99,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedRole: 'major oil chokepoint' },
  },
  {
    nodeId: 'chokepoint-strait-of-malacca',
    nodeType: 'chokepoint',
    name: 'Strait of Malacca',
    description: 'Asian maritime oil chokepoint linking the Indian Ocean and Pacific Ocean.',
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.99,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedRole: 'major Asian oil chokepoint' },
  },
  {
    nodeId: 'shipping-route-persian-gulf-hormuz-arabian-sea',
    nodeType: 'shipping_route',
    name: 'Persian Gulf-Strait of Hormuz-Arabian Sea Maritime Route',
    description: 'Documented maritime oil flow corridor from the Persian Gulf through Hormuz toward the Gulf of Oman and Arabian Sea.',
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.96,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedFlow: 'Persian Gulf to Gulf of Oman and Arabian Sea' },
  },
  {
    nodeId: 'shipping-route-middle-east-malacca-asia',
    nodeType: 'shipping_route',
    name: 'Middle East-Strait of Malacca-Asia Maritime Route',
    description: 'Documented maritime oil route from Middle East suppliers through the Strait of Malacca toward Asian markets.',
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.96,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedFlow: 'Middle East suppliers to East and Southeast Asia' },
  },
  {
    nodeId: 'shipping-route-hormuz-india',
    nodeType: 'shipping_route',
    name: 'Strait of Hormuz-India Crude Flow',
    description: 'India-facing crude flow represented by EIA reporting on Asian destinations of crude transiting Hormuz.',
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    confidence: 0.92,
    operationalState: 'operational',
    stateSource: 'BASELINE',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    metadata: { documentedDestination: 'India among major Asian destinations' },
  },
];

const PORT_REFINERY_COVERAGE_RELATIONSHIPS: readonly DigitalTwinEdgeInput[] = [
  {
    edgeId: 'relationship-port-paradip-refinery-ioc-haldia',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-0d287d6b94ae0d13cfff',
    toNodeId: 'refinery-refinery-3ebbfa8bfe4fcd853090',
    sourceReferences: [
      { table: 'ports', id: 'port-0d287d6b94ae0d13cfff' },
      { table: 'refineries', id: 'refinery-3ebbfa8bfe4fcd853090' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Paradip-Haldia-Barauni crude pipeline originating at Paradip and supplying the Haldia refinery.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
  {
    edgeId: 'relationship-port-paradip-refinery-ioc-barauni',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-0d287d6b94ae0d13cfff',
    toNodeId: 'refinery-refinery-ddcb7bc1d2c3587e0206',
    sourceReferences: [
      { table: 'ports', id: 'port-0d287d6b94ae0d13cfff' },
      { table: 'refineries', id: 'refinery-ddcb7bc1d2c3587e0206' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Paradip-Haldia-Barauni crude pipeline originating at Paradip and supplying the Barauni refinery.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
  {
    edgeId: 'relationship-port-paradip-refinery-ioc-bongaigaon',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-0d287d6b94ae0d13cfff',
    toNodeId: 'refinery-refinery-06fc3ae96e93b92f091f',
    sourceReferences: [
      { table: 'ports', id: 'port-0d287d6b94ae0d13cfff' },
      { table: 'refineries', id: 'refinery-06fc3ae96e93b92f091f' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Paradip-Haldia-Barauni crude pipeline originating at Paradip and supplying Bongaigaon through the Barauni pipeline system.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.96,
  },
  {
    edgeId: 'relationship-port-mundra-refinery-ioc-panipat',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-cf886631046b9485fcf9',
    toNodeId: 'refinery-refinery-6ed0770ba002c7137ead',
    sourceReferences: [
      { table: 'ports', id: 'port-cf886631046b9485fcf9' },
      { table: 'refineries', id: 'refinery-6ed0770ba002c7137ead' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Mundra-Panipat crude pipeline transporting crude from Mundra to the Panipat refinery.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.99,
  },
  {
    edgeId: 'relationship-port-vadinar-refinery-ioc-koyali',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-42e3af128436239dad1c',
    toNodeId: 'refinery-refinery-b26a67787b7ad0c1a108',
    sourceReferences: [
      { table: 'ports', id: 'port-42e3af128436239dad1c' },
      { table: 'refineries', id: 'refinery-b26a67787b7ad0c1a108' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Salaya-Mathura crude pipeline, its Vadinar SPM systems, and delivery to the Koyali refinery.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
  {
    edgeId: 'relationship-port-vadinar-refinery-ioc-mathura',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-42e3af128436239dad1c',
    toNodeId: 'refinery-refinery-2ed4022ae8f1fc0df1c3',
    sourceReferences: [
      { table: 'ports', id: 'port-42e3af128436239dad1c' },
      { table: 'refineries', id: 'refinery-2ed4022ae8f1fc0df1c3' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Salaya-Mathura crude pipeline, its Vadinar SPM systems, and delivery to the Mathura refinery.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
  {
    edgeId: 'relationship-port-vadinar-refinery-ioc-panipat',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-42e3af128436239dad1c',
    toNodeId: 'refinery-refinery-6ed0770ba002c7137ead',
    sourceReferences: [
      { table: 'ports', id: 'port-42e3af128436239dad1c' },
      { table: 'refineries', id: 'refinery-6ed0770ba002c7137ead' },
      externalReference(IOCL_CRUDE_PIPELINES_URL),
    ],
    sourceUrl: IOCL_CRUDE_PIPELINES_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Salaya-Mathura crude pipeline, its Vadinar SPM systems, and delivery to the Panipat refinery.',
    notes: 'Documented crude pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
  {
    edgeId: 'relationship-port-sikka-refinery-ril-jamnagar',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-21bd5d045171a73e0012',
    toNodeId: 'refinery-refinery-512c57b7cda5c85a0b09',
    sourceReferences: [
      { table: 'ports', id: 'port-21bd5d045171a73e0012' },
      { table: 'refineries', id: 'refinery-512c57b7cda5c85a0b09' },
      externalReference(RIL_SIKKA_PORT_URL),
    ],
    sourceUrl: RIL_SIKKA_PORT_URL,
    sourceOrganization: RIL_ORGANIZATION,
    evidence: 'Reliance identifies Sikka as the captive port for its Jamnagar refinery complex.',
    notes: 'Documented captive-port relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
  {
    edgeId: 'relationship-port-haldia-refinery-ioc-haldia',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-4cbd3879645dac45799b',
    toNodeId: 'refinery-refinery-3ebbfa8bfe4fcd853090',
    sourceReferences: [
      { table: 'ports', id: 'port-4cbd3879645dac45799b' },
      { table: 'refineries', id: 'refinery-3ebbfa8bfe4fcd853090' },
      externalReference(IOCL_HALDIA_PORT_URL),
    ],
    sourceUrl: IOCL_HALDIA_PORT_URL,
    sourceOrganization: IOCL_ORGANIZATION,
    evidence: 'IndianOil documents the Haldia refinery and its Haldia Oil Jetty used for crude tanker receipt.',
    notes: 'Documented refinery-to-oil-jetty relationship represented by the canonical Haldia port; no edge capacity or current flow assigned.',
    confidence: 0.96,
  },
  {
    edgeId: 'relationship-port-vishakhapatnam-refinery-hpc-vizag',
    edgeType: 'port_to_refinery',
    fromNodeId: 'port-port-172252e2df5588dd95db',
    toNodeId: 'refinery-refinery-cde3cd0c803ad63da84f',
    sourceReferences: [
      { table: 'ports', id: 'port-172252e2df5588dd95db' },
      { table: 'refineries', id: 'refinery-cde3cd0c803ad63da84f' },
      externalReference(VISAKHAPATNAM_PORT_HPCL_URL),
    ],
    sourceUrl: VISAKHAPATNAM_PORT_HPCL_URL,
    sourceOrganization: VISAKHAPATNAM_PORT_ORGANIZATION,
    evidence: 'Visakhapatnam Port Authority documents crude unloaded at the outer port and pumped by pipeline to the nearby HPCL refinery.',
    notes: 'Documented port-to-refinery pipeline relationship; no edge capacity or current flow assigned.',
    confidence: 0.98,
  },
];

const ROUTE_PORT_RELATIONSHIPS: readonly DigitalTwinEdgeInput[] = [
  {
    edgeId: 'relationship-hormuz-india-route-to-mumbai-port',
    edgeType: 'shipping_route_to_port',
    fromNodeId: 'shipping-route-hormuz-india',
    toNodeId: 'port-port-251a9f32cbcedd0b8e47',
    sourceReferences: [
      externalReference(EIA_HORMUZ_URL),
      { table: 'ports', id: 'port-251a9f32cbcedd0b8e47' },
      externalReference(NEWS_ON_AIR_MUMBAI_HORMUZ_URL),
    ],
    sourceUrl: NEWS_ON_AIR_MUMBAI_HORMUZ_URL,
    sourceOrganization: NEWS_ON_AIR_ORGANIZATION,
    evidence: 'News On AIR reports that an India-bound crude tanker arrived at Mumbai after transiting the Strait of Hormuz and began unloading at Jawahar Dweep.',
    notes: 'Documented India-facing route endpoint at Mumbai from an observed crude cargo event; no generalized flow or capacity assigned.',
    confidence: 0.99,
  },
  {
    edgeId: 'relationship-hormuz-india-route-to-vadinar-port',
    edgeType: 'shipping_route_to_port',
    fromNodeId: 'shipping-route-hormuz-india',
    toNodeId: 'port-port-42e3af128436239dad1c',
    sourceReferences: [
      externalReference(EIA_HORMUZ_URL),
      { table: 'ports', id: 'port-42e3af128436239dad1c' },
      externalReference(IOCL_VADINAR_IRAQ_CRUDE_URL),
    ],
    sourceUrl: IOCL_VADINAR_IRAQ_CRUDE_URL,
    sourceOrganization: `${IOCL_ORGANIZATION} / ${EIA_ORGANIZATION}`,
    evidence: 'IndianOil documents an Iraq-origin Basrah crude tanker unloading at Vadinar for pipeline transfer to IndianOil refineries; EIA documents the Persian Gulf-Hormuz-Arabian Sea oil corridor represented by this India-facing route.',
    notes: 'Documented corridor-to-endpoint association using an observed Iraq-origin crude cargo; no voyage-specific track, edge capacity, or current flow assigned.',
    confidence: 0.93,
  },
];

const addNodeIfMissing = (model: DigitalTwinGraphModel, input: DigitalTwinNodeInput): void => {
  if (!model.getNode(input.nodeId)) model.addNode(input);
};

const addEdgeIfSupported = (model: DigitalTwinGraphModel, input: DigitalTwinEdgeInput): void => {
  if (model.getEdges().some((edge) => edge.edgeId === input.edgeId)) return;
  if (model.getNode(input.fromNodeId) && model.getNode(input.toNodeId)) model.addEdge(input);
};

const findSupplierNodeId = (model: DigitalTwinGraphModel, supplierName: string): string | undefined =>
  model.getNodes().find((node) => node.nodeType === 'supplier' && node.name.toLowerCase() === supplierName.toLowerCase())?.nodeId;

const addSupplierRouteEdges = (model: DigitalTwinGraphModel): void => {
  const malaccaSuppliers = ['Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Iraq'];
  for (const supplierName of malaccaSuppliers) {
    const supplierNodeId = findSupplierNodeId(model, supplierName);
    if (!supplierNodeId) continue;
    addEdgeIfSupported(model, {
      edgeId: `relationship-supplier-${supplierName.toLowerCase().replaceAll(' ', '-')}-malacca-route`,
      edgeType: 'supplier_to_shipping_route',
      fromNodeId: supplierNodeId,
      toNodeId: 'shipping-route-middle-east-malacca-asia',
      sourceReferences: [externalReference(EIA_HORMUZ_URL)],
      sourceUrl: EIA_HORMUZ_URL,
      sourceOrganization: EIA_ORGANIZATION,
      evidence: `EIA identifies ${supplierName} among the key Persian Gulf OPEC producers whose crude oil was transported through the Strait of Malacca in 1H25.`,
      notes: 'Documented supplier-to-route association; no capacity or flow value assigned to this edge.',
      confidence: 0.94,
    });
  }

  const saudiNodeId = findSupplierNodeId(model, 'Saudi Arabia');
  if (saudiNodeId) {
    addEdgeIfSupported(model, {
      edgeId: 'relationship-supplier-saudi-arabia-hormuz-route',
      edgeType: 'supplier_to_shipping_route',
      fromNodeId: saudiNodeId,
      toNodeId: 'shipping-route-persian-gulf-hormuz-arabian-sea',
      sourceReferences: [externalReference(EIA_HORMUZ_URL)],
      sourceUrl: EIA_HORMUZ_URL,
      sourceOrganization: EIA_ORGANIZATION,
      evidence: 'EIA states that Saudi Arabia moves more crude oil and condensate through the Strait of Hormuz than any other country.',
      notes: 'Documented Saudi-to-Hormuz association; no capacity or flow value assigned to this edge.',
      confidence: 0.97,
    });
  }
};

const addRouteAndReserveEdges = (model: DigitalTwinGraphModel): void => {
  addEdgeIfSupported(model, {
    edgeId: 'relationship-hormuz-route-to-chokepoint',
    edgeType: 'shipping_route_to_chokepoint',
    fromNodeId: 'shipping-route-persian-gulf-hormuz-arabian-sea',
    toNodeId: 'chokepoint-strait-of-hormuz',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    evidence: 'EIA identifies the Strait of Hormuz as the chokepoint leading out of the Persian Gulf toward the Gulf of Oman and Arabian Sea.',
    notes: 'Documented route-to-chokepoint association; no capacity or flow value assigned to this edge.',
    confidence: 0.99,
  });

  addEdgeIfSupported(model, {
    edgeId: 'relationship-malacca-route-to-chokepoint',
    edgeType: 'shipping_route_to_chokepoint',
    fromNodeId: 'shipping-route-middle-east-malacca-asia',
    toNodeId: 'chokepoint-strait-of-malacca',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    evidence: 'EIA identifies the Strait of Malacca as the shortest sea route between Middle East oil suppliers and Asian markets and a major oil chokepoint.',
    notes: 'Documented route-to-chokepoint association; no capacity or flow value assigned to this edge.',
    confidence: 0.99,
  });

  addEdgeIfSupported(model, {
    edgeId: 'relationship-hormuz-to-india-facing-route',
    edgeType: 'chokepoint_to_shipping_route',
    fromNodeId: 'chokepoint-strait-of-hormuz',
    toNodeId: 'shipping-route-hormuz-india',
    sourceReferences: [externalReference(EIA_HORMUZ_URL)],
    sourceUrl: EIA_HORMUZ_URL,
    sourceOrganization: EIA_ORGANIZATION,
    evidence: 'EIA reports that 89% of crude oil and condensate transiting Hormuz went to Asian markets, with India among the top destinations.',
    notes: 'Documented India-facing flow association; no specific Indian port endpoint or flow value inferred.',
    confidence: 0.92,
  });

  const reserveRefineryEdges: readonly DigitalTwinEdgeInput[] = [
    {
      edgeId: 'relationship-isprl-mangalore-to-mrpl',
      edgeType: 'strategic_reserve_to_refinery',
      fromNodeId: 'strategic-reserve-isprl-mangalore',
      toNodeId: 'refinery-refinery-2e0d4ad0d99de43e1e73',
      sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
      sourceUrl: ISPRL_ANNUAL_REPORT_URL,
      sourceOrganization: ISPRL_ORGANIZATION,
      evidence: 'ISPRL documents the Mangalore reserve and MRPL relationship, including crude transfers and MRPL use of Mangalore cavern infrastructure.',
      notes: 'Documented reserve-to-refinery association; no capacity or current flow assigned to this edge.',
      confidence: 0.97,
    },
    {
      edgeId: 'relationship-isprl-padur-to-mrpl',
      edgeType: 'strategic_reserve_to_refinery',
      fromNodeId: 'strategic-reserve-isprl-padur',
      toNodeId: 'refinery-refinery-2e0d4ad0d99de43e1e73',
      sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL)],
      sourceUrl: ISPRL_ANNUAL_REPORT_URL,
      sourceOrganization: ISPRL_ORGANIZATION,
      evidence: 'ISPRL states that crude stored in its Mangalore and Padur caverns was transferred to MRPL on a replacement basis.',
      notes: 'Documented reserve-to-refinery association; no capacity or current flow assigned to this edge.',
      confidence: 0.96,
    },
    {
      edgeId: 'relationship-isprl-visakhapatnam-to-hpcl-vizag',
      edgeType: 'strategic_reserve_to_refinery',
      fromNodeId: 'strategic-reserve-isprl-visakhapatnam',
      toNodeId: 'refinery-refinery-cde3cd0c803ad63da84f',
      sourceReferences: [externalReference(ISPRL_ANNUAL_REPORT_URL), externalReference(PPAC_REFINERY_URL)],
      sourceUrl: ISPRL_ANNUAL_REPORT_URL,
      sourceOrganization: `${ISPRL_ORGANIZATION} / ${PPAC_ORGANIZATION}`,
      evidence: 'ISPRL states that Cavern B at Visakhapatnam is used by HPCL for refinery operations; PPAC lists HPC, Vizag as an Indian refinery.',
      notes: 'Documented reserve-to-refinery association; no capacity or current flow assigned to this edge.',
      confidence: 0.97,
    },
  ];
  for (const edge of reserveRefineryEdges) addEdgeIfSupported(model, edge);
};

export const enrichDigitalTwinRelationships = (model: DigitalTwinGraphModel): void => {
  for (const node of PHASE_37_NODES) addNodeIfMissing(model, node);
  for (const relationship of PORT_REFINERY_RELATIONSHIPS) addEdgeIfSupported(model, relationship);
  for (const relationship of PORT_REFINERY_COVERAGE_RELATIONSHIPS) addEdgeIfSupported(model, relationship);
  for (const relationship of ROUTE_PORT_RELATIONSHIPS) addEdgeIfSupported(model, relationship);
  addSupplierRouteEdges(model);
  addRouteAndReserveEdges(model);
};

export const getDigitalTwinRelationshipDefinitions = (): readonly DigitalTwinEdgeInput[] =>
  PORT_REFINERY_RELATIONSHIPS.map((relationship) => ({
    ...relationship,
    sourceReferences: relationship.sourceReferences.map((reference) => ({ ...reference })),
  }));
