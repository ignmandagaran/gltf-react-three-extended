import React, { Suspense, useLayoutEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import useStore from '../utils/store'
import { BackSide } from "three"

export default function Viewer({
  shadows,
  contactShadow,
  autoRotate,
  environment,
  preset,
  intensity,
  roughness,
  ior,
  reflectivity,
  clearcoat,
  clearcoatRoughness,
  transmission,
  metalness,
  side,
  emissiveIntensity,
  specular,
  backgroundColor,
}) {
  const scene = useStore((store) => store.scene)
  const ref = useRef()
  const primitiveRef = useRef()

  useLayoutEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = obj.receiveShadow = shadows
        obj.material.envMapIntensity = 0.8
        obj.material.roughness = roughness
        obj.material.ior = ior
        obj.material.reflectivity = reflectivity
        obj.material.clearcoat = clearcoat
        obj.material.clearcoatRoughness = clearcoatRoughness
        obj.material.transmission = transmission
        obj.material.metalness = metalness
        obj.material.emissiveIntensity = emissiveIntensity
        obj.material.specular = specular
        obj.material.side = side
      }
    })
  }, [
    scene,
    shadows,
    roughness,
    ior,
    reflectivity,
    clearcoat,
    clearcoatRoughness,
    transmission,
    metalness,
    emissiveIntensity,
    specular,
    side
  ])

  return (
    <Canvas gl={{ preserveDrawingBuffer: true }} shadows dpr={[1, 1.5]} camera={{ position: [0, 0, 150], fov: 50 }}>
      <ambientLight intensity={0.25} />
      {backgroundColor && <color attach="background" args={[backgroundColor]} />}
      <Suspense fallback={null}>
        <Stage
          controls={ref}
          preset={preset}
          intensity={intensity}
          contactShadow={contactShadow}
          shadows
          adjustCamera
          environment={environment}>
          <primitive ref={primitiveRef} object={scene} />
        </Stage>
      </Suspense>
      <OrbitControls ref={ref} autoRotate={autoRotate} />
    </Canvas>
  )
}
