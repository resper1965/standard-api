export type RemediationTerminology = {
  artifactName: string;
  artifactAbbreviation: string;
  itemTerm: string;
};

export const getRemediationTerminology = (frameworkId?: string | null): RemediationTerminology => {
  const normalized = (frameworkId ?? "").toUpperCase();
  
  if (normalized.includes("ISO27001") || normalized.includes("ISO27K") || normalized.includes("ISO 27001")) {
    return {
      artifactName: "Risk Treatment Plan (RTP) & Corrective and Preventive Action (CAPA)",
      artifactAbbreviation: "RTP / CAPA",
      itemTerm: "Non-Conformity & Risk Treatment"
    };
  }

  // Default to NIST / FedRAMP standard (POA&M)
  return {
    artifactName: "Plan of Action and Milestones",
    artifactAbbreviation: "POA&M",
    itemTerm: "POA&M Item"
  };
};

