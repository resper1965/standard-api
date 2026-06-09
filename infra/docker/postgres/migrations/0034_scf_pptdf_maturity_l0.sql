-- SCF 2025.4: Add PPTDF applicability dimensions to assessment objectives
ALTER TABLE scf_assessment_objectives
  ADD COLUMN IF NOT EXISTS pptdf_people boolean,
  ADD COLUMN IF NOT EXISTS pptdf_process boolean,
  ADD COLUMN IF NOT EXISTS pptdf_technology boolean,
  ADD COLUMN IF NOT EXISTS pptdf_data boolean,
  ADD COLUMN IF NOT EXISTS pptdf_facility boolean;

-- SCF 2026.1.1: Add compensating control guidance to scf_controls
ALTER TABLE scf_controls
  ADD COLUMN IF NOT EXISTS compensating_control_guidance text;
