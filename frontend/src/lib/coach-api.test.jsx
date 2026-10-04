import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {parseHTML} from 'linkedom'
import {it,expect,vi} from 'vitest'
import {api} from './api.js'
import {useCoachStatus} from './coach-api.js'
vi.mock('./api.js',()=>({api:vi.fn()}))
vi.mock('./demo.js',()=>({DEMO:false}))
vi.mock('../store/useStore.js',()=>({useStore:{getState:()=>({S:{}})}}))
vi.mock('../store/useUI.js',()=>({useUI:{getState:()=>({toast:vi.fn()})}}))
vi.mock('./mobile.js',()=>({MOBILE:false}))
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
it('an older status reply cannot replace current question/proposal state or stop polling',async()=>{
  vi.useFakeTimers();api.mockReset()
  const first=deferred(),second=deferred();api.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue({job:null,pending:null})
  const dom=parseHTML('<html><body><div id="root"></div></body></html>').window
  globalThis.window=dom;globalThis.document=dom.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
  for(const key of ['HTMLElement','Node','Element','Event'])globalThis[key]=dom[key]
  const root=createRoot(document.getElementById('root'));let status
  const Probe=()=>{status=useCoachStatus();return <p>{status.pending?.id}</p>}
  try {
    await act(async()=>root.render(<Probe/>))
    let refreshing;await act(async()=>{refreshing=status.refresh()})
    await act(async()=>{second.resolve({job:{id:'current'},pending:{id:'new'},cap:{used:2}});await refreshing})
    await act(async()=>{first.resolve({job:null,pending:{id:'old'},cap:{used:1}});await first.promise})
    expect(status.pending.id).toBe('new');expect(status.cap.used).toBe(2)
    await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
    expect(api).toHaveBeenCalledTimes(3)
  } finally {await act(async()=>root.unmount());vi.useRealTimers()}
})
