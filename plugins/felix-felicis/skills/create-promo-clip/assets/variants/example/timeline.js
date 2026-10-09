import { defineClip, openWithHook, showBetween, showCard, showDuring, showView } from '../../shared/clock.js'

const CLIP_SECONDS = 12
const HOOK = 3
const CARD = 6
const SOLUTION = 8.5

defineClip(CLIP_SECONDS)

openWithHook('#hook', HOOK)
showCard('#card', CARD, SOLUTION)
showView('#code', [[HOOK, CLIP_SECONDS]])

showDuring('#by-hand', [[0, SOLUTION]])
showDuring('#generated', [[SOLUTION, CLIP_SECONDS]])
showBetween('#console', SOLUTION + 0.5, CLIP_SECONDS, { fade: 0.3, enterFrom: 'none' })
showDuring('#status-problem', [[0, SOLUTION]], 0.25)
showDuring('#status-solution', [[SOLUTION, CLIP_SECONDS]], 0.25)
