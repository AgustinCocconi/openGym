import {afterEach,it,expect} from 'vitest'
import fs from 'node:fs'
import es from '../locales/es.js'
import names from '../exercise-names/es.js'
import {baseLang,DATE_LOCALES,LANGS,_setLangState,t,exerciseNameFor} from './i18n-core.js'
afterEach(()=>_setLangState('en',{},null,null))
it('es-AR loads Spanish for consultation, confirmation, skills and core calisthenics labels',()=>{
  expect(LANGS['es-AR']).toBeTruthy();expect(DATE_LOCALES['es-AR']).toBe('es-AR');expect(baseLang('es-AR')).toBe('es')
  _setLangState('es-AR',es,null,names)
  for(const file of ['TrainingPanel','SkillsPanel','ConversationMode']) {
    const source=fs.readFileSync(new URL('../components/adaptive-training/'+file+'.jsx',import.meta.url),'utf8')
    for(const match of source.matchAll(/\bt\('([^'\n]+)'/g)) {
      const key=match[1];expect(es[key],key).toBeTruthy();if (key !== 'reps') expect(t(key),key).not.toBe(key)
    }
  }
  expect(exerciseNameFor({id:'0652',n:'Pull-up'})).toBe('Dominadas')
  expect(exerciseNameFor({id:'custom',n:'Mi ejercicio'})).toBe('Mi ejercicio')
})
