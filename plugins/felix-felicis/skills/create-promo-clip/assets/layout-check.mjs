export function findLayoutProblems(page) {
  return page.evaluate(() => {
    const problems = []
    const rect = (element) => element.getBoundingClientRect()
    const textBottom = (pre) => Math.max(...[...pre.querySelectorAll('.line, span')].map((node) => rect(node).bottom), rect(pre).top)
    const textRight = (pre) => Math.max(...[...pre.querySelectorAll('.line > *, span')].map((node) => rect(node).right), 0)
    document.querySelectorAll('.view').forEach((view) => {
      const viewRect = rect(view)
      const status = view.querySelector('.status')
      const docked = view.querySelector('.console')
      const limit = docked ? rect(docked).top : rect(status).top
      view.querySelectorAll('pre').forEach((pre) => {
        if (textBottom(pre) > limit) problems.push(`${view.id}: code ${pre.id || ''} ends at ${Math.round(textBottom(pre))}, docked area starts at ${Math.round(limit)}`)
        if (textRight(pre) > viewRect.right - 20) problems.push(`${view.id}: code ${pre.id || ''} reaches ${Math.round(textRight(pre))}, view ends at ${Math.round(viewRect.right)}`)
      })
      view.querySelectorAll('.console').forEach((console) => {
        console.querySelectorAll('code').forEach((line) => {
          if (rect(line).bottom > rect(status).top) problems.push(`${view.id}: console line "${line.textContent.slice(0, 30)}" runs into the status bar`)
          if (rect(line).right > viewRect.right - 20) problems.push(`${view.id}: console line "${line.textContent.slice(0, 30)}" reaches ${Math.round(rect(line).right)}`)
        })
      })
      view.querySelectorAll('.status').forEach((line) => {
        if (line.scrollWidth > line.clientWidth + 1) problems.push(`${view.id}: status "${line.textContent.slice(0, 30)}" is wider than the bar`)
      })
    })
    return problems
  })
}
