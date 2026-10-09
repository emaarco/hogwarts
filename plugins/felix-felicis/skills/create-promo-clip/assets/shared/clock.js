const DEFAULT_EASING = 'cubic-bezier(.2, .7, .2, 1)'
const VIEW_FADE = 0.12
let clipSeconds

export function defineClip(seconds) {
  clipSeconds = seconds
  window.clipSeconds = seconds
  window.seek = (second) => {
    document.getAnimations().forEach((animation) => {
      animation.pause()
      animation.currentTime = second * 1000
    })
  }
}

export function animate(selector, keyframesBySecond, easing = DEFAULT_EASING) {
  const keyframes = keyframesBySecond.map(([second, style]) => ({ ...style, offset: second / clipSeconds, easing }))
  document.querySelectorAll(selector).forEach((element) => {
    element.animate(keyframes, { duration: clipSeconds * 1000, fill: 'both', iterations: Infinity })
  })
}

export function showBetween(selector, start, end, { fade = 0.4, enterFrom = 'translateY(18px)', exitTo = 'none' } = {}) {
  const hidden = { opacity: 0, transform: enterFrom }
  const visible = { opacity: 1, transform: 'none' }
  const gone = { opacity: 0, transform: exitTo }
  const staysUntilEnd = end >= clipSeconds
  const keyframes = [[0, hidden], [start, hidden], [start + fade, visible]]
  if (!staysUntilEnd) {
    keyframes.push([end - fade, visible], [end, gone])
  }
  keyframes.push([clipSeconds, staysUntilEnd ? visible : gone])
  animate(selector, keyframes)
}

export function showStaggered(selector, start, end, { stagger = 0.12, ...options } = {}) {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.dataset.staggerId = `${selector}-${index}`
    showBetween(`[data-stagger-id="${element.dataset.staggerId}"]`, start + index * stagger, end, options)
  })
}

export function showDuring(selector, windows, fade = 0.15) {
  const keyframes = [[0, { opacity: 0 }]]
  windows.forEach(([start, end]) => {
    keyframes.push([start, { opacity: 0 }], [start + fade, { opacity: 1 }])
    if (end < clipSeconds) {
      keyframes.push([end - fade, { opacity: 1 }], [end, { opacity: 0 }])
    }
  })
  const staysUntilEnd = windows.at(-1)[1] >= clipSeconds
  keyframes.push([clipSeconds, { opacity: staysUntilEnd ? 1 : 0 }])
  animate(selector, keyframes)
}

export function hide(selector) {
  animate(selector, [[0, { opacity: 0 }], [clipSeconds, { opacity: 0 }]])
}

export function typeBetween(selector, start, end) {
  animate(selector, [
    [0, { clipPath: 'inset(0 100% 0 0)' }],
    [start, { clipPath: 'inset(0 100% 0 0)' }],
    [end, { clipPath: 'inset(0 0% 0 0)' }],
    [clipSeconds, { clipPath: 'inset(0 0% 0 0)' }],
  ], 'steps(24, end)')
}

export function openWithHook(selector, hookEnd) {
  animate(selector, [
    [0, { opacity: 1 }],
    [hookEnd - 0.1, { opacity: 1 }],
    [hookEnd + 0.3, { opacity: 0 }],
    [clipSeconds, { opacity: 0 }],
  ])
}

export function showView(selector, windows) {
  const hidden = { opacity: 0, zIndex: 1 }
  const fadingIn = { opacity: 0, zIndex: 3 }
  const onTop = { opacity: 1, zIndex: 3 }
  const settled = { opacity: 1, zIndex: 1 }
  const keyframes = [[0, hidden]]
  windows.forEach(([start, end]) => {
    keyframes.push([start, fadingIn], [start + VIEW_FADE, onTop], [start + VIEW_FADE + 0.01, settled])
    if (end < clipSeconds) {
      keyframes.push([end + VIEW_FADE, settled], [end + VIEW_FADE + 0.01, hidden])
    }
  })
  keyframes.push([clipSeconds, windows.at(-1)[1] >= clipSeconds ? settled : hidden])
  animate(selector, keyframes, 'linear')
}

export function showCard(selector, start, end) {
  showBetween(selector, start, end, { fade: 0.3, enterFrom: 'none' })
}

export function cutBetween(selector, start, end) {
  const keyframes = [[0, { opacity: 0 }]]
  if (start > 0) {
    keyframes.push([start, { opacity: 1 }])
  } else {
    keyframes[0] = [0, { opacity: 1 }]
  }
  if (end < clipSeconds) {
    keyframes.push([end, { opacity: 0 }])
  }
  keyframes.push([clipSeconds, { opacity: end < clipSeconds ? 0 : 1 }])
  animate(selector, keyframes, 'step-end')
}
