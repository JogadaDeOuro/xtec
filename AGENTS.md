# Architecture rules

- Custom quotes store their itemized commercial data in proposals.personalizado_config, separate from document configuration, so layout edits cannot change pricing.
- All proposal types use ProposalDocument and buildProposalDocData for the official print/PDF pipeline, keeping saved data and rendering consistent.
- Each proposal type has an independent section list within shared document settings, preserving organization branding and standard payments.