// Requests and their queues belong to one authenticated session. Aborting saves work;
// checking the scope also covers responses already received and non-abortable dialogs.
export function createSyncSession(snapshot) {
  let generation = 0, controller = new AbortController()
  let pushing = null, pulling = null, pushAgain = false
  const capture = () => ({ ...snapshot(), generation, signal: controller.signal })
  const isCurrent = scope => {
    const now = snapshot()
    return scope.generation === generation && !scope.signal.aborted &&
      scope.uid === now.uid && scope.owner === now.owner &&
      (!now.uid || !now.owner || now.uid === now.owner)
  }
  const push = async run => {
    const scope = capture()
    if (!scope.uid || !isCurrent(scope)) return
    if (pushing) {
      pushAgain = true
      await pushing
      if (isCurrent(scope)) return pushing
      return
    }
    const request = run(scope).finally(() => {
      if (pushing !== request) return
      pushing = null
      if (pushAgain && isCurrent(scope)) { pushAgain = false; push(run) }
    })
    pushing = request
    return request
  }
  const pull = async run => {
    const scope = capture()
    if (!scope.uid || !isCurrent(scope)) return
    if (pulling) return pulling
    const request = run(scope).finally(() => { if (pulling === request) pulling = null })
    pulling = request
    return request
  }
  return {
    capture, isCurrent, push, pull,
    get pushing() { return pushing },
    get pulling() { return pulling },
    invalidate() {
      generation++
      controller.abort()
      controller = new AbortController()
      pushing = pulling = null
      pushAgain = false
    }
  }
}
