import { type Ref, unref, watchEffect } from 'vue'
import { type PageConfigOptions } from "."

type PageConfigJSModule = { default: PageConfigOptions, translations?: Record<string, string> }

const files = Object.entries(import.meta.glob<false, string, PageConfigJSModule>('@/page-config/**/index.ts'))
  .reduce((acc, [key, fn]) => {
    const name = key.replace('/page-config/', '').replace('/index.ts', '')

    if (name.split('/').length > 2) { return acc }

    acc[name] = fn
    return acc
  }, {} as Record<string, () => Promise<PageConfigJSModule>>)

const getConfig = async (name: string) => {
  const file = files[unref(name)]

  if (!file) {
    console.log(`Page config ${name} not found`)
    console.log(Object.keys(files))
    return null
  }

  return await (file().then((module) => {
    const m = module.default
    m.translations = module.translations || {}
    return m
  }).catch((e) => { throw e }))
}

export const usePageConfigs = () => files

export const usePageConfig = async (name: string | Ref<string>) => {
  try {
    const config = ref<PageConfigOptions | null>(await getConfig(unref(name)))

    watchEffect(async () => {
      try {
        config.value = null
        config.value = await getConfig(unref(name))
      }
      catch (e) {
        console.error(e)
      }
    })

    return config
  }
  catch (e) {
    console.log(e)
    return ref(null)
  }
}
