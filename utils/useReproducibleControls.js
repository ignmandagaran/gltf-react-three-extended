
import { button, useControls } from 'leva'
import cloneDeep from 'lodash/cloneDeep'
import lodashGet from 'lodash/get'
import lodashSet from 'lodash/set'
import { useEffect, useRef } from 'react'

// eslint-disable-next-line no-undef
const siteURL = new URL(process.env.NEXT_PUBLIC_SITE_URL)
const siteOrigin = siteURL.origin

/**
 * Returns href with query parameters and hash. Handles overrides or deletions appropriately.
 */
const getHrefWithQuery = (
  href,
  newQueryParams,
  override = true
) => {
  const uri = new URL(href, siteOrigin)

  if (newQueryParams) {
    Object.keys(newQueryParams).forEach((key) => {
      const value = newQueryParams[key]
      if (value === null) {
        if (override) uri.searchParams.delete(key)
        return
      }
      if (uri.searchParams.has(key) && override) {
        uri.searchParams.delete(key)
      }
      uri.searchParams.append(key, value)
    })
  }

  return `${uri.pathname}${uri.search}${uri.hash}`
}

function parseArgs(schemaOrFolderName, settingsOrDepsOrSchema, depsOrSettingsOrFolderSettings, depsOrSettings, depsOrUndefined
) {
  let schema
  let folderName = undefined
  let folderSettings
  let hookSettings
  let deps

  if (typeof schemaOrFolderName === 'string') {
    folderName = schemaOrFolderName
    schema = settingsOrDepsOrSchema
    if (Array.isArray(depsOrSettingsOrFolderSettings)) {
      deps = depsOrSettingsOrFolderSettings
    } else {
      if (depsOrSettingsOrFolderSettings) {
        if ('store' in depsOrSettingsOrFolderSettings) {
          hookSettings = depsOrSettingsOrFolderSettings
          deps = depsOrSettings
        } else {
          folderSettings = depsOrSettingsOrFolderSettings
          if (Array.isArray(depsOrSettings)) {
            deps = depsOrSettings
          } else {
            hookSettings = depsOrSettings
            deps = depsOrUndefined
          }
        }
      }
    }
  } else {
    schema = schemaOrFolderName
    if (Array.isArray(settingsOrDepsOrSchema)) {
      deps = settingsOrDepsOrSchema
    } else {
      hookSettings = settingsOrDepsOrSchema
      deps = depsOrSettingsOrFolderSettings
    }
  }

  return { schema, folderName, folderSettings, hookSettings, deps: deps || [] }
}

const fillInitialState = (
  _config,
  {
    get,
    onEditStart,
    onEditEnd
  }
) => {
  const isFunc = typeof _config === 'function'

  let config

  if (isFunc) {
    config = _config()
  } else {
    config = cloneDeep(_config)
  }

  const params = new URLSearchParams(window.location.search)

  const configParam = params.get('_config')

  /* Gen routes to values */
  const routes = {}
  Object.entries(config).forEach(([k, v]) => {
    // @ts-ignore
    const type = v.type

    if (type === 'FOLDER') {
      // @ts-ignore
      Object.entries(v.schema).forEach(([_k]) => {
        routes[_k] = `${k}.schema.${_k}`
      })

      return
    }

    routes[k] = `${k}`
  })

  if (configParam) {
    try {
      /* Set based on params */
      Object.entries(JSON.parse(configParam)).forEach(([k, v]) => {
        config = lodashSet(config, `${routes[k]}.value`, v)
      })

      config['Copy to Clipboard'] = button(() => {
        const copy = {}

        Object.keys(routes).forEach((k) => {
          copy[k] = get(k)
        })

        const el = document.createElement('textarea')

        el.value = JSON.stringify(copy)
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'

        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      })
    } catch (err) {
      console.error(err)
      return () => (isFunc ? _config() : config)
    }
  }

  Object.keys(routes).forEach((k) => {
    // @ts-ignore
    const propertyOnEditStart = lodashGet(config, `${routes[k]}`)[
      'onEditStart'
    ] 

    // @ts-ignore
    const propertyOnEditEnd = lodashGet(config, `${routes[k]}`)[
      'onEditEnd'
    ] 

    config = lodashSet(config, `${routes[k]}.onEditStart`, () => {
      propertyOnEditStart?.()
      onEditStart?.()
    })

    config = lodashSet(config, `${routes[k]}.onEditEnd`, () => {
      propertyOnEditEnd?.()
      onEditEnd?.()
    })
  })

  return () => config
}

export const useReproducibleControls = (
  schemaOrFolderName,
  settingsOrDepsOrSchema,
  depsOrSettingsOrFolderSettings,
  depsOrSettings,
  depsOrUndefined
) => {
  const shouldUpdateUrl = useRef(false)
  const { schema } = parseArgs(
    schemaOrFolderName,
    settingsOrDepsOrSchema,
    depsOrSettingsOrFolderSettings,
    depsOrSettings,
    depsOrUndefined
  )

  const resolvedSchema = fillInitialState(schema, {
    get: (p) => get(p),
    onEditStart: () => {
      shouldUpdateUrl.current = true
    },
    onEditEnd: () => {
      shouldUpdateUrl.current = false
    }
  })

  const [config, set, get] = useControls(
    resolvedSchema,
    settingsOrDepsOrSchema,
    depsOrSettingsOrFolderSettings,
    depsOrSettings,
    depsOrUndefined
  )

  useEffect(() => {
    if (shouldUpdateUrl.current) {
      const trget = getHrefWithQuery(
        window.location.protocol +
          '//' +
          window.location.host +
          window.location.pathname,
        { _config: JSON.stringify(config) }
      )
      window.history.pushState({ path: trget }, '', trget)
    }
  }, [config])

  const schemaIsFunction = typeof schema === 'function'

  if (schemaIsFunction) return [config, set, get]
  return config
}