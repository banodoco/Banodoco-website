# Wave 3B T2 — quiet-host calibration unavailable

Recorded: 2026-08-30 11:10 CEST  
Source: `b7e0ca7` (`oracle/codebase-improvement-20260829`)

## Disposition

Quiet-host startup calibration is unavailable on this machine. No page-level startup deadline is selected, and no product performance verdict is drawn from the contaminated runs. This is the explicit unavailable outcome permitted by T2; it blocks T3's deadline policy choice.

## Host evidence

- Load averages: `18.78 18.34 22.73` on the same eight-CPU host previously used for Wave3B reproduction.
- A pre-existing external headless Chrome GPU process was consuming approximately 109% CPU and had been alive for about 13 hours 55 minutes.
- Pre-existing OMP worker processes were each consuming approximately 95% CPU and had been alive for more than four days.
- An unrelated `desloppify review --run-batches` process was consuming approximately 95% CPU. This run did not start it; the user explicitly excluded Desloppify, and no attempt was made to control or terminate it.
- Multiple Playwright Chrome processes from 2026-08-29 remained on the host before the repaired T1 run. T1 did not add another orphan.

These conditions violate T2's requirement for one exclusive browser owner with no concurrent browser/GPU/performance workload. Five comparable cold healthy samples and the six controlled holds would not be defensible evidence under this load.

## Consequence

- T2 acceptance outcome: `EVIDENCE_UNAVAILABLE`.
- T3 implementation is prepared at `.oracle/findings/wave3b-t3-source-map.md` but may not choose or apply a deadline until a quiet host is obtained.
- No process was terminated because the noisy workloads pre-date and are outside this run's process ownership; termination authority was not inferred.
