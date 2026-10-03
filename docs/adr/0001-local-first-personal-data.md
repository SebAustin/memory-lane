# Local-first storage for personal data

Life Stories and Session Logs describe people living with dementia. That is sensitive data even when only a first name is stored. So it is kept in the Caregiver's browser, with JSON export and import, rather than in a server database. Server routes are stateless proxies to Qloo and the LLM. This trades away cross-device sync and family sharing for a privacy stance we can state plainly: no accounts, and no health data on our servers. A later "share with family" feature must be opt-in and must not override this default.
