# Models, infrastructure and sources

ChartAuth uses a deterministic workflow and verifier. No language-model API is called by the eligibility demonstration.

## Development and model references

| System                   | Role                                                                            | Source                                                                |
| ------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GPT-6 Astra · Ultra mode | Development assistance; Ultra is a workspace mode rather than an API model name | [OpenAI model catalog](https://developers.openai.com/api/docs/models) |
| Claude Fable 5.1         | Published model reference; not integrated or benchmarked here                   | [Anthropic](https://www.anthropic.com/claude-fable-and-mythos-5-1)    |
| Gemini 3.1 Deep Think    | Published reasoning-system reference; not integrated or benchmarked here        | [Google DeepMind](https://deepmind.google/models/gemini/deep-think/)  |

Model labels were checked against official sources on September 19, 2026. These references do not establish sponsorship, affiliation, performance or production integration.

## Implementation

The deployment design uses GitHub for source control, Vercel for the frontend and Supabase Edge Functions for the API on Deno. PostgreSQL stores the protected sessions and worklist. Node.js runs the local server and tests. Python reproduces the pinned benchmark evaluation. The frontend uses native browser JavaScript, CSS and HTML. Publishing and checking a particular release remains a separate deployment step.

The walkthrough's optional narration uses the browser Web Speech API. Transcribed feedback informed project revisions; its transcription provider and model were not recorded, so no provider claim is made.

The [logo source register](logo-sources.json) identifies original vendor assets. Third-party marks remain their owners' property. The [research register](research-sources.json) identifies the evidence and public comparisons behind the design.
