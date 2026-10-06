# CivicPulse: a three-minute pitch

**Opening — 20 seconds**

“Cities don’t need more complaints. They need to know what to fix first. When six people report the same dangerous pothole, a city team should see one urgent case with six voices behind it—not six disconnected tickets.”

**Show the city overview — 30 seconds**

“CivicPulse connects citizen reporting with a city operations workspace. This is a clearly labelled Bengaluru demo. Every number here comes from the same case records. The Civic Priority Score combines safety, public impact, age and community evidence, with its reasoning visible to the team.”

**Show reporting and duplicate matching — 60 seconds**

Use Report an issue → Use demo scenario → Continue to location → Analyse report.

“Here’s a pothole outside a school. The report is classified, given a priority and routed to Roads & Infrastructure. There’s already a matching case nearby. We compare category, distance, description and recency. My report joins that case: six reports become seven, while the number of problems stays the same.”

**Show shared progress — 40 seconds**

Track this complaint → Open authority view → In Progress → Save case update → return to tracker.

“The city team can assign a department, publish an update and record repairs. Citizens follow the same case. We close the accountability loop instead of stopping at a tracking number.”

**Close — 20 seconds**

“The differentiator is prioritisation: many voices become clearer evidence, hotspots become visible, and city teams can explain why one issue needs attention first. The next step is a municipal pilot with authenticated staff, durable storage and independently evaluated analysis.”

## Be ready for these questions

**Is this real AI?** Report descriptions are sent to a locally running Ollama model (`llama3.2:latest`) through the server route. A keyword classifier is the fallback when Ollama is unavailable. Priority scoring and duplicate matching remain explainable rules. We have not claimed image understanding or measured routing accuracy; uploaded photos help field verification.

**How do you avoid incorrect merges?** We require an unresolved case of the same category, within 250 metres, with sufficient description overlap, and no older than 30 days. Production would add a review/unmerge workflow and tune thresholds using labelled examples.

**Can people manipulate the score?** Community contribution is capped. The demo permits one confirmation per browser. A real pilot requires identity verification, rate limits and abuse monitoring.

**Is this connected to the government?** No. Locations and cases are illustrative. The demo stores data locally; it does not submit official complaints.

**Why will authorities use it?** It provides one ranked queue, consolidated evidence, clear department ownership and a shared public progress record. A pilot should measure triage time, duplicate reduction and time to resolution before making impact claims.
