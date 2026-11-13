# Tuck-Draw Audit Log (戻しドロー検証ログ)

A logging and testing tool for Shadowverse effects that "return a card from your hand to the deck, then draw". It checks whether the probability of drawing the returned target card (copies with the same name are not distinguished) matches the theoretical k/N.

## Files

- `index.html`: the whole tool. HTML, CSS, and JS in a single file. No build step; open it in a browser and it works.

## Terms

- a: deck size right before the effect is used (input ①)
- r: number of cards returned, m: number of cards drawn (settings; stored with each record)
- N = a + r: deck size after returning, right before drawing
- b: copies of the target card in the deck before returning (input ②; buttons cover 0 to max copies − r, other values go in the 「その他の枚数」 field)
- k = b + r: copies of the target card in the deck after returning (records store k)
- y: copies of the target card among the m drawn cards (input ③)

## Statistics

- Null hypothesis: the deck is shuffled uniformly and trials are independent. N and k are treated as given (conditional inference)
- Each trial's Y follows the hypergeometric distribution H(N, k, m). With m = 1 it is Bernoulli(k/N)
- S = ΣY. Its null distribution is computed exactly by convolving the per-trial distributions (Poisson binomial when every trial draws one card)
- Two-sided p-value: sum the probabilities of all x with P(S=x) ≤ P(S=s_obs) (relative tolerance 1e-7)
- Z = (S−μ)/σ is for reference only. The chart band is the cumulative μ ± 2σ
- p-values stay hidden until the target number of trials (default 300) is reached. The number of early reveals is recorded in `peeks`

## Fixed specifications (decided by the user)

- No prediction display, no match separation, no turn display
- Settings and data operations live in sheets opened from header buttons, so they take no space
- No row of number buttons for the deck size. Input is via ±1 and ±10 buttons, direct entry, and the ↑↓ keys
- Defaults after recording
  - deck size = previous a − 1
  - b = clamp(previous k − y, 0, max copies − r). With one-card draws, k stays the same after a hit and goes up by 1 after a miss
- Defaults when there are no records, and on reset: deck size = initial deck size (default 35), b = max copies − r (default 2). On PC the Esc key also resets. Deleting all data also resets the input to these values
- No sample data is shown
- Keep the design and CSS as simple as possible. No web fonts; use each platform's default fonts (differences between environments are acceptable)
- Records are never deleted. Undo only sets the `void` flag, which excludes the record from the statistics
- Default settings: initial deck size 35, max copies 3, cards returned 1, cards drawn 1, target trials 300, hide p-value on

## Data

- Saved automatically to localStorage under the key `svbd.v2`
- Export and import as JSON (full state) and CSV (trial data). On import, the user chooses "add" or "replace"
- CSV columns: id, timestamp, shown_before, returned, drawn, N, k, y, expected, void, voided_at, sample
- localStorage is separate per page location (origin). To move data elsewhere, export JSON and import it

## Future candidates

- Real-time sync between PC and phone (web-based; enter results on the phone while playing on the PC, or the other way around)
- Switching to a one-sided test or mid-p
- Sequential testing (e-values etc.) so the significance level holds even when results are checked early

## Working notes

- Write commit messages in English
- The UI text is Japanese
- No external scripts or fonts are loaded. Fonts are `system-ui` (monospace only for formulas and key labels)
- Colors are defined as six tokens in `:root` (`--bg` `--ink` `--muted` `--line` `--accent` `--warn`); dark mode follows the OS setting
- The CSS is built from element selectors and a few classes (`.row` `.split` `.grid2` `.panel` `.sheet`, plus the state classes `.hit` `.warn` `.void` `.primary`). Before adding styles, check whether existing ones already cover the need
- Do not read the game client's memory or network traffic. All input is manual
