# The LLM selects; Qloo supplies

Every Cue must be a Qloo entity carrying an `entity_id`. The LLM may pick from Qloo candidates, put them in order, group them into themes, write Prompts and explain its choices. It may never introduce an entity of its own. A validator drops any Cue whose id did not come from a Qloo response in the same run. This keeps the cultural knowledge grounded (an LLM alone tends to stereotype an era) and makes "would it work without Qloo?" answerable by construction. The Baseline Kit exists only to show that difference.
