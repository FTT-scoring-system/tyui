FTT POOMSAE SCORING SYSTEM - PATCH

Implemented in this build:
1. Common judges PDF filename uses competition name + mat number.
2. Judge names are snapshotted into every score record. Changing a judge name later does not rename historical scores.
3. PDF groups records by Judge ID + judge name identity. If a judge returns to a previous name, the records are grouped under that previous identity.
4. Long judge reports automatically continue on multiple A4 landscape pages with page numbering.
5. PDF includes a Judge Identity History page.
6. Remote judge phone now stores its QR/session link and scoring draft locally.
7. Remote judge phone automatically retries/reconnects after refresh, accidental close, temporary disconnect, or sleep/wake.
8. Operator sends SCORE_ACK after accepting a judge score. The phone only marks a score as sent after acknowledgement.
9. A received score is restored after phone reconnection for the same scoring session.
10. Pending score drafts can be resent automatically after reconnection while the session remains open.
11. Regenerating a judge QR no longer deletes an already received score. The new QR can reconnect to the same operator/session.
12. A regenerated QR token is authoritative when scanned; an old QR can still be reopened from browser history if its token remains valid.

No scoring formula was intentionally changed by this patch.


--- Arabic Competition Name Generator ---
- Added manual competition-name entry plus an Arabic name generator button.
- Generator choices: البطولة الجهوية / البطولة الإقليمية / البطولة الوطنية.
- Added all 24 Tunisian governorates in an interactive Tunisia-style map selector.
- Hover displays the governorate name; click selects it.
- Generated final name format: [نوع البطولة] للبومزا - [الولاية].
- The generated Arabic name is stored in STATE.competitionName and therefore propagates to public display, judge context and export filenames.
