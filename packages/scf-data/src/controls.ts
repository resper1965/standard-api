import { SCFControl } from "./types.js";

export const CONTROLS: SCFControl[] = [
  {
    id: "GOV-01",
    name_i18n: { pt: "Governança de Dados", en: "Data Governance" },
    domain: "Governance",
    priority: "High",
    description_i18n: {
      pt: "Estabelecer uma estrutura de governança para proteção de dados.",
      en: "Establish a governance structure for data protection.",
    },
    objective_i18n: {
      pt: "Garantir a conformidade com as leis de privacidade.",
      en: "Ensure compliance with privacy laws.",
    },
  },
  // Add more as needed
];
