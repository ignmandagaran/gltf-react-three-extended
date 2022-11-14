import React, { useEffect, useMemo, useCallback } from 'react'
import copy from 'clipboard-copy'
import saveAs from 'file-saver'
import { Leva, useControls, button } from 'leva'
import toast from 'react-hot-toast'
import { isGlb } from '../utils/isExtension'
import useSandbox from '../utils/useSandbox'
import Viewer from './viewer'
import Code from './code'
import useStore from '../utils/store'

const Result = () => {
  const { buffer, fileName, textOriginalFile, scene, code, createZip, generateScene, animations } = useStore()

  const [config, setConfig] = useControls(() => ({
    types: { value: false, hint: 'Add Typescript definitions' },
    shadows: { value: true, hint: 'Let meshes cast and receive shadows' },
    instanceall: { label: 'instance all', value: false, hint: 'Instance every geometry (for cheaper re-use)' },
    instance: { value: false, hint: ' Instance re-occuring geometry' },
    verbose: { value: false, hint: 'Verbose output w/ names and empty groups' },
    keepnames: { value: false, label: 'keep names', hint: 'Keep original names' },
    keepgroups: { value: false, label: 'keep groups', hint: 'Keep (empty) groups' },
    aggressive: { value: false, hint: 'Aggressively prune the graph (empty groups, transform overlap)' },
    meta: { value: false, hint: 'Include metadata (as userData)' },
    precision: { value: 2, min: 1, max: 8, step: 1, hint: 'Number of fractional digits (default: 2)' },
  }))

  const materialProps = useControls(
    'material', 
    {
      roughness: { value: 0.5, min: 0, max: 1 },
      ior: { value: 1.5, min: 1, max: 2.33 },
      reflectivity: { value: 0.5, min: 0, max: 1 },
      clearcoat: { value: 0, min: 0, max: 1 },
      clearcoatRoughness: { value: 0, min: 0, max: 1 },
      transmission: { value: 0, min: 0, max: 1 },
      metalness: { value: 0, min: 0, max: 1 },
      emissive: { value: "#F00" },
      emissiveIntensity: { value: 1, min: 0, max: 100, step: 0.1 },
      specular: { value: "#111" },
    }
  )

  const preview = useControls(
    'preview',
    {
      backgroundColor: { value: '#fff' },
      autoRotate: true,
      contactShadow: true,
      intensity: { value: 1, min: 0, max: 2, step: 0.1, label: 'light intensity' },
      preset: {
        value: 'rembrandt',
        options: ['rembrandt', 'portrait', 'upfront', 'soft'],
      },
      environment: {
        value: 'city',
        options: ['', 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby'],
      },
    },
    { collapsed: true }
  )

  const [loading, sandboxId, error, sandboxCode] = useSandbox({
    fileName,
    textOriginalFile,
    code,
    config: { ...config, ...preview },
  })

  useEffect(() => {
    setConfig({ verbose: animations })
  }, [animations])

  useEffect(() => {
    generateScene(config)
  }, [config])

  const download = useCallback(async () => {
    createZip({ sandboxCode })
  }, [sandboxCode, fileName, textOriginalFile, buffer])

  const exports = useMemo(() => {
    const temp = {}
    temp['copy to clipboard'] = button(() =>
      toast.promise(copy(code), {
        loading: 'Loading',
        success: () => `Successfully copied`,
        error: (err) => err.toString(),
      })
    )
    temp['download zip'] = button(() =>
      toast.promise(download(), {
        loading: 'Loading',
        success: () => `Ready for download`,
        error: (err) => err.toString(),
      })
    )

    if (!isGlb(fileName) && !error) {
      const name = 'codesandbox' + (loading ? ' loading' : '')
      temp[name] = button(() => {
        location.href = sandboxId
          ? `https://codesandbox.io/s/${sandboxId}?file=/src/Model.${config.types ? 'tsx' : 'js'}`
          : '#'
      })
    }

    temp['download image'] = button(() => {
      var image = document
        .getElementsByTagName('canvas')[0]
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream')

      saveAs(image, `${fileName.split('.')[0]}.png`)
    })

    return temp
  }, [fileName, loading, error, sandboxCode, sandboxId, config.types])

  useControls('exports', exports, { collapsed: true }, [exports])

  return (
    <div className="w-screen h-full">
      {!code && !scene ? (
        <p className="flex items-center justify-center w-screen h-screen text-4xl font-bold">Loading ...</p>
      ) : (
        <div className="grid h-full grid-cols-5">
          {code && <Code>{code}</Code>}
          <section className="w-full h-full col-span-2">
            {scene && <Viewer scene={scene} {...config} {...materialProps} {...preview} />}
          </section>
        </div>
      )}
      <Leva hideTitleBar collapsed />
    </div>
  )
}

export default Result
