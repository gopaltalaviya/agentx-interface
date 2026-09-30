# AGENTX brand

| File              | Use                                         |
| ----------------- | ------------------------------------------- |
| `agentx-mark.svg` | The mark alone — app icon, favicon, avatars |
| `agentx-logo.svg` | Mark + wordmark, on dark backgrounds        |

**The mark:** four agents whose lines cross at one point — the escrow every
payment passes through. Two strokes and five dots, so it holds at 16 px.

| Token   | Hex       | Meaning                                    |
| ------- | --------- | ------------------------------------------ |
| Ink     | `#07090d` | Background                                 |
| Text    | `#e8ecf4` | Primary text                               |
| Accent  | `#6ea8ff` | Actions, links, the X                      |
| Chain   | `#9d8cff` | Monad — used only where the chain is meant |
| Settled | `#3fd68c` | Money that moved                           |
| Refused | `#f5b942` | The system deciding no                     |
| Broken  | `#ff6b6b` | Something actually wrong                   |

Type: Geist (sans) and Geist Mono (anything on-chain). The same geometry is in
`app/icon.svg` and `components/brand/Logo.tsx`; change all three together.
