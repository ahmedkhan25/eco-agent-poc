// Sandrine's draft price book (2026 EcoHeart Pricing Model, tab "2. Pricing Services City"), loaded as-is.
// Hours x FTE are multiplied out. Fixes vs the workbook: GDPR and EU AI Act are annual packages (her
// Year 2/3 cells were blank), and HIPAA and CCPA/CPRA are marked US-only. "recurring" follows her Year 2/3 formulas. Edit on the Pricing tab.
import type { CatalogItem } from "../pricing";

export const SANDRINE_CATALOG: CatalogItem[] = [
 {
  "id": "metadata-management-console",
  "category": "AI Urban Platform",
  "name": "Metadata management console",
  "description": "Data Mesh Approach to data integration, data quality and complexity management.",
  "unit": "GB of data",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 1000.0,
    "rate": 0.08
   },
   "Large": {
    "qty": 500.0,
    "rate": 0.08
   },
   "Mid-size": {
    "qty": 100.0,
    "rate": 0.08
   },
   "Small": {
    "qty": 5.0,
    "rate": 0.08
   }
  }
 },
 {
  "id": "data-lake-intelligence-layer",
  "category": "AI Urban Platform",
  "name": "Data Lake + Intelligence Layer",
  "description": "Aggregates public, operational, and citizen-generated data for predictive modeling.",
  "unit": "GB of data",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 1000.0,
    "rate": 0.08
   },
   "Large": {
    "qty": 500.0,
    "rate": 0.08
   },
   "Mid-size": {
    "qty": 100.0,
    "rate": 0.08
   },
   "Small": {
    "qty": 5.0,
    "rate": 0.08
   }
  }
 },
 {
  "id": "city-console",
  "category": "AI Urban Platform",
  "name": "City Console",
  "description": "Dashboards with KPIs and actionable insights for city managers.",
  "unit": "console",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 1.0,
    "rate": 30000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 10000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 5000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 1000.0
   }
  }
 },
 {
  "id": "citizen-engagement-portal",
  "category": "AI Urban Platform",
  "name": "Citizen Engagement Portal",
  "description": "Feedback, surveys, and participatory planning.",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 60.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 30.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 10.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 5.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "toolkits",
  "category": "AI Urban Platform",
  "name": "Toolkits",
  "description": "Best practices for workflow adoption, ethical AI use, and staff training",
  "unit": "hour (package)",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 20.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 15.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 10.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 5.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "custom-integrations",
  "category": "System Integration",
  "name": "Custom Integrations",
  "description": "Custom API integration",
  "unit": "integration",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 3.0,
    "rate": 15000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 15000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 10000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 1000.0
   }
  }
 },
 {
  "id": "scenario-engine",
  "category": "Scenarios & Simulations",
  "name": "Scenario Engine",
  "description": "Risk mitigation strategy & simulations",
  "unit": "run",
  "recurring": true,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 2.0,
    "rate": 6000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 4000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 3000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 1500.0
   }
  }
 },
 {
  "id": "hipaa",
  "category": "AI Ethics Audit and Compliance",
  "name": "HIPAA",
  "description": "Security Rule implementation, breach protocols - Internal and federal audits",
  "unit": "annual package",
  "recurring": true,
  "region": "US",
  "bySize": {
   "Major": {
    "qty": 1.0,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 15000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 2500.0
   }
  }
 },
 {
  "id": "ccpa-cpra",
  "category": "AI Ethics Audit and Compliance",
  "name": "CCPA/CPRA",
  "description": "Consumer data requests, opt-out mechanisms - Legal/compliance review",
  "unit": "annual package",
  "recurring": true,
  "region": "US",
  "bySize": {
   "Major": {
    "qty": 1.0,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 15000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 2500.0
   }
  }
 },
 {
  "id": "iso-27001",
  "category": "AI Ethics Audit and Compliance",
  "name": "ISO 27001",
  "description": "Access control, encryption, incident management - Certification audit",
  "unit": "annual package",
  "recurring": true,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 1.0,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 15000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 2500.0
   }
  }
 },
 {
  "id": "ieee-7000-oecd",
  "category": "AI Ethics Audit and Compliance",
  "name": "IEEE 7000 / OECD",
  "description": "Ethics integration, fairness, transparency - Ethics officer review, committee documentation",
  "unit": "annual package",
  "recurring": true,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 1.0,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 15000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 2500.0
   }
  }
 },
 {
  "id": "gdpr",
  "category": "AI Ethics Audit and Compliance",
  "name": "GDPR",
  "description": "DPIA, consent forms, anonymization - DPO audit reports, internal logs",
  "unit": "annual package",
  "recurring": true,
  "region": "EU",
  "bySize": {
   "Major": {
    "qty": 1,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1,
    "rate": 12500.0
   },
   "Small": {
    "qty": 1,
    "rate": 1500.0
   }
  }
 },
 {
  "id": "eu-ai-act",
  "category": "AI Ethics Audit and Compliance",
  "name": "EU AI Act",
  "description": "Risk classification, human oversight, post-market monitoring - Oversight committee reports",
  "unit": "annual package",
  "recurring": true,
  "region": "EU",
  "bySize": {
   "Major": {
    "qty": 1,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1,
    "rate": 12500.0
   },
   "Small": {
    "qty": 1,
    "rate": 1500.0
   }
  }
 },
 {
  "id": "esg-module",
  "category": "Add-Ons",
  "name": "ESG Module",
  "description": "Organization\u2019s environmental impact, treatment of people, and governance (incl. transparent reporting and responsible internal practices).",
  "unit": "annual package",
  "recurring": true,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 1.0,
    "rate": 25000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 20000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 15000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 1500.0
   }
  }
 },
 {
  "id": "climate-risk-engine",
  "category": "Add-Ons",
  "name": "Climate Risk Engine",
  "description": "Climate Risk Engine",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "flood-wildfire-hazard-models",
  "category": "Add-Ons",
  "name": "Flood/Wildfire/Hazard models",
  "description": "",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "carbon-credit-management",
  "category": "Add-Ons",
  "name": "Carbon Credit Management",
  "description": "Carbon Credit Management",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "climate-adaptation-simulation",
  "category": "Add-Ons",
  "name": "Climate Adaptation Simulation",
  "description": "Climate Adaptation Simulation",
  "unit": "run",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 2.0,
    "rate": 6000.0
   },
   "Large": {
    "qty": 1.0,
    "rate": 4000.0
   },
   "Mid-size": {
    "qty": 1.0,
    "rate": 3000.0
   },
   "Small": {
    "qty": 1.0,
    "rate": 500.0
   }
  }
 },
 {
  "id": "infrastructure-mobility-modules",
  "category": "Add-Ons",
  "name": "Infrastructure & Mobility Modules",
  "description": "",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "housing-economy-social-resilience-module",
  "category": "Add-Ons",
  "name": "Housing, Economy & Social Resilience Module",
  "description": "",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "public-safety-crisis-preparedness-module",
  "category": "Add-Ons",
  "name": "Public Safety & Crisis Preparedness Module",
  "description": "",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 },
 {
  "id": "onboarding-and-training",
  "category": "Onboarding & Training",
  "name": "Onboarding and training",
  "description": "Deployment, full scaling &operationalization.",
  "unit": "hour",
  "recurring": false,
  "region": "all",
  "bySize": {
   "Major": {
    "qty": 160.0,
    "rate": 200.0
   },
   "Large": {
    "qty": 120.0,
    "rate": 200.0
   },
   "Mid-size": {
    "qty": 80.0,
    "rate": 200.0
   },
   "Small": {
    "qty": 20.0,
    "rate": 200.0
   }
  }
 }
];
